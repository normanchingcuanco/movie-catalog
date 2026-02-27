const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");
const auth = require("../auth");

// ===============================
// MOVIE ROUTES
// ===============================

// -------------------------------
// ADMIN-ONLY MOVIE MANAGEMENT
// -------------------------------

// Add Movie (Admin only)
router.post(
    "/addMovie",
    auth.verify,
    auth.verifyAdmin,
    movieController.addMovie
);

// Update Movie (Admin only)
router.patch(
    "/updateMovie/:id",
    auth.verify,
    auth.verifyAdmin,
    movieController.updateMovie
);

// Delete Movie (Admin only)
router.delete(
    "/deleteMovie/:id",
    auth.verify,
    auth.verifyAdmin,
    movieController.deleteMovie
);

// -------------------------------
// PUBLIC MOVIE ROUTES
// -------------------------------

router.get("/getMovies", movieController.getMovies);
router.get("/getMovie/:id", movieController.getMovieById);

// -------------------------------
// COMMENT ROUTES
// -------------------------------

// Add top-level comment
router.patch(
    "/addComment/:id",
    auth.verify,
    movieController.addComment
);

// Reply to comment (nested)
router.patch(
    "/replyComment/:movieId/:commentId",
    auth.verify,
    movieController.replyToComment
);

// Edit comment (owner OR admin)
router.patch(
    "/editComment/:movieId/:commentId",
    auth.verify,
    movieController.editComment
);

// Delete comment (owner OR admin)
router.delete(
    "/deleteComment/:movieId/:commentId",
    auth.verify,
    movieController.deleteComment
);

// Get comments (public)
router.get("/getComments/:id", movieController.getComments);

module.exports = router;