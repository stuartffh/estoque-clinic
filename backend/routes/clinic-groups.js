const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// =====================================
// CLINIC GROUPS MANAGEMENT ROUTES
// =====================================
// Multi-tenancy management for clinic groups

// Middleware to verify super admin role
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas super administradores podem acessar esta funcionalidade.' 
    });
  }
  next();
};

// Get all clinic groups (super admin only)
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT 
        cg.*,
        COUNT(c.id) as clinics_count,
        COUNT(u.id) as users_count
      FROM clinic_groups cg
      LEFT JOIN clinics c ON c.clinic_group_id = cg.id AND c.is_active = true
      LEFT JOIN users u ON u.clinic_group_id = cg.id AND u.is_active = true
    `;
    
    const queryParams = [];
    
    if (search) {
      query += ` WHERE (cg.name ILIKE $1 OR cg.code ILIKE $1)`;
      queryParams.push(`%${search}%`);
    }
    
    query += ` 
      GROUP BY cg.id
      ORDER BY cg.created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) FROM clinic_groups cg';
    const countParams = [];
    
    if (search) {
      countQuery += ' WHERE (cg.name ILIKE $1 OR cg.code ILIKE $1)';
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      clinic_groups: result.rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching clinic groups:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get specific clinic group by ID
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        cg.*,
        COUNT(DISTINCT c.id) as clinics_count,
        COUNT(DISTINCT u.id) as users_count,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'city', c.address_city,
            'state', c.address_state,
            'is_active', c.is_active
          )
        ) FILTER (WHERE c.id IS NOT NULL) as clinics
      FROM clinic_groups cg
      LEFT JOIN clinics c ON c.clinic_group_id = cg.id
      LEFT JOIN users u ON u.clinic_group_id = cg.id AND u.is_active = true
      WHERE cg.id = $1
      GROUP BY cg.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo de clínicas não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching clinic group:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new clinic group
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      admin_email,
      admin_phone,
      subscription_plan,
      subscription_expires_at,
      max_clinics,
      max_users,
      settings
    } = req.body;

    // Validate required fields
    if (!name || !code || !admin_email) {
      return res.status(400).json({ 
        error: 'Nome, código e email do administrador são obrigatórios' 
      });
    }

    // Check if code already exists
    const existingGroup = await pool.query(
      'SELECT id FROM clinic_groups WHERE code = $1',
      [code]
    );

    if (existingGroup.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Código do grupo já existe. Escolha outro código.' 
      });
    }

    const query = `
      INSERT INTO clinic_groups (
        name, code, description, admin_email, admin_phone, 
        subscription_plan, subscription_expires_at, max_clinics, 
        max_users, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      name,
      code,
      description,
      admin_email,
      admin_phone,
      subscription_plan || 'basic',
      subscription_expires_at,
      max_clinics || 10,
      max_users || 100,
      JSON.stringify(settings || {})
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Grupo de clínicas criado com sucesso',
      clinic_group: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating clinic group:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Código do grupo já existe' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// Update clinic group
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      admin_email,
      admin_phone,
      subscription_plan,
      subscription_expires_at,
      max_clinics,
      max_users,
      settings,
      is_active
    } = req.body;

    const query = `
      UPDATE clinic_groups 
      SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        admin_email = COALESCE($4, admin_email),
        admin_phone = COALESCE($5, admin_phone),
        subscription_plan = COALESCE($6, subscription_plan),
        subscription_expires_at = COALESCE($7, subscription_expires_at),
        max_clinics = COALESCE($8, max_clinics),
        max_users = COALESCE($9, max_users),
        settings = COALESCE($10, settings),
        is_active = COALESCE($11, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      name,
      description,
      admin_email,
      admin_phone,
      subscription_plan,
      subscription_expires_at,
      max_clinics,
      max_users,
      settings ? JSON.stringify(settings) : null,
      is_active
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo de clínicas não encontrado' });
    }

    res.json({
      message: 'Grupo de clínicas atualizado com sucesso',
      clinic_group: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating clinic group:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete clinic group (soft delete)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if group has active clinics
    const clinicsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM clinics WHERE clinic_group_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(clinicsCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'Não é possível excluir grupo com clínicas ativas. Desative as clínicas primeiro.' 
      });
    }

    const result = await pool.query(
      'UPDATE clinic_groups SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo de clínicas não encontrado' });
    }

    res.json({ message: 'Grupo de clínicas desativado com sucesso' });
  } catch (error) {
    console.error('Error deleting clinic group:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get clinic group statistics
router.get('/:id/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM clinics WHERE clinic_group_id = $1 AND is_active = true) as active_clinics,
        (SELECT COUNT(*) FROM clinics WHERE clinic_group_id = $1) as total_clinics,
        (SELECT COUNT(*) FROM users WHERE clinic_group_id = $1 AND is_active = true) as active_users,
        (SELECT COUNT(*) FROM users WHERE clinic_group_id = $1) as total_users,
        (SELECT COUNT(*) FROM product_batches pb 
         JOIN clinics c ON c.id = pb.clinic_id 
         WHERE c.clinic_group_id = $1) as total_batches,
        (SELECT COUNT(*) FROM inventory_movements im
         JOIN clinics c ON c.id = im.clinic_id 
         WHERE c.clinic_group_id = $1 
         AND im.created_at >= CURRENT_DATE - INTERVAL '30 days') as movements_last_30_days
    `;

    const result = await pool.query(query, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching clinic group stats:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Validate clinic group code availability
router.get('/validate/code/:code', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      'SELECT id FROM clinic_groups WHERE code = $1',
      [code]
    );

    res.json({ 
      available: result.rows.length === 0,
      message: result.rows.length === 0 ? 'Código disponível' : 'Código já está em uso'
    });
  } catch (error) {
    console.error('Error validating code:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;