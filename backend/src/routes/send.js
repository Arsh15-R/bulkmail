const express = require('express');
const router = express.Router();
const sendController = require('../controllers/sendController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/preview', sendController.previewCampaign);
router.post('/cleanup', sendController.cleanupList);
router.post('/now', sendController.sendCampaignNow);
router.post('/test', sendController.sendTestEmail);
router.get('/verify-smtp', sendController.verifySmtpConnection);
router.get('/progress/:campaignId', sendController.streamCampaignProgress);

module.exports = router;
