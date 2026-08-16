function errorHandler(err, req, res, _next) {
  console.error(`[API ERROR] ${req.method} ${req.originalUrl} - Status: ${err.status || 500} - Message: ${err.message}`);
  if (err.stack) console.error(err.stack);

  const status = err.status || 500;
  if (err.data && typeof err.data === 'object') {
    return res.status(status).json(err.data);
  }
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;

