const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', groupController.getGroups);
router.post('/', groupController.createGroup);
router.get('/:id', groupController.getGroupById);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);
router.post('/:id/members', groupController.addMembers);
router.delete('/:id/members/:contactId', groupController.removeMember);

module.exports = router;
