const express = require("express")
const router = express.Router()
const userController = require("../controllers/userController")
const { verify } = require("../auth")

router.post("/register", userController.register)
router.post("/login", userController.login)

// 📌 WATCHLIST
router.patch("/watchlist/:movieId", verify, userController.toggleWatchlist)
router.get("/watchlist", verify, userController.getMyWatchlist)

module.exports = router