const Movie = require("../models/Movie");

// =======================
// ADD MOVIE
// =======================
exports.addMovie = async (req, res) => {
    try {
        const { title, director, year, description, genre } = req.body;

        const movie = await Movie.create({
            title,
            director,
            year,
            description,
            genre,
            comments: []
        });

        return res.status(201).json(movie);

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// GET ALL MOVIES
// =======================
exports.getMovies = async (req, res) => {
    try {
        const movies = await Movie.find();

        return res.status(200).json({
            movies
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// GET MOVIE BY ID
// =======================
exports.getMovieById = async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        return res.status(200).json(movie);

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// UPDATE MOVIE
// =======================
exports.updateMovie = async (req, res) => {
    try {
        const updatedMovie = await Movie.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedMovie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        return res.status(200).json({
            message: "Movie updated successfully",
            updatedMovie
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// DELETE MOVIE
// =======================
exports.deleteMovie = async (req, res) => {
    try {
        const deletedMovie = await Movie.findByIdAndDelete(req.params.id);

        if (!deletedMovie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        return res.status(200).json({
            message: "Movie deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// ADD COMMENT
// =======================
// NOTE: This creates a TOP-LEVEL comment (parentCommentId = null).
exports.addComment = async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        movie.comments.push({
            userId: req.user.id,
            comment: req.body.comment,
            parentCommentId: null
        });

        await movie.save();

        return res.status(200).json({
            message: "comment added successfully",
            updatedMovie: movie
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// NEW: REPLY TO A COMMENT
// =======================
// NOTE: This creates a REPLY (nested comment) by setting parentCommentId.
// Route will provide:
// - movieId in req.params.movieId
// - parent comment id in req.params.commentId
exports.replyToComment = async (req, res) => {
    try {
        const { movieId, commentId } = req.params;

        const movie = await Movie.findById(movieId);

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        // Check if the parent comment exists inside the movie
        const parentComment = movie.comments.id(commentId);
        if (!parentComment) {
            return res.status(404).json({
                message: "Parent comment not found"
            });
        }

        movie.comments.push({
            userId: req.user.id,
            comment: req.body.comment,
            parentCommentId: parentComment._id
        });

        await movie.save();

        return res.status(200).json({
            message: "reply added successfully",
            updatedMovie: movie
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// HELPER: BUILD THREADED COMMENTS
// =======================
// NOTE: Converts a flat array of comments into a nested/threaded structure.
// Top-level comments are those with parentCommentId = null.
// Replies are attached under their parent in a "replies" array.
const buildThreadedComments = (comments) => {
    const map = new Map();

    // Convert mongoose subdocs to plain objects and add replies container
    const plain = comments.map(c => {
        const obj = c.toObject();
        obj.replies = [];
        return obj;
    });

    // Map by comment _id
    plain.forEach(c => {
        map.set(String(c._id), c);
    });

    // Attach replies to parents
    const roots = [];
    plain.forEach(c => {
        if (c.parentCommentId) {
            const parent = map.get(String(c.parentCommentId));
            if (parent) {
                parent.replies.push(c);
            } else {
                // If parent not found, treat as root to avoid losing data
                roots.push(c);
            }
        } else {
            roots.push(c);
        }
    });

    return roots;
};

// =======================
// GET COMMENTS
// =======================
// NOTE: Returns BOTH flat comments and threaded comments.
// This keeps backward compatibility for any frontend that expects a flat array.
exports.getComments = async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        const threadedComments = buildThreadedComments(movie.comments);

        return res.status(200).json({
            comments: movie.comments,           // flat
            threadedComments: threadedComments  // nested
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// NEW: EDIT COMMENT (OWNER OR ADMIN)
// =======================
// NOTE:
// - Admin can edit ANY comment.
// - Non-admin can ONLY edit their own comment.
exports.editComment = async (req, res) => {
    try {
        const { movieId, commentId } = req.params;
        const { comment } = req.body;

        const movie = await Movie.findById(movieId);

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        const targetComment = movie.comments.id(commentId);

        if (!targetComment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const isOwner = String(targetComment.userId) === String(req.user.id);
        const isAdmin = req.user.isAdmin === true;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "Access denied. You can only edit your own comment."
            });
        }

        targetComment.comment = comment;
        targetComment.isEdited = true;
        targetComment.editedAt = new Date();

        await movie.save();

        return res.status(200).json({
            message: "comment updated successfully",
            updatedMovie: movie
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =======================
// NEW: DELETE COMMENT (OWNER OR ADMIN)
// =======================
// NOTE:
// - Admin can delete ANY comment.
// - Non-admin can ONLY delete their own comment.
// - This performs a "cascade delete" of replies (descendants) to avoid orphaned threads.
exports.deleteComment = async (req, res) => {
    try {
        const { movieId, commentId } = req.params;

        const movie = await Movie.findById(movieId);

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        const targetComment = movie.comments.id(commentId);

        if (!targetComment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const isOwner = String(targetComment.userId) === String(req.user.id);
        const isAdmin = req.user.isAdmin === true;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "Access denied. You can only delete your own comment."
            });
        }

        // -------------------------------
        // Cascade delete: remove all replies
        // -------------------------------
        const idsToDelete = new Set([String(targetComment._id)]);

        // Find descendants iteratively
        let foundNew = true;
        while (foundNew) {
            foundNew = false;

            movie.comments.forEach(c => {
                if (c.parentCommentId && idsToDelete.has(String(c.parentCommentId)) && !idsToDelete.has(String(c._id))) {
                    idsToDelete.add(String(c._id));
                    foundNew = true;
                }
            });
        }

        // Keep only comments NOT in idsToDelete
        movie.comments = movie.comments.filter(c => !idsToDelete.has(String(c._id)));

        await movie.save();

        return res.status(200).json({
            message: "comment deleted successfully",
            updatedMovie: movie
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};