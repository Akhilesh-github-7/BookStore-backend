const Book = require('../models/Book');
const History = require('../models/History');

// @desc    Get all public books
// @route   GET /api/books/public
// @access  Public
const getPublicBooks = async (req, res) => {
    const { sortBy, page = 1, limit = 10 } = req.query;

    try {
        let sortOptions = {};
        if (sortBy === 'rating') {
            sortOptions = { averageRating: -1 };
        } else if (sortBy === 'createdAt') {
            sortOptions = { createdAt: -1 };
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const totalBooks = await Book.countDocuments({ isPublic: true });
        const totalPages = Math.ceil(totalBooks / limitNum);

        let query = Book.find({ isPublic: true })
            .populate('owner', 'username')
            .select('title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        const books = await query;

        const bookIds = books.map(book => book._id);

        const uniqueReadersCounts = await History.aggregate([
            { $match: { book: { $in: bookIds } } },
            { $group: { _id: '$book', uniqueReaders: { $addToSet: '$user' } } },
            { $project: { _id: 1, uniqueReadersCount: { $size: '$uniqueReaders' } } }
        ]);

        const uniqueReadersMap = new Map(uniqueReadersCounts.map(item => [item._id.toString(), item.uniqueReadersCount]));

        const booksWithReadersCount = books.map(book => ({
            ...book.toObject(),
            uniqueReadersCount: uniqueReadersMap.get(book._id.toString()) || 0
        }));
        
        res.json({
            books: booksWithReadersCount,
            page: pageNum,
            pages: totalPages,
            totalBooks: totalBooks
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search and filter public books
// @route   GET /api/books/public/search
// @access  Public
const searchPublicBooks = async (req, res) => {
    const { query, genre, author } = req.query;
    let filter = { isPublic: true };

    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: 'i' } },
            { summary: { $regex: query, $options: 'i' } }
        ];
    }

    if (genre) {
        filter.genre = { $in: [new RegExp(genre, 'i')] }; // Search within the array
    }

    if (author) {
        filter.author = { $regex: author, $options: 'i' };
    }

    try {
        const books = await Book.find(filter).populate('owner', 'username').select('title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath');

        const bookIds = books.map(book => book._id);

        const uniqueReadersCounts = await History.aggregate([
            { $match: { book: { $in: bookIds } } },
            { $group: { _id: '$book', uniqueReaders: { $addToSet: '$user' } } },
            { $project: { _id: 1, uniqueReadersCount: { $size: '$uniqueReaders' } } }
        ]);

        const uniqueReadersMap = new Map(uniqueReadersCounts.map(item => [item._id.toString(), item.uniqueReadersCount]));

        const booksWithReadersCount = books.map(book => ({
            ...book.toObject(),
            uniqueReadersCount: uniqueReadersMap.get(book._id.toString()) || 0
        }));

        res.json(booksWithReadersCount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const rateBook = async (req, res) => {
    const { rating } = req.body;
    const { bookId } = req.params;
    const user = req.user;
    const ip = req.ip;

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    try {
        const book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        let alreadyRated;
        if (user) {
            alreadyRated = book.ratings.find(
                (r) => r.user && r.user.toString() === user._id.toString()
            );
        } else {
            alreadyRated = book.ratings.find((r) => r.ratedByIp === ip);
        }

        if (alreadyRated) {
            // Update existing rating
            alreadyRated.rating = rating;
        } else {
            // Add new rating
            const newRating = { rating };
            if (user) {
                newRating.user = user._id;
            } else {
                newRating.ratedByIp = ip;
            }
            book.ratings.push(newRating);
        }

        // Recalculate average rating and number of ratings
        const uniqueRaters = new Set();
        book.ratings.forEach(r => {
            if (r.user) {
                uniqueRaters.add(r.user.toString());
            } else if (r.ratedByIp) {
                uniqueRaters.add(r.ratedByIp);
            }
        });
        book.numberOfRatings = uniqueRaters.size;
        book.averageRating = book.ratings.reduce((acc, item) => item.rating + acc, 0) / book.ratings.length;

        await book.save();

        // Re-fetch the book to ensure all fields are up-to-date
        const updatedBook = await Book.findById(bookId).populate('owner', 'username').select('title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath');

        const io = req.app.get('io');
        console.log('Emitting rating_updated with book:', updatedBook.toObject());
        console.log('Emitted averageRating:', updatedBook.averageRating, 'numberOfRatings:', updatedBook.numberOfRatings);
        io.emit('rating_updated', updatedBook.toObject());

        res.json(book);
    } catch (error) {
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
        let query = {
            author: authorName,
            isPublic: true,
        };

        if (excludeBookId) {
            query._id = { $ne: excludeBookId };
        }

        const books = await Book.find(query)
            .select('_id title coverImageURL')
            .limit(5); // Limit to a reasonable number of other books

        res.json(books);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all unique genres from public books
// @route   GET /api/books/public/genres
// @access  Public
const getUniqueGenres = async (req, res) => {
    try {
        const genres = await Book.aggregate([
            { $match: { isPublic: true, genre: { $exists: true } } }, // Match public books with existing genre field
            { $addFields: { // Ensure genre is an array
                genre: {
                    $cond: {
                        if: { $eq: [ { $type: "$genre" }, "string" ] },
                        then: { $split: [ "$genre", "," ] },
                        else: "$genre"
                    }
                }
            }},
            { $unwind: '$genre' }, // Deconstruct the genre array into separate documents
            { $project: { genre: { $trim: { input: "$genre" } } } }, // Trim whitespace from each genre
            { $match: { genre: { $ne: "" } } }, // Remove empty strings resulting from split/trim
            { $group: { _id: '$genre' } }, // Group by genre to get unique values
            { $sort: { _id: 1 } }, // Sort alphabetically
            { $project: { _id: 0, genre: '$_id' } } // Reshape to return just the genre string
        ]);
        res.json(genres.map(g => g.genre));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getPublicBooks, searchPublicBooks, rateBook, getBooksByAuthor, getUniqueGenres };
