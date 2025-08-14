const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// =====================================
// CLINICS MANAGEMENT ROUTES
// =====================================
// Individual clinic management within groups

// Middleware to verify user has access to clinic group
const verifyClinicGroupAccess = async (req, res, next) => {
  try {
    const clinicGroupId = req.user.clinic_group_id;
    
    if (!clinicGroupId) {
      return res.status(403).json({ 
        error: 'Usuário não possui acesso a nenhum grupo de clínicas' 
      });
    }

    req.clinicGroupId = clinicGroupId;
    next();
  } catch (error) {
    console.error('Error verifying clinic group access:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware to verify admin or manager role
const requireAdminOrManager = (req, res, next) => {
  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas administradores e gerentes podem gerenciar clínicas.' 
    });
  }
  next();
};

// Get all clinics in user's group
router.get('/', authenticateToken, verifyClinicGroupAccess, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.is_active;

    let query = `
      SELECT 
        c.*,
        cg.name as group_name,
        COUNT(DISTINCT u.id) as users_count,
        COUNT(DISTINCT pb.id) as batches_count,
        COUNT(DISTINCT p.id) as professionals_count
      FROM clinics c
      JOIN clinic_groups cg ON cg.id = c.clinic_group_id
      LEFT JOIN users u ON u.clinic_id = c.id AND u.is_active = true
      LEFT JOIN product_batches pb ON pb.clinic_id = c.id AND pb.status = 'active'
      LEFT JOIN professionals p ON p.clinic_id = c.id AND p.is_active = true
      WHERE c.clinic_group_id = $1
    `;
    
    const queryParams = [req.clinicGroupId];
    
    if (search) {
      query += ` AND (c.name ILIKE $${queryParams.length + 1} OR c.cnpj ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }

    if (isActive !== undefined) {
      query += ` AND c.is_active = $${queryParams.length + 1}`;
      queryParams.push(isActive === 'true');
    }
    
    query += ` 
      GROUP BY c.id, cg.name
      ORDER BY c.created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) FROM clinics c WHERE c.clinic_group_id = $1';
    const countParams = [req.clinicGroupId];
    
    if (search) {
      countQuery += ' AND (c.name ILIKE $2 OR c.cnpj ILIKE $2)';
      countParams.push(`%${search}%`);
    }

    if (isActive !== undefined) {
      countQuery += ` AND c.is_active = $${countParams.length + 1}`;
      countParams.push(isActive === 'true');
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      clinics: result.rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get specific clinic by ID
router.get('/:id', authenticateToken, verifyClinicGroupAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.*,
        cg.name as group_name,
        cg.code as group_code,
        COUNT(DISTINCT u.id) as users_count,
        COUNT(DISTINCT pb.id) as active_batches_count,
        COUNT(DISTINCT p.id) as professionals_count,
        COUNT(DISTINCT pat.id) as patients_count,
        COUNT(DISTINCT proc.id) as procedures_count,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'professional_type', p.professional_type,
            'specialty', p.specialty,
            'is_active', p.is_active
          )
        ) FILTER (WHERE p.id IS NOT NULL) as professionals
      FROM clinics c
      JOIN clinic_groups cg ON cg.id = c.clinic_group_id
      LEFT JOIN users u ON u.clinic_id = c.id AND u.is_active = true
      LEFT JOIN product_batches pb ON pb.clinic_id = c.id AND pb.status = 'active'
      LEFT JOIN professionals p ON p.clinic_id = c.id
      LEFT JOIN patients pat ON pat.clinic_id = c.id AND pat.is_active = true
      LEFT JOIN procedures proc ON proc.clinic_id = c.id
      WHERE c.id = $1 AND c.clinic_group_id = $2
      GROUP BY c.id, cg.name, cg.code
    `;

    const result = await pool.query(query, [id, req.clinicGroupId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching clinic:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new clinic
router.post('/', authenticateToken, verifyClinicGroupAccess, requireAdminOrManager, async (req, res) => {
  try {
    const {
      name,
      cnpj,
      cro_number,
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
      address_zipcode,
      phone,
      email,
      website,
      logo_url,
      timezone,
      settings
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Nome da clínica é obrigatório' 
      });
    }

    // Check clinic limit for group
    const groupCheck = await pool.query(
      'SELECT max_clinics FROM clinic_groups WHERE id = $1',
      [req.clinicGroupId]
    );

    const currentCount = await pool.query(
      'SELECT COUNT(*) as count FROM clinics WHERE clinic_group_id = $1 AND is_active = true',
      [req.clinicGroupId]
    );

    if (parseInt(currentCount.rows[0].count) >= groupCheck.rows[0].max_clinics) {
      return res.status(409).json({ 
        error: 'Limite de clínicas atingido para este grupo' 
      });
    }

    const query = `
      INSERT INTO clinics (
        clinic_group_id, name, cnpj, cro_number, address_street, address_number,
        address_complement, address_neighborhood, address_city, address_state,
        address_zipcode, phone, email, website, logo_url, timezone, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      req.clinicGroupId,
      name,
      cnpj,
      cro_number,
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
      address_zipcode,
      phone,
      email,
      website,
      logo_url,
      timezone || 'America/Sao_Paulo',
      JSON.stringify(settings || {})
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Clínica criada com sucesso',
      clinic: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating clinic:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'CNPJ já cadastrado' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// Update clinic
router.put('/:id', authenticateToken, verifyClinicGroupAccess, requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      cnpj,
      cro_number,
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
      address_zipcode,
      phone,
      email,
      website,
      logo_url,
      timezone,
      settings,
      is_active
    } = req.body;

    const query = `
      UPDATE clinics 
      SET 
        name = COALESCE($3, name),
        cnpj = COALESCE($4, cnpj),
        cro_number = COALESCE($5, cro_number),
        address_street = COALESCE($6, address_street),
        address_number = COALESCE($7, address_number),
        address_complement = COALESCE($8, address_complement),
        address_neighborhood = COALESCE($9, address_neighborhood),
        address_city = COALESCE($10, address_city),
        address_state = COALESCE($11, address_state),
        address_zipcode = COALESCE($12, address_zipcode),
        phone = COALESCE($13, phone),
        email = COALESCE($14, email),
        website = COALESCE($15, website),
        logo_url = COALESCE($16, logo_url),
        timezone = COALESCE($17, timezone),
        settings = COALESCE($18, settings),
        is_active = COALESCE($19, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND clinic_group_id = $2
      RETURNING *
    `;

    const values = [
      id,
      req.clinicGroupId,
      name,
      cnpj,
      cro_number,
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
      address_zipcode,
      phone,
      email,
      website,
      logo_url,
      timezone,
      settings ? JSON.stringify(settings) : null,
      is_active
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    res.json({
      message: 'Clínica atualizada com sucesso',
      clinic: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating clinic:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'CNPJ já cadastrado' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// Delete clinic (soft delete)
router.delete('/:id', authenticateToken, verifyClinicGroupAccess, requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if clinic has active users
    const usersCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE clinic_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(usersCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'Não é possível excluir clínica com usuários ativos. Desative os usuários primeiro.' 
      });
    }

    const result = await pool.query(
      `UPDATE clinics 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND clinic_group_id = $2 
       RETURNING *`,
      [id, req.clinicGroupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    res.json({ message: 'Clínica desativada com sucesso' });
  } catch (error) {
    console.error('Error deleting clinic:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get clinic statistics
router.get('/:id/stats', authenticateToken, verifyClinicGroupAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE clinic_id = $1 AND is_active = true) as active_users,
        (SELECT COUNT(*) FROM professionals WHERE clinic_id = $1 AND is_active = true) as active_professionals,
        (SELECT COUNT(*) FROM patients WHERE clinic_id = $1 AND is_active = true) as active_patients,
        (SELECT COUNT(*) FROM product_batches WHERE clinic_id = $1 AND status = 'active') as active_batches,
        (SELECT COUNT(*) FROM product_batches WHERE clinic_id = $1 AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
        (SELECT COUNT(*) FROM procedures WHERE clinic_id = $1 AND procedure_date >= CURRENT_DATE - INTERVAL '30 days') as procedures_last_30_days,
        (SELECT COALESCE(SUM(current_stock), 0) FROM product_batches WHERE clinic_id = $1 AND status = 'active') as total_stock_units,
        (SELECT COUNT(*) FROM system_alerts WHERE clinic_id = $1 AND is_resolved = false) as unresolved_alerts
    `;

    // Verify clinic belongs to user's group
    const clinicCheck = await pool.query(
      'SELECT id FROM clinics WHERE id = $1 AND clinic_group_id = $2',
      [id, req.clinicGroupId]
    );

    if (clinicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    const result = await pool.query(query, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching clinic stats:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get clinic dashboard data
router.get('/:id/dashboard', authenticateToken, verifyClinicGroupAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify clinic belongs to user's group
    const clinicCheck = await pool.query(
      'SELECT id, name FROM clinics WHERE id = $1 AND clinic_group_id = $2',
      [id, req.clinicGroupId]
    );

    if (clinicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    // Get recent inventory movements
    const recentMovements = await pool.query(`
      SELECT 
        im.*,
        ap.name as product_name,
        ap.brand,
        pb.batch_number,
        u.full_name as moved_by_name
      FROM inventory_movements im
      JOIN product_batches pb ON pb.id = im.batch_id
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      JOIN users u ON u.id = im.moved_by
      WHERE im.clinic_id = $1
      ORDER BY im.created_at DESC
      LIMIT 10
    `, [id]);

    // Get products near expiry
    const nearExpiry = await pool.query(`
      SELECT 
        pb.*,
        ap.name as product_name,
        ap.brand,
        ap.category
      FROM product_batches pb
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      WHERE pb.clinic_id = $1 
        AND pb.status = 'active'
        AND pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY pb.expiry_date ASC
      LIMIT 10
    `, [id]);

    // Get low stock alerts
    const lowStock = await pool.query(`
      SELECT 
        pb.*,
        ap.name as product_name,
        ap.brand,
        ap.category
      FROM product_batches pb
      JOIN aesthetic_products ap ON ap.id = pb.product_id
      WHERE pb.clinic_id = $1 
        AND pb.status = 'active'
        AND pb.current_stock <= pb.min_stock_alert
      ORDER BY pb.current_stock ASC
      LIMIT 10
    `, [id]);

    // Get recent temperature alerts
    const temperatureAlerts = await pool.query(`
      SELECT *
      FROM temperature_logs
      WHERE clinic_id = $1 
        AND is_alert = true
        AND recorded_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY recorded_at DESC
      LIMIT 5
    `, [id]);

    res.json({
      clinic: clinicCheck.rows[0],
      recent_movements: recentMovements.rows,
      near_expiry: nearExpiry.rows,
      low_stock: lowStock.rows,
      temperature_alerts: temperatureAlerts.rows
    });
  } catch (error) {
    console.error('Error fetching clinic dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Validate CNPJ availability
router.get('/validate/cnpj/:cnpj', authenticateToken, verifyClinicGroupAccess, async (req, res) => {
  try {
    const { cnpj } = req.params;
    const clinicId = req.query.clinic_id; // For updates

    let query = 'SELECT id FROM clinics WHERE cnpj = $1';
    let params = [cnpj];

    if (clinicId) {
      query += ' AND id != $2';
      params.push(clinicId);
    }

    const result = await pool.query(query, params);

    res.json({ 
      available: result.rows.length === 0,
      message: result.rows.length === 0 ? 'CNPJ disponível' : 'CNPJ já está em uso'
    });
  } catch (error) {
    console.error('Error validating CNPJ:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;