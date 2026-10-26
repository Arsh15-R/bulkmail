const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', contactController.getContacts);
router.post('/', contactController.createContact);
router.post('/import', contactController.importContacts);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
