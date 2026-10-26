const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

// Public tracking endpoints - no JWT required
router.get('/open/:token', trackingController.trackOpen);
router.get('/click/:token', trackingController.trackClick);

module.exports = router;
