const express = require('express');
const router = express.Router();
const { getPublicBooks, searchPublicBooks, rateBook, getBooksByAuthor, getUniqueGenres } = require('../controllers/publicBookController');
const { protect } = require('../middleware/auth');

router.get('/', getPublicBooks);
router.get('/search', searchPublicBooks);
router.get('/author/:authorName', getBooksByAuthor);
router.get('/genres', getUniqueGenres);
router.post('/:bookId/rate', rateBook);

module.exports = router;
