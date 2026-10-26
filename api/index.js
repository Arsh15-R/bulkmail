let app;
let initError;

try {
  const server = require('../backend/src/server');
  app = server.app;
} catch (err) {
  initError = err;
  console.error('Initialization error in api/index.js:', err);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      error: 'Backend initialization failed',
      message: initError.message,
      stack: initError.stack
    });
  }

  // Normalize path if rewritten without /api prefix
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/unsubscribe')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
};
