const fs = require('fs');
const path = require('path');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const logger = require('./utils/logger');
const Book = require('./models/Book');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'https://book-store-ak.vercel.app', 'https://bookstore-ak.vercel.app'],
        methods: ['GET', 'POST']
    }
});

app.set('io', io);

// Socket.io connection
io.on('connection', (socket) => {
    logger.info('a user connected');
    socket.on('disconnect', () => {
        logger.info('user disconnected');
    });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info('MongoDB connected'))
    .catch(err => logger.error(err));

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Custom route to force download of PDF files
app.get('/public/uploads/:filename', (req, res, next) => {
    const filename = req.params.filename;
    if (filename.endsWith('.pdf')) {
        const filePath = path.join(__dirname, 'public', 'uploads', filename);
        const downloadTitle = req.query.title ? `${req.query.title}.pdf` : filename;
        res.setHeader('Content-Disposition', `attachment; filename="${downloadTitle}"`);
        return res.download(filePath, downloadTitle, (err) => {
            if (err) {
                logger.error(`Error downloading file: ${err}`);
                if (!res.headersSent) {
                    res.status(500).send('Could not download the file.');
                }
            }
        });
    }
    next();
});

// Serve static files from 'public' directory
// This handles requests to /uploads/... and /public/uploads/...
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // max 1000 requests per 15 minutes per IP
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);
app.set('trust proxy', 1);

// Routes (will be added later)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/personal-books', require('./routes/personalBookRoutes'));
app.use('/api/public-books', require('./routes/publicBookRoutes'));
app.use('/api/collections', require('./routes/collectionRoutes'));
app.use('/api/favorites', require('./routes/favoriteRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));

app.get('/', (req, res) => {
    res.send('BookStore API is running');
});

// Temporary route for debugging: Fetch book by ID
app.get('/api/debug/book/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
