const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', scheduleController.createSchedule);
router.get('/', scheduleController.getSchedules);
router.put('/:id', scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);

module.exports = router;
