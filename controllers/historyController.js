
const History = require('../models/History');
const Book = require('../models/Book');

// @desc    Get user's reading history
// @route   GET /api/history
// @access  Private
const getHistory = async (req, res) => {
    try {
        console.log('Fetching history for user ID:', req.user._id);
        const history = await History.aggregate([
            { $match: { user: req.user._id } },
            { $sort: { lastReadAt: -1 } },
            {
                $group: {
                    _id: '$book',
                    lastReadAt: { $first: '$lastReadAt' },
                    doc: { $first: '$$ROOT' }
                }
            },
            { $replaceRoot: { newRoot: '$doc' } },
            { $sort: { lastReadAt: -1 } }
        ]);

        await Book.populate(history, {
            path: 'book',
            select: 'title author coverImageURL averageRating summary filePath'
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a book to reading history
// @route   POST /api/history
// @access  Private
const addToHistory = async (req, res) => {
    const { bookId } = req.body;
    const userId = req.user._id; // Assuming req.user._id is available

    try {
        let book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const existingEntry = await History.findOne({ user: userId, book: bookId });

        if (existingEntry) {
            existingEntry.lastReadAt = Date.now();
            await existingEntry.save();
        } else {
            const newEntry = new History({
                user: userId,
                book: bookId
            });
            await newEntry.save();
        }

        // Recalculate uniqueReadersCount for the book
        const uniqueReaders = await History.distinct('user', { book: bookId });
        book.uniqueReadersCount = uniqueReaders.length;
        await book.save();

        // Re-fetch the book to ensure all fields are up-to-date
        const updatedBook = await Book.findById(bookId).populate('owner', 'username').select('title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath');

        // Emit socket event
        const io = req.app.get('io');
        io.emit('readers_count_updated', updatedBook.toObject());
        console.log('Emitted readers_count_updated for book:', updatedBook.toObject());

        res.status(200).json(updatedBook); // Return the updated book
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { getHistory, addToHistory };
