const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updateUserProfile, uploadProfileImage, changePassword, deleteUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth'); // Assuming a protect middleware exists
const uploadProfileImageMiddleware = require('../config/multerProfileImageConfig');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/profile', protect, updateUserProfile);
router.post('/profile/image', protect, uploadProfileImageMiddleware, uploadProfileImage);
router.put('/password', protect, changePassword);
router.delete('/profile', protect, deleteUser);

module.exports = router;
