const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', draftController.getDraft);
router.post('/', draftController.saveDraft);
router.delete('/', draftController.deleteDraft);

module.exports = router;
