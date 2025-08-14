class ApiError extends Error {
  constructor(statusCode, message, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  console.error('❌', err.message, err.details || err.stack);

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
  }

  const status = err.statusCode || 500;
  const response = { error: err.message || 'Erro interno do servidor' };
  if (err.code) response.code = err.code;
  if (err.details) response.details = err.details;

  res.status(status).json(response);
}

module.exports = { ApiError, errorHandler };
