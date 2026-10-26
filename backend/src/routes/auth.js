const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiter');

router.post('/signup', signupLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.put('/settings', authenticateToken, authController.updateSettings);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
