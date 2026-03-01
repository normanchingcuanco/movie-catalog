const User = require("../models/User")
const Movie = require("../models/Movie")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

// ===============================
// REGISTER
// ===============================
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    const normalizedEmail = email.toLowerCase()

    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      username,
      email: normalizedEmail,
      password: hashedPassword
    })

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    })

  } catch (error) {
    console.error("REGISTER ERROR >>>", error)
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// LOGIN
// ===============================
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body

    console.log("REQ BODY >>>", req.body)

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    if (typeof email !== "string") {
      email = String(email)
    }

    const normalizedEmail = email.trim().toLowerCase()

    const user = await User.findOne({ email: normalizedEmail })

    console.log("USER FOUND >>>", user)

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)

    console.log("PASSWORD MATCH >>>", isPasswordCorrect)

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    return res.status(200).json({
      access: token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    })

  } catch (error) {
    console.error("LOGIN ERROR >>>", error)
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// TOGGLE WATCHLIST
// ===============================
exports.toggleWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    const movieId = req.params.movieId
    const exists = user.watchlist.includes(movieId)

    if (exists) {
      user.watchlist = user.watchlist.filter(
        (id) => String(id) !== String(movieId)
      )
    } else {
      user.watchlist.push(movieId)
    }

    await user.save()

    return res.status(200).json({
      message: exists
        ? "Removed from watchlist"
        : "Added to watchlist",
      totalWatchlist: user.watchlist.length
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// GET MY WATCHLIST
// ===============================
exports.getMyWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("watchlist")

    if (!user) return res.status(404).json({ message: "User not found" })

    return res.status(200).json({
      watchlist: user.watchlist
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}