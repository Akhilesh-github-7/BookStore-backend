const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getPersonalBooks, addPersonalBook, updatePersonalBook, deletePersonalBook, getTrendingBooks } = require('../controllers/personalBookController');

const upload = require('../config/multerConfig');

router.route('/').get(protect, getPersonalBooks).post(protect, upload, addPersonalBook);
router.route('/trending').get(protect, getTrendingBooks);
router.route('/:id').put(protect, updatePersonalBook).delete(protect, deletePersonalBook);

module.exports = router;
