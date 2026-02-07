const Book = require('../models/Book');
const logger = require('../utils/logger');

class BookService {
    /**
     * Get public books with pagination and sorting
     * @param {Object} params - Query parameters
     * @returns {Object} - Result containing books, page info
     */
    async getPublicBooks({ sortBy, page = 1, limit = 10 }) {
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

            // Optimized: No longer aggregating history on the fly.
            // Relying on book.uniqueReadersCount which is updated when a user adds to history.
            const books = await Book.find({ isPublic: true })
                .populate('owner', 'username')
                .select('title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath ratings')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum);

            return {
                books,
                page: pageNum,
                pages: totalPages,
                totalBooks
            };
        } catch (error) {
            logger.error(`Error in getPublicBooks: ${error.message}`);
            throw error;
        }
    }

    /**
     * Search public books
     * @param {Object} params - Search filters (query, genre, author)
     * @returns {Array} - List of books
     */
    async searchPublicBooks({ query, genre, author }) {
        let filter = { isPublic: true };

        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { summary: { $regex: query, $options: 'i' } }
            ];
        }

        if (genre) {
            filter.genre = { $in: [new RegExp(genre, 'i')] };
        }

        if (author) {
            filter.author = { $regex: author, $options: 'i' };
        }

        try {
            // Optimized: Removed on-the-fly aggregation
            return await Book.find(filter)
                .populate('owner', 'username')
                .select('title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath ratings');
        } catch (error) {
            logger.error(`Error in searchPublicBooks: ${error.message}`);
            throw error;
        }
    }

    /**
     * Rate a book
     * @param {String} bookId 
     * @param {Number} rating 
     * @param {Object} user - User object (optional)
     * @param {String} ip - IP address
     * @returns {Object} - Updated book
     */
    async rateBook(bookId, rating, user, ip) {
        try {
            const book = await Book.findById(bookId);
            if (!book) {
                throw new Error('Book not found');
            }

            // Uniqueness Check: Find if user (by ID) or guest (by IP) has already rated
            let ratingIndex = -1;
            if (user) {
                ratingIndex = book.ratings.findIndex(
                    (r) => r.user && r.user.toString() === user._id.toString()
                );
            } else {
                ratingIndex = book.ratings.findIndex(
                    (r) => !r.user && r.ratedByIp === ip
                );
            }

            if (ratingIndex !== -1) {
                // Update existing rating - Prevents duplicate entries
                book.ratings[ratingIndex].rating = rating;
                // Also update IP in case it changed for a logged in user (optional but good for tracking)
                if (!user) book.ratings[ratingIndex].ratedByIp = ip; 
            } else {
                // Add new rating entry
                const newRating = { rating };
                if (user) {
                    newRating.user = user._id;
                } else {
                    newRating.ratedByIp = ip;
                }
                book.ratings.push(newRating);
            }

            // Recalculate average and count using the unique ratings array
            const totalRating = book.ratings.reduce((acc, item) => item.rating + acc, 0);
            book.numberOfRatings = book.ratings.length;
            book.averageRating = totalRating / book.ratings.length;

            await book.save();
            
            // Re-fetch with essential fields plus the current user's specific rating info
            const updatedBook = await Book.findById(bookId)
                .populate('owner', 'username')
                .select('title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath ratings');

            // We return the ratings array so the frontend can find the user's specific rating
            return updatedBook;

        } catch (error) {
            logger.error(`Error in rateBook: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get books by author
     * @param {String} authorName 
     * @param {String} excludeBookId 
     * @returns {Array}
     */
    async getBooksByAuthor(authorName, excludeBookId) {
        try {
            let query = {
                author: authorName,
                isPublic: true,
            };
    
            if (excludeBookId) {
                query._id = { $ne: excludeBookId };
            }
    
            return await Book.find(query)
                .select('_id title coverImageURL')
                .limit(5);
        } catch (error) {
            logger.error(`Error in getBooksByAuthor: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get unique genres
     * @returns {Array}
     */
    async getUniqueGenres() {
        try {
            const genres = await Book.aggregate([
                { $match: { isPublic: true, genre: { $exists: true } } },
                { $addFields: {
                    genre: {
                        $cond: {
                            if: { $eq: [ { $type: "$genre" }, "string" ] },
                            then: { $split: [ "$genre", "," ] },
                            else: "$genre"
                        }
                    }
                }},
                { $unwind: '$genre' },
                { $project: { genre: { $trim: { input: "$genre" } } } },
                { $match: { genre: { $ne: "" } } },
                { $group: { _id: '$genre' } },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, genre: '$_id' } }
            ]);
            return genres.map(g => g.genre);
        } catch (error) {
            logger.error(`Error in getUniqueGenres: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get trending books
     * @returns {Array}
     */
    async getTrendingBooks() {
        try {
            // Optimized: Sort in DB instead of in memory. 
            // Removed on-the-fly history aggregation.
            return await Book.find({ isPublic: true })
                .sort({ averageRating: -1, numberOfRatings: -1, uniqueReadersCount: -1 })
                .limit(4)
                .select('_id title author coverImageURL averageRating numberOfRatings uniqueReadersCount summary filePath ratings');
        } catch (error) {
            logger.error(`Error in getTrendingBooks: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new BookService();
