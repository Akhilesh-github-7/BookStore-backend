const Collection = require('../models/Collection');
const Book = require('../models/Book');
const logger = require('../utils/logger');

// @desc    Get all collections for a user
// @route   GET /api/collections
// @access  Private
const getCollections = async (req, res) => {
    try {
        const collections = await Collection.find({ owner: req.user._id }).populate('books');
        res.json(collections);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a new collection
// @route   POST /api/collections
// @access  Private
const addCollection = async (req, res) => {
    const { name } = req.body;

    try {
        const collection = new Collection({
            name,
            owner: req.user._id,
        });

        const createdCollection = await collection.save();
        res.status(201).json(createdCollection);
    } catch (error) {
        logger.error(error.message);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a collection
// @route   PUT /api/collections/:id
// @access  Private
const updateCollection = async (req, res) => {
    const { name } = req.body;

    try {
        const collection = await Collection.findById(req.params.id);

        if (collection && collection.owner.toString() === req.user._id.toString()) {
            collection.name = name || collection.name;

            const updatedCollection = await collection.save();
            res.json(updatedCollection);
        } else {
            res.status(404).json({ message: 'Collection not found or user not authorized' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a collection
// @route   DELETE /api/collections/:id
// @access  Private
const deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id);

        if (collection && collection.owner.toString() === req.user._id.toString()) {
            await collection.deleteOne();
            res.json({ message: 'Collection removed' });
        } else {
            res.status(404).json({ message: 'Collection not found or user not authorized' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a book to a collection
// @route   POST /api/collections/:id/books
// @access  Private
const addBookToCollection = async (req, res) => {
    const { bookId } = req.body;

    try {
        const collection = await Collection.findById(req.params.id);
        const book = await Book.findById(bookId);

        if (!collection || collection.owner.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Collection not found or user not authorized' });
        }

        if (!book || book.owner.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Book not found or user not authorized' });
        }

        if (collection.books.includes(bookId)) {
            return res.status(400).json({ message: 'Book already in collection' });
        }

        collection.books.push(bookId);
        await collection.save();
        res.json(collection);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a book from a collection
// @route   DELETE /api/collections/:id/books/:bookId
// @access  Private
const removeBookFromCollection = async (req, res) => {
    const { bookId } = req.params;

    try {
        const collection = await Collection.findById(req.params.id);

        if (!collection || collection.owner.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Collection not found or user not authorized' });
        }

        collection.books = collection.books.filter((id) => id.toString() !== bookId);

        await collection.save();
        res.json(collection);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

const addBookFromPublic = async (req, res) => {
    const { bookId } = req.params;

    try {
        const publicBook = await Book.findById(bookId);

        if (!publicBook || !publicBook.isPublic) {
            return res.status(404).json({ message: 'Public book not found' });
        }

        const newBook = new Book({
            title: publicBook.title,
            author: publicBook.author,
            genre: publicBook.genre,
            summary: publicBook.summary,
            owner: req.user._id,
            isPublic: false, // a personal book
            coverImageURL: publicBook.coverImageURL,
            filePath: publicBook.filePath,
            averageRating: publicBook.averageRating,
            numberOfRatings: publicBook.numberOfRatings,
            ratings: publicBook.ratings,
        });

        const createdBook = await newBook.save();
        res.status(201).json(createdBook);
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCollections,
    addCollection,
    updateCollection,
    deleteCollection,
    addBookToCollection,
    removeBookFromCollection,
    addBookFromPublic,
};
