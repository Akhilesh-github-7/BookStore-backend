
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getHistory, addToHistory } = require('../controllers/historyController');

router.route('/').get(protect, getHistory).post(protect, addToHistory);

module.exports = router;
