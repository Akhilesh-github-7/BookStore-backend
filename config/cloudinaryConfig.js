const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Cloudinary Storage for Books (Covers and PDFs)
const bookStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'bookstore/books',
      public_id: file.fieldname + '-' + Date.now(),
      resource_type: 'auto', // Let Cloudinary decide
      access_mode: 'public'  // Explicitly set to public
    };
  }
});

const upload = multer({ 
  storage: bookStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).fields([
  { name: 'bookPdf', maxCount: 1 }, 
  { name: 'coverImage', maxCount: 1 }
]);

module.exports = { upload, cloudinary };
