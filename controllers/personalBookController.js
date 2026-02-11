const Book = require('../models/Book');
const bookService = require('../services/bookService');
const logger = require('../utils/logger');

// @desc    Get all books owned by the authenticated user
// @route   GET /api/books/personal
// @access  Private
const getPersonalBooks = async (req, res) => {
    const { filterBy, sortBy, page = 1, limit = 10 } = req.query;

    try {
        let query = { owner: req.user._id };
        const now = new Date();

        if (filterBy === 'today') {
            query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
        } else if (filterBy === 'thisWeek') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            startOfWeek.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: startOfWeek };
        } else if (filterBy === 'thisMonth') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            query.createdAt = { $gte: startOfMonth };
        }

        let sortOptions = {};
        if (sortBy === 'newest') {
            sortOptions = { createdAt: -1 };
        } else if (sortBy === 'rating') {
            sortOptions = { averageRating: -1 };
        }

        const books = await Book.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalBooks = await Book.countDocuments(query);

        res.json({
            books,
            pages: Math.ceil(totalBooks / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a new book
// @route   POST /api/books/personal
// @access  Private
const addPersonalBook = async (req, res) => {
    const { title, author, genre, summary } = req.body;
    const genreArray = genre ? genre.split(',').map(g => g.trim()).filter(g => g.length > 0) : [];

    try {
        const book = new Book({
            title,
            author,
            genre: genreArray,
            summary,
            owner: req.user._id,
            isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
            coverImageURL: req.files.coverImage ? req.files.coverImage[0].path : '',
            filePath: req.files.bookPdf ? req.files.bookPdf[0].path : ''
        });

        const createdBook = await book.save();
        res.status(201).json(createdBook);
    } catch (error) {
        logger.error(error.message);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update an owned book's details
// @route   PUT /api/books/personal/:id
// @access  Private
const updatePersonalBook = async (req, res) => {
    const { title, author, genre, summary, isPublic } = req.body;
    const genreArray = genre ? genre.split(',').map(g => g.trim()).filter(g => g.length > 0) : undefined;

    try {
        const book = await Book.findById(req.params.id);

        if (book && book.owner.toString() === req.user._id.toString()) {
            book.title = title || book.title;
            book.author = author || book.author;
            book.genre = genreArray !== undefined ? genreArray : book.genre;
            book.summary = summary || book.summary;
            book.isPublic = isPublic !== undefined ? (isPublic === 'true' || isPublic === true) : book.isPublic;
            
            if (req.files) {
                if (req.files.coverImage) {
                    book.coverImageURL = req.files.coverImage[0].path;
                }
                if (req.files.bookPdf) {
                    book.filePath = req.files.bookPdf[0].path;
                }
            }

            const updatedBook = await book.save();
            res.json(updatedBook);
        } else {
            res.status(404).json({ message: 'Book not found or user not authorized' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an owned book
// @route   DELETE /api/books/personal/:id
// @access  Private
const deletePersonalBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (book && book.owner.toString() === req.user._id.toString()) {
            await book.deleteOne();
            res.json({ message: 'Book removed' });
        } else {
            res.status(404).json({ message: 'Book not found or user not authorized' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

const getTrendingBooks = async (req, res) => {
    try {
        const recommendedBooks = await bookService.getTrendingBooks();
        res.json(recommendedBooks);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getPersonalBooks, addPersonalBook, updatePersonalBook, deletePersonalBook, getTrendingBooks };