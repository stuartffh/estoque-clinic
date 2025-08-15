/**
 * Middleware de Validação com Joi
 * Sistema robusto de validação de entrada para todas as rotas
 */

const Joi = require('joi');
const { ApiError } = require('./errorHandler');

/**
 * Middleware para validar dados de entrada usando esquemas Joi
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Retorna todos os erros, não apenas o primeiro
      stripUnknown: true, // Remove campos não definidos no schema
      convert: true // Converte tipos automaticamente quando possível
    });

    if (error) {
      // Formatar erros de validação de forma amigável
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(new ApiError(400, 'Dados de entrada inválidos', 'VALIDATION_ERROR', details));
    }

    // Substituir dados originais pelos dados validados e limpos
    req[property] = value;
    next();
  };
};

// =====================================
// SCHEMAS DE VALIDAÇÃO
// =====================================

/**
 * Schema para validação de autenticação
 */
const authSchemas = {
  login: Joi.object({
    username: Joi.string()
      .min(3)
      .max(50)
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Username deve conter apenas letras, números, pontos, hífens e underscores',
        'string.min': 'Username deve ter pelo menos 3 caracteres',
        'string.max': 'Username deve ter no máximo 50 caracteres'
      }),
    
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password deve ter pelo menos 6 caracteres',
        'string.max': 'Password deve ter no máximo 128 caracteres'
      })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token é obrigatório'
      })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
        'string.min': 'Nova senha deve ter pelo menos 8 caracteres'
      })
  })
};

/**
 * Schema para validação de usuários
 */
const userSchemas = {
  create: Joi.object({
    username: Joi.string()
      .min(3)
      .max(50)
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .required(),
    
    email: Joi.string()
      .email()
      .max(255)
      .required()
      .messages({
        'string.email': 'Email deve ter um formato válido'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
        'string.min': 'Password deve ter pelo menos 8 caracteres'
      }),
    
    fullName: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Nome completo deve conter apenas letras e espaços'
      }),
    
    role: Joi.string()
      .valid('super_admin', 'admin', 'manager', 'user')
      .default('user'),
    
    clinic_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null)
  }),

  update: Joi.object({
    username: Joi.string()
      .min(3)
      .max(50)
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .optional(),
    
    email: Joi.string()
      .email()
      .max(255)
      .optional(),
    
    fullName: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
      .optional(),
    
    role: Joi.string()
      .valid('super_admin', 'admin', 'manager', 'user')
      .optional(),
    
    clinic_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null),
    
    is_active: Joi.boolean()
      .optional()
  }).min(1) // Pelo menos um campo deve ser fornecido para atualização
};

/**
 * Schema para validação de produtos estéticos
 */
const productSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(200)
      .required()
      .messages({
        'string.min': 'Nome do produto deve ter pelo menos 2 caracteres',
        'string.max': 'Nome do produto deve ter no máximo 200 caracteres'
      }),
    
    brand: Joi.string()
      .min(2)
      .max(100)
      .required(),
    
    category: Joi.string()
      .valid('botox', 'filler', 'biostimulator', 'skincare', 'equipment', 'consumable', 'other')
      .required(),
    
    subcategory: Joi.string()
      .max(100)
      .optional(),
    
    description: Joi.string()
      .max(1000)
      .optional(),
    
    barcode: Joi.string()
      .pattern(/^[0-9]{8,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Código de barras deve conter entre 8 e 14 dígitos'
      }),
    
    unit_measure: Joi.string()
      .valid('ml', 'units', 'vials', 'boxes', 'pieces', 'grams', 'liters')
      .default('units'),
    
    min_stock: Joi.number()
      .integer()
      .min(0)
      .default(0),
    
    max_stock: Joi.number()
      .integer()
      .min(Joi.ref('min_stock'))
      .optional(),
    
    expiry_warning_days: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(30),
    
    requires_temperature_control: Joi.boolean()
      .default(false),
    
    min_temperature: Joi.number()
      .when('requires_temperature_control', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
    
    max_temperature: Joi.number()
      .greater(Joi.ref('min_temperature'))
      .when('requires_temperature_control', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
    
    anvisa_registry: Joi.string()
      .pattern(/^[0-9]{13}\.[0-9]{3}\.[0-9]{3}-[0-9]$/)
      .optional()
      .messages({
        'string.pattern.base': 'Registro ANVISA deve seguir o formato 1234567890123.123.123-1'
      })
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    brand: Joi.string().min(2).max(100).optional(),
    category: Joi.string().valid('botox', 'filler', 'biostimulator', 'skincare', 'equipment', 'consumable', 'other').optional(),
    subcategory: Joi.string().max(100).optional(),
    description: Joi.string().max(1000).optional(),
    barcode: Joi.string().pattern(/^[0-9]{8,14}$/).optional(),
    unit_measure: Joi.string().valid('ml', 'units', 'vials', 'boxes', 'pieces', 'grams', 'liters').optional(),
    min_stock: Joi.number().integer().min(0).optional(),
    max_stock: Joi.number().integer().min(Joi.ref('min_stock')).optional(),
    expiry_warning_days: Joi.number().integer().min(1).max(365).optional(),
    requires_temperature_control: Joi.boolean().optional(),
    min_temperature: Joi.number().optional(),
    max_temperature: Joi.number().greater(Joi.ref('min_temperature')).optional(),
    anvisa_registry: Joi.string().pattern(/^[0-9]{13}\.[0-9]{3}\.[0-9]{3}-[0-9]$/).optional(),
    is_active: Joi.boolean().optional()
  }).min(1)
};

/**
 * Schema para validação de movimentações de estoque
 */
const movementSchemas = {
  create: Joi.object({
    product_id: Joi.number()
      .integer()
      .positive()
      .required(),
    
    type: Joi.string()
      .valid('in', 'out', 'adjustment', 'transfer', 'loss', 'expired')
      .required(),
    
    quantity: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.positive': 'Quantidade deve ser maior que zero'
      }),
    
    unit_cost: Joi.number()
      .positive()
      .precision(2)
      .optional(),
    
    batch_number: Joi.string()
      .max(50)
      .optional(),
    
    expiry_date: Joi.date()
      .greater('now')
      .optional()
      .messages({
        'date.greater': 'Data de validade deve ser futura'
      }),
    
    supplier: Joi.string()
      .max(200)
      .optional(),
    
    notes: Joi.string()
      .max(500)
      .optional(),
    
    clinic_id: Joi.number()
      .integer()
      .positive()
      .required()
  })
};

/**
 * Schema para parâmetros de consulta (query params)
 */
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),
    
    sort: Joi.string()
      .valid('id', 'name', 'created_at', 'updated_at', 'username', 'email')
      .default('id'),
    
    order: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
  }),

  search: Joi.object({
    q: Joi.string()
      .min(1)
      .max(100)
      .optional(),
    
    category: Joi.string()
      .valid('botox', 'filler', 'biostimulator', 'skincare', 'equipment', 'consumable', 'other')
      .optional(),
    
    brand: Joi.string()
      .max(100)
      .optional(),
    
    status: Joi.string()
      .valid('active', 'inactive', 'all')
      .default('active')
  })
};

module.exports = {
  validate,
  authSchemas,
  userSchemas,
  productSchemas,
  movementSchemas,
  querySchemas
};