const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const generateToken = (id, username, profileImage, city, country, createdAt) => {
    return jwt.sign({ id, username, profileImage, city, country, createdAt }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            password
        });

        if (user) {
            logger.info(`New user registered: ${username}`);
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id, user.username, user.profileImage, user.city, user.country, user.createdAt)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            logger.info(`User logged in: ${user.username}`);
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id, user.username, user.profileImage, user.city, user.country, user.createdAt)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.username = req.body.username || user.username;
            user.city = req.body.city || user.city;
            user.country = req.body.country || user.country;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                city: updatedUser.city,
                country: updatedUser.country,
                token: generateToken(updatedUser._id, updatedUser.username, updatedUser.profileImage, updatedUser.city, updatedUser.country, updatedUser.createdAt)
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload user profile image
// @route   POST /api/auth/profile/image
// @access  Private
const uploadProfileImage = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            if (req.file) {
                logger.info(`Profile image uploaded for user: ${user.username}, file: ${req.file.filename}`);
                user.profileImage = `/uploads/${req.file.filename}`;
                const updatedUser = await user.save();

                res.json({
                    _id: updatedUser._id,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    profileImage: updatedUser.profileImage,
                    token: generateToken(updatedUser._id, updatedUser.username, updatedUser.profileImage)
                });
            } else {
                res.status(400).json({ message: 'No image file provided' });
            }
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change user password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (user && (await user.matchPassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            logger.info(`Password changed for user: ${user.username}`);
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            await User.deleteOne({ _id: user._id });
            logger.info(`User deleted: ${user.username}`);
            res.json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        logger.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, updateUserProfile, uploadProfileImage, changePassword, deleteUser };