const Book = require('../models/Book');
const History = require('../models/History');

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
            coverImageURL: req.files.coverImage ? ('/uploads/' + req.files.coverImage[0].filename).replace(/\\/g, '/') : '',
            filePath: req.files.bookPdf ? ('/uploads/' + req.files.bookPdf[0].filename).replace(/\\/g, '/') : ''
        });

        const createdBook = await book.save();
        res.status(201).json(createdBook);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update an owned book's details
// @route   PUT /api/books/personal/:id
// @access  Private
const updatePersonalBook = async (req, res) => {
    const { title, author, genre, summary, isPublic, coverImageURL } = req.body;
    const genreArray = genre ? genre.split(',').map(g => g.trim()).filter(g => g.length > 0) : undefined;

    try {
        const book = await Book.findById(req.params.id);

        if (book && book.owner.toString() === req.user._id.toString()) {
            book.title = title || book.title;
            book.author = author || book.author;
            book.genre = genreArray !== undefined ? genreArray : book.genre;
            book.summary = summary || book.summary;
            book.isPublic = isPublic !== undefined ? isPublic : book.isPublic;
            book.coverImageURL = coverImageURL || book.coverImageURL;

            const updatedBook = await book.save();
            res.json(updatedBook);
        } else {
            res.status(404).json({ message: 'Book not found or user not authorized' });
        }
    } catch (error) {
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
        res.status(500).json({ message: error.message });
    }
};

const getTrendingBooks = async (req, res) => {
    try {
        // First, find all public books and calculate their uniqueReadersCount
        let allPublicBooks = await Book.find({ isPublic: true })
            .select('_id title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath');

        const bookIds = allPublicBooks.map(book => book._id);

        const uniqueReadersCounts = await History.aggregate([
            { $match: { book: { $in: bookIds } } },
            { $group: { _id: '$book', uniqueReaders: { $addToSet: '$user' } } },
            { $project: { _id: 1, uniqueReadersCount: { $size: '$uniqueReaders' } } }
        ]);

        const uniqueReadersMap = new Map(uniqueReadersCounts.map(item => [item._id.toString(), item.uniqueReadersCount]));

        allPublicBooks = allPublicBooks.map(book => ({
            ...book.toObject(),
            uniqueReadersCount: uniqueReadersMap.get(book._id.toString()) || 0
        }));

        // Now sort these books based on recommendation criteria
        const recommendedBooks = allPublicBooks.sort((a, b) => {
            // Primary sort: averageRating (descending)
            if (b.averageRating !== a.averageRating) {
                return b.averageRating - a.averageRating;
            }
            // Secondary sort: numberOfRatings (descending)
            if (b.numberOfRatings !== a.numberOfRatings) {
                return b.numberOfRatings - a.numberOfRatings;
            }
            // Tertiary sort: uniqueReadersCount (descending)
            return b.uniqueReadersCount - a.uniqueReadersCount;
        }).slice(0, 4); // Limit to top 4 after sorting

        res.json(recommendedBooks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getPersonalBooks, addPersonalBook, updatePersonalBook, deletePersonalBook, getTrendingBooks };
