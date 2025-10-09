const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getCollections,
    addCollection,
    updateCollection,
    deleteCollection,
    addBookToCollection,
    removeBookFromCollection,
    addBookFromPublic,
} = require('../controllers/collectionController');

router.route('/').get(protect, getCollections).post(protect, addCollection);
router
    .route('/:id')
    .put(protect, updateCollection)
    .delete(protect, deleteCollection);

router.route('/:id/books').post(protect, addBookToCollection);
router.route('/:id/books/:bookId').delete(protect, removeBookFromCollection);

router.route('/add-from-public/:bookId').post(protect, addBookFromPublic);

module.exports = router;