const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// =====================================
// AESTHETIC PRODUCTS CATALOG ROUTES
// =====================================
// Global product catalog for Botox, fillers, biostimulators

// Middleware to verify user access
const verifyAccess = async (req, res, next) => {
  try {
    if (!req.user.clinic_group_id) {
      return res.status(403).json({ 
        error: 'Usuário não possui acesso a nenhum grupo de clínicas' 
      });
    }
    next();
  } catch (error) {
    console.error('Error verifying access:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware to verify admin or manager role for modifications
const requireAdminOrManager = (req, res, next) => {
  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas administradores e gerentes podem gerenciar produtos.' 
    });
  }
  next();
};

// Get all aesthetic products with filtering
router.get('/', authenticateToken, verifyAccess, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category;
    const brand = req.query.brand;
    const isActive = req.query.is_active;

    let query = `
      SELECT 
        ap.*,
        COUNT(DISTINCT pb.id) as batches_count,
        COALESCE(SUM(pb.current_stock), 0) as total_stock
      FROM aesthetic_products ap
      LEFT JOIN product_batches pb ON pb.product_id = ap.id AND pb.status = 'active'
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (search) {
      query += ` AND (ap.name ILIKE $${queryParams.length + 1} OR ap.brand ILIKE $${queryParams.length + 1} OR ap.manufacturer ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }

    if (category) {
      query += ` AND ap.category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    if (brand) {
      query += ` AND ap.brand ILIKE $${queryParams.length + 1}`;
      queryParams.push(`%${brand}%`);
    }

    if (isActive !== undefined) {
      query += ` AND ap.is_active = $${queryParams.length + 1}`;
      queryParams.push(isActive === 'true');
    }
    
    query += ` 
      GROUP BY ap.id
      ORDER BY ap.category, ap.name
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) FROM aesthetic_products ap WHERE 1=1';
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (ap.name ILIKE $${countParams.length + 1} OR ap.brand ILIKE $${countParams.length + 1} OR ap.manufacturer ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }

    if (category) {
      countQuery += ` AND ap.category = $${countParams.length + 1}`;
      countParams.push(category);
    }

    if (brand) {
      countQuery += ` AND ap.brand ILIKE $${countParams.length + 1}`;
      countParams.push(`%${brand}%`);
    }

    if (isActive !== undefined) {
      countQuery += ` AND ap.is_active = $${countParams.length + 1}`;
      countParams.push(isActive === 'true');
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      products: result.rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching aesthetic products:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get specific product by ID
router.get('/:id', authenticateToken, verifyAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ap.*,
        COUNT(DISTINCT pb.id) as total_batches,
        COUNT(DISTINCT CASE WHEN pb.status = 'active' THEN pb.id END) as active_batches,
        COALESCE(SUM(CASE WHEN pb.status = 'active' THEN pb.current_stock ELSE 0 END), 0) as total_stock,
        json_agg(
          DISTINCT jsonb_build_object(
            'clinic_id', c.id,
            'clinic_name', c.name,
            'batch_count', batch_counts.count,
            'total_stock', batch_counts.stock
          )
        ) FILTER (WHERE c.id IS NOT NULL) as clinic_distribution
      FROM aesthetic_products ap
      LEFT JOIN product_batches pb ON pb.product_id = ap.id
      LEFT JOIN clinics c ON c.id = pb.clinic_id
      LEFT JOIN (
        SELECT 
          pb.clinic_id,
          COUNT(*) as count,
          SUM(pb.current_stock) as stock
        FROM product_batches pb
        WHERE pb.product_id = $1 AND pb.status = 'active'
        GROUP BY pb.clinic_id
      ) batch_counts ON batch_counts.clinic_id = c.id
      WHERE ap.id = $1
      GROUP BY ap.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching aesthetic product:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new aesthetic product
router.post('/', authenticateToken, verifyAccess, requireAdminOrManager, async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      subcategory,
      concentration,
      volume_ml,
      units_per_package,
      anvisa_registry,
      manufacturer,
      active_principle,
      storage_temp_min,
      storage_temp_max,
      shelf_life_months,
      description,
      usage_instructions,
      contraindications,
      image_url,
      barcode,
      is_controlled,
      requires_prescription
    } = req.body;

    // Validate required fields
    if (!name || !brand || !category) {
      return res.status(400).json({ 
        error: 'Nome, marca e categoria são obrigatórios' 
      });
    }

    // Validate category
    const validCategories = ['botox', 'filler', 'biostimulator', 'equipment', 'consumable'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: 'Categoria inválida. Valores aceitos: ' + validCategories.join(', ') 
      });
    }

    const query = `
      INSERT INTO aesthetic_products (
        name, brand, category, subcategory, concentration, volume_ml,
        units_per_package, anvisa_registry, manufacturer, active_principle,
        storage_temp_min, storage_temp_max, shelf_life_months, description,
        usage_instructions, contraindications, image_url, barcode,
        is_controlled, requires_prescription
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      name, brand, category, subcategory, concentration, volume_ml,
      units_per_package || 1, anvisa_registry, manufacturer, active_principle,
      storage_temp_min || 2.0, storage_temp_max || 8.0, shelf_life_months || 24,
      description, usage_instructions, contraindications, image_url, barcode,
      is_controlled || false, requires_prescription !== false
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Produto criado com sucesso',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating aesthetic product:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update aesthetic product
router.put('/:id', authenticateToken, verifyAccess, requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      brand,
      category,
      subcategory,
      concentration,
      volume_ml,
      units_per_package,
      anvisa_registry,
      manufacturer,
      active_principle,
      storage_temp_min,
      storage_temp_max,
      shelf_life_months,
      description,
      usage_instructions,
      contraindications,
      image_url,
      barcode,
      is_controlled,
      requires_prescription,
      is_active
    } = req.body;

    // Validate category if provided
    if (category) {
      const validCategories = ['botox', 'filler', 'biostimulator', 'equipment', 'consumable'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          error: 'Categoria inválida. Valores aceitos: ' + validCategories.join(', ') 
        });
      }
    }

    const query = `
      UPDATE aesthetic_products 
      SET 
        name = COALESCE($2, name),
        brand = COALESCE($3, brand),
        category = COALESCE($4, category),
        subcategory = COALESCE($5, subcategory),
        concentration = COALESCE($6, concentration),
        volume_ml = COALESCE($7, volume_ml),
        units_per_package = COALESCE($8, units_per_package),
        anvisa_registry = COALESCE($9, anvisa_registry),
        manufacturer = COALESCE($10, manufacturer),
        active_principle = COALESCE($11, active_principle),
        storage_temp_min = COALESCE($12, storage_temp_min),
        storage_temp_max = COALESCE($13, storage_temp_max),
        shelf_life_months = COALESCE($14, shelf_life_months),
        description = COALESCE($15, description),
        usage_instructions = COALESCE($16, usage_instructions),
        contraindications = COALESCE($17, contraindications),
        image_url = COALESCE($18, image_url),
        barcode = COALESCE($19, barcode),
        is_controlled = COALESCE($20, is_controlled),
        requires_prescription = COALESCE($21, requires_prescription),
        is_active = COALESCE($22, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id, name, brand, category, subcategory, concentration, volume_ml,
      units_per_package, anvisa_registry, manufacturer, active_principle,
      storage_temp_min, storage_temp_max, shelf_life_months, description,
      usage_instructions, contraindications, image_url, barcode,
      is_controlled, requires_prescription, is_active
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({
      message: 'Produto atualizado com sucesso',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating aesthetic product:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete product (soft delete)
router.delete('/:id', authenticateToken, verifyAccess, requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product has active batches
    const batchesCheck = await pool.query(
      'SELECT COUNT(*) as count FROM product_batches WHERE product_id = $1 AND status = \'active\'',
      [id]
    );

    if (parseInt(batchesCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'Não é possível excluir produto com lotes ativos em estoque.' 
      });
    }

    const result = await pool.query(
      'UPDATE aesthetic_products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ message: 'Produto desativado com sucesso' });
  } catch (error) {
    console.error('Error deleting aesthetic product:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get product categories
router.get('/meta/categories', authenticateToken, verifyAccess, async (req, res) => {
  try {
    const categories = [
      {
        value: 'botox',
        label: 'Toxina Botulínica',
        subcategories: ['toxin_a', 'toxin_b'],
        description: 'Produtos à base de toxina botulínica para tratamentos estéticos'
      },
      {
        value: 'filler',
        label: 'Preenchedores',
        subcategories: ['hyaluronic_acid', 'calcium_hydroxylapatite', 'poly_l_lactic_acid'],
        description: 'Preenchedores dérmicos para restauração de volume'
      },
      {
        value: 'biostimulator',
        label: 'Bioestimuladores',
        subcategories: ['plla', 'pcl', 'caha', 'pdo'],
        description: 'Estimuladores de colágeno e elastina'
      },
      {
        value: 'equipment',
        label: 'Equipamentos',
        subcategories: ['laser', 'radiofrequency', 'ultrasound', 'led'],
        description: 'Equipamentos para procedimentos estéticos'
      },
      {
        value: 'consumable',
        label: 'Consumíveis',
        subcategories: ['needles', 'syringes', 'cannulas', 'antiseptics'],
        description: 'Materiais de consumo para procedimentos'
      }
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get product brands
router.get('/meta/brands', authenticateToken, verifyAccess, async (req, res) => {
  try {
    const query = `
      SELECT 
        brand,
        COUNT(*) as products_count,
        json_agg(DISTINCT category) as categories
      FROM aesthetic_products 
      WHERE is_active = true
      GROUP BY brand
      ORDER BY brand
    `;

    const result = await pool.query(query);

    res.json({ brands: result.rows });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get product statistics
router.get('/meta/stats', authenticateToken, verifyAccess, async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
        COUNT(CASE WHEN category = 'botox' THEN 1 END) as botox_products,
        COUNT(CASE WHEN category = 'filler' THEN 1 END) as filler_products,
        COUNT(CASE WHEN category = 'biostimulator' THEN 1 END) as biostimulator_products,
        COUNT(CASE WHEN is_controlled = true THEN 1 END) as controlled_products,
        COUNT(DISTINCT brand) as total_brands,
        COUNT(DISTINCT manufacturer) as total_manufacturers
      FROM aesthetic_products
    `;

    const result = await pool.query(query);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Search products with advanced filters
router.post('/search', authenticateToken, verifyAccess, async (req, res) => {
  try {
    const {
      search_term,
      categories,
      brands,
      min_temp,
      max_temp,
      is_controlled,
      requires_prescription,
      has_stock
    } = req.body;

    let query = `
      SELECT DISTINCT
        ap.*,
        COUNT(DISTINCT pb.id) as batches_count,
        COALESCE(SUM(pb.current_stock), 0) as total_stock
      FROM aesthetic_products ap
      LEFT JOIN product_batches pb ON pb.product_id = ap.id AND pb.status = 'active'
      WHERE ap.is_active = true
    `;
    
    const queryParams = [];
    
    if (search_term) {
      query += ` AND (ap.name ILIKE $${queryParams.length + 1} 
                     OR ap.brand ILIKE $${queryParams.length + 1} 
                     OR ap.manufacturer ILIKE $${queryParams.length + 1}
                     OR ap.active_principle ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search_term}%`);
    }

    if (categories && categories.length > 0) {
      query += ` AND ap.category = ANY($${queryParams.length + 1})`;
      queryParams.push(categories);
    }

    if (brands && brands.length > 0) {
      query += ` AND ap.brand = ANY($${queryParams.length + 1})`;
      queryParams.push(brands);
    }

    if (min_temp !== undefined) {
      query += ` AND ap.storage_temp_min >= $${queryParams.length + 1}`;
      queryParams.push(min_temp);
    }

    if (max_temp !== undefined) {
      query += ` AND ap.storage_temp_max <= $${queryParams.length + 1}`;
      queryParams.push(max_temp);
    }

    if (is_controlled !== undefined) {
      query += ` AND ap.is_controlled = $${queryParams.length + 1}`;
      queryParams.push(is_controlled);
    }

    if (requires_prescription !== undefined) {
      query += ` AND ap.requires_prescription = $${queryParams.length + 1}`;
      queryParams.push(requires_prescription);
    }
    
    query += ` GROUP BY ap.id`;

    if (has_stock === true) {
      query += ` HAVING COALESCE(SUM(pb.current_stock), 0) > 0`;
    }

    query += ` ORDER BY ap.category, ap.name LIMIT 50`;

    const result = await pool.query(query, queryParams);

    res.json({ 
      products: result.rows,
      total_found: result.rows.length
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;