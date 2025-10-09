const User = require('../models/User');
const Book = require('../models/Book');

// @desc    Get user's favorite books
// @route   GET /api/favorites
// @access  Private
const getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('favorites', 'title author coverImageURL averageRating summary filePath');
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a book to favorites
// @route   POST /api/favorites
// @access  Private
const addFavorite = async (req, res) => {
    const { bookId } = req.body;

    try {
        const user = await User.findById(req.user._id);
        const book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (user.favorites.includes(bookId)) {
            return res.status(400).json({ message: 'Book already in favorites' });
        }

        user.favorites.push(bookId);
        await user.save();
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a book from favorites
// @route   DELETE /api/favorites/:bookId
// @access  Private
const removeFavorite = async (req, res) => {
    const { bookId } = req.params;

    try {
        const user = await User.findById(req.user._id);

        user.favorites = user.favorites.filter((id) => id.toString() !== bookId);

        await user.save();
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
