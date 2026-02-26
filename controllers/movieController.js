const Movie = require("../models/Movie");

// =========================
// ADD MOVIE (ADMIN ONLY)
// =========================
exports.addMovie = async (req, res) => {
    try {

        if (!req.user.isAdmin) {
            return res.status(403).json({
                message: "Access forbidden"
            });
        }

        const movie = await Movie.create({
            ...req.body,
            comments: []
        });

        return res.status(201).json(movie);

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =========================
// GET ALL MOVIES (PUBLIC)
// =========================
exports.getMovies = async (req, res) => {
    try {
        const movies = await Movie.find();
        return res.status(200).json({ movies });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

// =========================
// GET MOVIE BY ID (PUBLIC)
// =========================
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

// =========================
// UPDATE MOVIE (ADMIN ONLY)
// =========================
exports.updateMovie = async (req, res) => {
    try {

        if (!req.user.isAdmin) {
            return res.status(403).json({
                message: "Access forbidden"
            });
        }

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

// =========================
// DELETE MOVIE (ADMIN ONLY)
// =========================
exports.deleteMovie = async (req, res) => {
    try {

        if (!req.user.isAdmin) {
            return res.status(403).json({
                message: "Access forbidden"
            });
        }

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

// =========================
// ADD COMMENT (AUTHENTICATED USER)
// =========================
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
            comment: req.body.comment
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

// =========================
// GET COMMENTS
// =========================
exports.getComments = async (req, res) => {
    try {

        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        return res.status(200).json({
            comments: movie.comments
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};