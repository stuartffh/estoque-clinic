const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// =====================================
// INVENTORY MANAGEMENT ROUTES
// =====================================
// Stock control, movements, temperature monitoring

// Middleware to verify clinic access
const verifyClinicAccess = async (req, res, next) => {
  try {
    const clinicId = req.user.clinic_id || req.params.clinic_id || req.body.clinic_id;
    
    if (!clinicId) {
      return res.status(400).json({ 
        error: 'ID da clínica é obrigatório' 
      });
    }

    // Verify user has access to this clinic
    if (req.user.role !== 'super_admin') {
      if (req.user.clinic_id && req.user.clinic_id != clinicId) {
        return res.status(403).json({ 
          error: 'Acesso negado à clínica especificada' 
        });
      }

      // For clinic group admins, verify clinic belongs to their group
      if (!req.user.clinic_id) {
        const clinicCheck = await pool.query(
          'SELECT id FROM clinics WHERE id = $1 AND clinic_group_id = $2',
          [clinicId, req.user.clinic_group_id]
        );

        if (clinicCheck.rows.length === 0) {
          return res.status(403).json({ 
            error: 'Clínica não pertence ao seu grupo' 
          });
        }
      }
    }

    req.clinicId = parseInt(clinicId);
    next();
  } catch (error) {
    console.error('Error verifying clinic access:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Get inventory dashboard
router.get('/dashboard/:clinic_id', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const clinicId = req.clinicId;

    // Get overview statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT pb.id) as total_batches,
        COUNT(DISTINCT CASE WHEN pb.status = 'active' THEN pb.id END) as active_batches,
        COUNT(DISTINCT CASE WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND pb.status = 'active' THEN pb.id END) as expiring_soon,
        COUNT(DISTINCT CASE WHEN pb.current_stock <= pb.min_stock_alert AND pb.status = 'active' THEN pb.id END) as low_stock,
        COALESCE(SUM(CASE WHEN pb.status = 'active' THEN pb.current_stock ELSE 0 END), 0) as total_units,
        COUNT(DISTINCT ap.id) as distinct_products
      FROM product_batches pb
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      WHERE pb.clinic_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [clinicId]);

    // Get stock by category
    const categoryQuery = `
      SELECT 
        ap.category,
        COUNT(DISTINCT pb.id) as batches_count,
        COALESCE(SUM(pb.current_stock), 0) as total_units,
        COUNT(DISTINCT CASE WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND pb.status = 'active' THEN pb.id END) as expiring_soon
      FROM product_batches pb
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      WHERE pb.clinic_id = $1 AND pb.status = 'active'
      GROUP BY ap.category
      ORDER BY total_units DESC
    `;

    const categoryResult = await pool.query(categoryQuery, [clinicId]);

    // Get recent movements
    const movementsQuery = `
      SELECT 
        im.*,
        ap.name as product_name,
        ap.brand,
        ap.category,
        pb.batch_number,
        u.full_name as moved_by_name
      FROM inventory_movements im
      JOIN product_batches pb ON pb.id = im.batch_id
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      JOIN users u ON u.id = im.moved_by
      WHERE im.clinic_id = $1
      ORDER BY im.created_at DESC
      LIMIT 10
    `;

    const movementsResult = await pool.query(movementsQuery, [clinicId]);

    // Get critical alerts
    const alertsQuery = `
      SELECT *
      FROM system_alerts
      WHERE clinic_id = $1 
        AND is_resolved = false 
        AND severity IN ('high', 'critical')
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const alertsResult = await pool.query(alertsQuery, [clinicId]);

    res.json({
      statistics: statsResult.rows[0],
      stock_by_category: categoryResult.rows,
      recent_movements: movementsResult.rows,
      critical_alerts: alertsResult.rows
    });
  } catch (error) {
    console.error('Error fetching inventory dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all product batches for a clinic
router.get('/batches/:clinic_id', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const clinicId = req.clinicId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category;
    const status = req.query.status;
    const expiring = req.query.expiring; // 'soon' for expiring in 30 days

    let query = `
      SELECT 
        pb.*,
        ap.name as product_name,
        ap.brand,
        ap.category,
        ap.concentration,
        ap.storage_temp_min,
        ap.storage_temp_max,
        u.full_name as received_by_name,
        CASE 
          WHEN pb.expiry_date <= CURRENT_DATE THEN 'expired'
          WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
          WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
          ELSE 'normal'
        END as expiry_status
      FROM product_batches pb
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      LEFT JOIN users u ON u.id = pb.received_by
      WHERE pb.clinic_id = $1
    `;
    
    const queryParams = [clinicId];
    
    if (search) {
      query += ` AND (ap.name ILIKE $${queryParams.length + 1} OR ap.brand ILIKE $${queryParams.length + 1} OR pb.batch_number ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }

    if (category) {
      query += ` AND ap.category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    if (status) {
      query += ` AND pb.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    if (expiring === 'soon') {
      query += ` AND pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND pb.expiry_date > CURRENT_DATE`;
    }
    
    query += ` 
      ORDER BY 
        CASE 
          WHEN pb.expiry_date <= CURRENT_DATE THEN 1
          WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
          WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 3
          ELSE 4
        END,
        pb.expiry_date ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) FROM product_batches pb JOIN aesthetic_products ap ON ap.id = pb.product_id WHERE pb.clinic_id = $1';
    const countParams = [clinicId];
    
    if (search) {
      countQuery += ` AND (ap.name ILIKE $${countParams.length + 1} OR ap.brand ILIKE $${countParams.length + 1} OR pb.batch_number ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }

    if (category) {
      countQuery += ` AND ap.category = $${countParams.length + 1}`;
      countParams.push(category);
    }

    if (status) {
      countQuery += ` AND pb.status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    if (expiring === 'soon') {
      countQuery += ` AND pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND pb.expiry_date > CURRENT_DATE`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      batches: result.rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching inventory batches:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new product batch (stock entry)
router.post('/batches', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const {
      clinic_id,
      product_id,
      batch_number,
      manufacturing_date,
      expiry_date,
      supplier,
      supplier_invoice,
      purchase_price,
      initial_stock,
      min_stock_alert,
      storage_location,
      notes
    } = req.body;

    // Validate required fields
    if (!clinic_id || !product_id || !batch_number || !expiry_date || !initial_stock) {
      return res.status(400).json({ 
        error: 'Clínica, produto, lote, validade e quantidade inicial são obrigatórios' 
      });
    }

    // Check if batch already exists for this product at this clinic
    const existingBatch = await pool.query(
      'SELECT id FROM product_batches WHERE clinic_id = $1 AND product_id = $2 AND batch_number = $3',
      [clinic_id, product_id, batch_number]
    );

    if (existingBatch.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Lote já existe para este produto nesta clínica' 
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create batch
      const batchQuery = `
        INSERT INTO product_batches (
          clinic_id, product_id, batch_number, manufacturing_date, expiry_date,
          supplier, supplier_invoice, purchase_price, current_stock, min_stock_alert,
          storage_location, received_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const batchValues = [
        clinic_id, product_id, batch_number, manufacturing_date, expiry_date,
        supplier, supplier_invoice, purchase_price, initial_stock, min_stock_alert || 5,
        storage_location, req.user.id, notes
      ];

      const batchResult = await client.query(batchQuery, batchValues);
      const batch = batchResult.rows[0];

      // Create inventory movement record
      const movementQuery = `
        INSERT INTO inventory_movements (
          clinic_id, batch_id, movement_type, quantity, unit_cost, total_cost,
          reason, reference_document, moved_by, notes
        ) VALUES ($1, $2, 'inbound', $3, $4, $5, 'Entrada de estoque', $6, $7, $8)
        RETURNING *
      `;

      const movementValues = [
        clinic_id, batch.id, initial_stock, purchase_price,
        purchase_price ? (purchase_price * initial_stock) : null,
        supplier_invoice, req.user.id, `Lote ${batch_number} recebido`
      ];

      await client.query(movementQuery, movementValues);

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Lote criado com sucesso',
        batch: batch
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating batch:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Lote já existe' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// Create inventory movement (stock out, adjustment, etc.)
router.post('/movements', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const {
      clinic_id,
      batch_id,
      movement_type, // inbound, outbound, adjustment, transfer, return
      quantity,
      unit_cost,
      reason,
      reference_document,
      procedure_id,
      notes
    } = req.body;

    // Validate required fields
    if (!clinic_id || !batch_id || !movement_type || !quantity) {
      return res.status(400).json({ 
        error: 'Clínica, lote, tipo de movimentação e quantidade são obrigatórios' 
      });
    }

    // Validate movement type
    const validTypes = ['inbound', 'outbound', 'adjustment', 'transfer', 'return'];
    if (!validTypes.includes(movement_type)) {
      return res.status(400).json({ 
        error: 'Tipo de movimentação inválido' 
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current batch info
      const batchQuery = 'SELECT * FROM product_batches WHERE id = $1 AND clinic_id = $2';
      const batchResult = await client.query(batchQuery, [batch_id, clinic_id]);

      if (batchResult.rows.length === 0) {
        throw new Error('Lote não encontrado');
      }

      const batch = batchResult.rows[0];
      let newStock = batch.current_stock;

      // Calculate new stock based on movement type
      if (movement_type === 'outbound') {
        if (quantity > batch.current_stock) {
          throw new Error('Quantidade insuficiente em estoque');
        }
        newStock = batch.current_stock - quantity;
      } else if (movement_type === 'inbound' || movement_type === 'return') {
        newStock = batch.current_stock + quantity;
      } else if (movement_type === 'adjustment') {
        // For adjustments, quantity is the new total (not difference)
        newStock = quantity;
      }

      // Update batch stock
      await client.query(
        'UPDATE product_batches SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, batch_id]
      );

      // If stock reaches zero, mark as depleted
      if (newStock === 0 && movement_type === 'outbound') {
        await client.query(
          'UPDATE product_batches SET status = \'depleted\' WHERE id = $1',
          [batch_id]
        );
      }

      // Create movement record
      const movementQuery = `
        INSERT INTO inventory_movements (
          clinic_id, batch_id, movement_type, quantity, unit_cost, total_cost,
          reason, reference_document, procedure_id, moved_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const totalCost = unit_cost ? (unit_cost * Math.abs(quantity)) : null;
      const movementValues = [
        clinic_id, batch_id, movement_type, 
        movement_type === 'outbound' ? -Math.abs(quantity) : Math.abs(quantity),
        unit_cost, totalCost, reason, reference_document, procedure_id,
        req.user.id, notes
      ];

      const movementResult = await client.query(movementQuery, movementValues);

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Movimentação registrada com sucesso',
        movement: movementResult.rows[0],
        new_stock: newStock
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating movement:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Get inventory movements history
router.get('/movements/:clinic_id', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const clinicId = req.clinicId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const movementType = req.query.movement_type;

    let query = `
      SELECT 
        im.*,
        ap.name as product_name,
        ap.brand,
        ap.category,
        pb.batch_number,
        u.full_name as moved_by_name,
        au.full_name as approved_by_name
      FROM inventory_movements im
      JOIN product_batches pb ON pb.id = im.batch_id
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      JOIN users u ON u.id = im.moved_by
      LEFT JOIN users au ON au.id = im.approved_by
      WHERE im.clinic_id = $1
    `;
    
    const queryParams = [clinicId];
    
    if (startDate) {
      query += ` AND im.created_at >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      query += ` AND im.created_at <= $${queryParams.length + 1}`;
      queryParams.push(endDate + ' 23:59:59');
    }

    if (movementType) {
      query += ` AND im.movement_type = $${queryParams.length + 1}`;
      queryParams.push(movementType);
    }
    
    query += ` 
      ORDER BY im.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) FROM inventory_movements im WHERE im.clinic_id = $1';
    const countParams = [clinicId];
    
    if (startDate) {
      countQuery += ` AND im.created_at >= $${countParams.length + 1}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ` AND im.created_at <= $${countParams.length + 1}`;
      countParams.push(endDate + ' 23:59:59');
    }

    if (movementType) {
      countQuery += ` AND im.movement_type = $${countParams.length + 1}`;
      countParams.push(movementType);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      movements: result.rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Temperature monitoring endpoints
router.post('/temperature-logs', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const {
      clinic_id,
      equipment_id,
      equipment_name,
      temperature,
      humidity,
      recorded_at
    } = req.body;

    if (!clinic_id || !equipment_id || temperature === undefined) {
      return res.status(400).json({ 
        error: 'Clínica, equipamento e temperatura são obrigatórios' 
      });
    }

    // Check if temperature is outside safe range (2-8°C)
    const isAlert = temperature < 2.0 || temperature > 8.0;

    const query = `
      INSERT INTO temperature_logs (
        clinic_id, equipment_id, equipment_name, temperature, 
        humidity, recorded_at, is_alert
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      clinic_id, equipment_id, equipment_name, temperature,
      humidity, recorded_at || new Date(), isAlert
    ];

    const result = await pool.query(query, values);

    // Create alert if temperature is out of range
    if (isAlert) {
      const alertQuery = `
        INSERT INTO system_alerts (
          clinic_id, alert_type, severity, title, message, entity_type, entity_id
        ) VALUES ($1, 'temperature', $2, $3, $4, 'equipment', $5)
      `;

      const severity = temperature < 0 || temperature > 10 ? 'critical' : 'high';
      const title = `Alerta de Temperatura - ${equipment_name}`;
      const message = `Temperatura registrada: ${temperature}°C. Faixa segura: 2-8°C`;

      await pool.query(alertQuery, [clinic_id, severity, title, message, equipment_id]);
    }

    res.status(201).json({
      message: 'Log de temperatura registrado',
      log: result.rows[0],
      alert_created: isAlert
    });
  } catch (error) {
    console.error('Error creating temperature log:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get temperature logs
router.get('/temperature-logs/:clinic_id', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const clinicId = req.clinicId;
    const equipmentId = req.query.equipment_id;
    const hours = parseInt(req.query.hours) || 24;

    let query = `
      SELECT *
      FROM temperature_logs
      WHERE clinic_id = $1 
        AND recorded_at >= NOW() - INTERVAL '${hours} hours'
    `;
    
    const queryParams = [clinicId];
    
    if (equipmentId) {
      query += ` AND equipment_id = $${queryParams.length + 1}`;
      queryParams.push(equipmentId);
    }
    
    query += ` ORDER BY recorded_at DESC`;

    const result = await pool.query(query, queryParams);

    res.json({ temperature_logs: result.rows });
  } catch (error) {
    console.error('Error fetching temperature logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get inventory alerts
router.get('/alerts/:clinic_id', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const clinicId = req.clinicId;
    const isResolved = req.query.is_resolved;
    const alertType = req.query.alert_type;

    let query = `
      SELECT 
        sa.*,
        u.full_name as assigned_to_name,
        ru.full_name as resolved_by_name
      FROM system_alerts sa
      LEFT JOIN users u ON u.id = sa.assigned_to
      LEFT JOIN users ru ON ru.id = sa.resolved_by
      WHERE sa.clinic_id = $1
    `;
    
    const queryParams = [clinicId];
    
    if (isResolved !== undefined) {
      query += ` AND sa.is_resolved = $${queryParams.length + 1}`;
      queryParams.push(isResolved === 'true');
    }

    if (alertType) {
      query += ` AND sa.alert_type = $${queryParams.length + 1}`;
      queryParams.push(alertType);
    }
    
    query += ` ORDER BY sa.created_at DESC LIMIT 50`;

    const result = await pool.query(query, queryParams);

    res.json({ alerts: result.rows });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Inventory reports
router.get('/reports/:clinic_id', authenticateToken, verifyClinicAccess, async (req, res) => {
  try {
    const clinicId = req.clinicId;
    const reportType = req.query.type; // 'stock', 'movements', 'expiry', 'value'
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    let result = {};

    switch (reportType) {
      case 'stock':
        const stockQuery = `
          SELECT 
            ap.name as product_name,
            ap.brand,
            ap.category,
            pb.batch_number,
            pb.expiry_date,
            pb.current_stock,
            pb.purchase_price,
            (pb.current_stock * COALESCE(pb.purchase_price, 0)) as total_value
          FROM product_batches pb
          JOIN aesthetic_products ap ON ap.id = pb.product_id
          WHERE pb.clinic_id = $1 AND pb.status = 'active'
          ORDER BY ap.category, ap.name, pb.expiry_date
        `;
        result = await pool.query(stockQuery, [clinicId]);
        break;

      case 'movements':
        let movementsQuery = `
          SELECT 
            im.*,
            ap.name as product_name,
            ap.brand,
            ap.category,
            pb.batch_number,
            u.full_name as moved_by_name
          FROM inventory_movements im
          JOIN product_batches pb ON pb.id = im.batch_id
          JOIN aesthetic_products ap ON ap.id = pb.product_id
          JOIN users u ON u.id = im.moved_by
          WHERE im.clinic_id = $1
        `;
        
        const movementsParams = [clinicId];
        
        if (startDate) {
          movementsQuery += ` AND im.created_at >= $${movementsParams.length + 1}`;
          movementsParams.push(startDate);
        }

        if (endDate) {
          movementsQuery += ` AND im.created_at <= $${movementsParams.length + 1}`;
          movementsParams.push(endDate + ' 23:59:59');
        }

        movementsQuery += ` ORDER BY im.created_at DESC`;
        result = await pool.query(movementsQuery, movementsParams);
        break;

      default:
        return res.status(400).json({ error: 'Tipo de relatório inválido' });
    }

    res.json({ 
      report_type: reportType,
      data: result.rows,
      generated_at: new Date(),
      clinic_id: clinicId
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;