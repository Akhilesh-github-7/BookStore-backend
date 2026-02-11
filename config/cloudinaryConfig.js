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
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: 'bookstore/books',
      public_id: file.fieldname + '-' + Date.now(),
      resource_type: isPdf ? 'image' : 'image',
      format: isPdf ? 'pdf' : undefined,
      type: 'upload' // Explicitly set to 'upload' for public access
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
