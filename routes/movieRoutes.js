const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");
const auth = require("../auth");

// ADMIN ONLY (token required + admin check inside controller)
router.post("/addMovie", auth.verify, movieController.addMovie);
router.patch("/updateMovie/:id", auth.verify, movieController.updateMovie);
router.delete("/deleteMovie/:id", auth.verify, movieController.deleteMovie);

// PUBLIC
router.get("/getMovies", movieController.getMovies);
router.get("/getMovie/:id", movieController.getMovieById);
router.get("/getComments/:id", movieController.getComments);

// AUTHENTICATED USERS
router.patch("/addComment/:id", auth.verify, movieController.addComment);

module.exports = router;