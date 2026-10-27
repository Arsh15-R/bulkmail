const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', historyController.getCampaigns);
router.get('/:id', historyController.getCampaignById);
router.delete('/:id', historyController.deleteCampaign);
router.delete('/recipient/:recipientId', historyController.deleteRecipient);
router.post('/bulk-delete', historyController.bulkDeleteCampaigns);
router.post('/:id/retry-failed', historyController.retryFailedRecipients);
router.get('/:id/export', historyController.exportCampaignCsv);

module.exports = router;
