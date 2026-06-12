const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('Admin', 'Principal', 'CoE', 'HoD'), logController.getLogs);

module.exports = router;
