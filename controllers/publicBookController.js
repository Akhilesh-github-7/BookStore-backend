const bookService = require('../services/bookService');
const logger = require('../utils/logger');

// @desc    Get all public books
// @route   GET /api/books/public
// @access  Public
const getPublicBooks = async (req, res) => {
    try {
        const result = await bookService.getPublicBooks(req.query);
        res.json(result);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search and filter public books
// @route   GET /api/books/public/search
// @access  Public
const searchPublicBooks = async (req, res) => {
    try {
        const books = await bookService.searchPublicBooks(req.query);
        res.json(books);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Rate a book
// @route   POST /api/books/public/:bookId/rate
// @access  Public (or Private)
const rateBook = async (req, res) => {
    const { rating } = req.body;
    const { bookId } = req.params;
    const user = req.user;
    const ip = req.ip;

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    try {
        const updatedBook = await bookService.rateBook(bookId, rating, user, ip);

        const io = req.app.get('io');
        logger.info(`Emitting rating_updated for book: ${updatedBook._id}`);
        io.emit('rating_updated', updatedBook);

        res.json(updatedBook);
    } catch (error) {
        if (error.message === 'Book not found') {
            return res.status(404).json({ message: error.message });
        }
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get other public books by the same author
// @route   GET /api/books/public/author/:authorName
// @access  Public
const getBooksByAuthor = async (req, res) => {
    const { authorName } = req.params;
    const { excludeBookId } = req.query;

    try {
        const books = await bookService.getBooksByAuthor(authorName, excludeBookId);
        res.json(books);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all unique genres from public books
// @route   GET /api/books/public/genres
// @access  Public
const getUniqueGenres = async (req, res) => {
    try {
        const genres = await bookService.getUniqueGenres();
        res.json(genres);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getPublicBooks, searchPublicBooks, rateBook, getBooksByAuthor, getUniqueGenres };