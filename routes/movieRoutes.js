const express = require("express")
const router = express.Router()

const movieController = require("../controllers/movieController")
const auth = require("../auth")
console.log("getAllMoviesAdmin >>>", movieController.getAllMoviesAdmin)
console.log("auth >>>", auth)


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

router.get(
  "/admin/dashboard",
  auth.verify,
  auth.verifyAdmin,
  movieController.getAdminDashboard
)

router.get(
  "/admin/getAllMovies",
  auth.verify,
  auth.verifyAdmin,
  movieController.getAllMoviesAdmin
)

// ===============================
// Community Movie Routes
// ===============================

// Any logged-in user can add movies
router.post(
  "/addMovie",
  auth.verify,
  movieController.addMovie
)

// 🔥 Updated: Creator OR Admin can update
router.patch(
  "/updateMovie/:id",
  auth.verify,
  movieController.updateMovie
)

// 🔥 Updated: Creator OR Admin can delete
router.delete(
  "/deleteMovie/:id",
  auth.verify,
  movieController.deleteMovie
)

// ===============================
// Logged-in User Routes
// ===============================
router.patch("/likeMovie/:id", auth.verify, movieController.toggleLikeMovie)
router.patch("/rateMovie/:id", auth.verify, movieController.rateMovie)

router.patch("/addComment/:id", auth.verify, movieController.addComment)
router.patch("/replyComment/:movieId/:commentId", auth.verify, movieController.replyToComment)
router.patch("/editComment/:movieId/:commentId", auth.verify, movieController.editComment)
router.delete("/deleteComment/:movieId/:commentId", auth.verify, movieController.deleteComment)
router.patch("/reactComment/:movieId/:commentId", auth.verify, movieController.reactToComment)

// ===============================
// Watchlist
// ===============================
router.patch("/watchlist/:movieId", auth.verify, movieController.toggleWatchlist)
router.get("/watchlist", auth.verify, movieController.getWatchlist)

module.exports = router