const express = require("express")
const router = express.Router()

const movieController = require("../controllers/movieController")
const auth = require("../auth")

// ===============================
// Public Routes
// ===============================
router.get("/getMovies", movieController.getMovies)
router.get("/getMovie/:id", movieController.getMovieById)
router.get("/getComments/:id", movieController.getComments)

// ===============================
// Admin-only Routes
// ===============================
router.get(
  "/admin/getAllComments",
  auth.verify,
  auth.verifyAdmin,
  movieController.getAllCommentsAdmin
)

router.post(
  "/addMovie",
  auth.verify,
  auth.verifyAdmin,
  movieController.addMovie
)

router.patch(
  "/updateMovie/:id",
  auth.verify,
  auth.verifyAdmin,
  movieController.updateMovie
)

router.delete(
  "/deleteMovie/:id",
  auth.verify,
  auth.verifyAdmin,
  movieController.deleteMovie
)

router.get(
  "/admin/dashboard",
  auth.verify,
  auth.verifyAdmin,
  movieController.getAdminDashboard
)

// ===============================
// Logged-in User Routes
// ===============================
router.patch(
  "/likeMovie/:id",
  auth.verify,
  movieController.toggleLikeMovie
)

router.patch(
  "/rateMovie/:id",
  auth.verify,
  movieController.rateMovie
)

router.patch(
  "/addComment/:id",
  auth.verify,
  movieController.addComment
)

router.patch(
  "/replyComment/:movieId/:commentId",
  auth.verify,
  movieController.replyToComment
)

router.patch(
  "/editComment/:movieId/:commentId",
  auth.verify,
  movieController.editComment
)

router.delete(
  "/deleteComment/:movieId/:commentId",
  auth.verify,
  movieController.deleteComment
)

router.patch(
  "/reactComment/:movieId/:commentId",
  auth.verify,
  movieController.reactToComment
)

// ===============================
// Watchlist (Logged-in)
// ===============================
router.patch(
  "/watchlist/:movieId",
  auth.verify,
  movieController.toggleWatchlist
)

router.get(
  "/watchlist",
  auth.verify,
  movieController.getWatchlist
)

module.exports = router