const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteController');

router.route('/').get(protect, getFavorites).post(protect, addFavorite);
router.route('/:bookId').delete(protect, removeFavorite);

module.exports = router;
