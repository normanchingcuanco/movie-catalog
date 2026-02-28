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
      return res.status(400).json({ message: "All fields are required." })
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        message: "Username or email already exists"
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword
    })

    return res.status(201).json({
      message: "Registered Successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// LOGIN
// ===============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Safety check in case password field is missing
    if (!user.password) {
      console.error("User has no password field:", user)
      return res.status(500).json({ message: "User record corrupted" })
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Ensure JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in environment variables")
      return res.status(500).json({ message: "Server configuration error" })
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
    return res.status(500).json({
      message: "Server error",
      error: error.message
    })
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