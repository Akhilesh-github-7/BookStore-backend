const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    genre: {
        type: [String] // Changed to array of strings
    },
    summary: {
        type: String
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    coverImageURL: {
        type: String
    },
    filePath: {
        type: String
    },
    averageRating: {
        type: Number,
        default: 0
    },
    numberOfRatings: {
        type: Number,
        default: 0
    },
    uniqueReadersCount: {
        type: Number,
        default: 0
    },
    ratings: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            rating: {
                type: Number,
                required: true
            },
            ratedByIp: {
                type: String,
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Book', BookSchema);
