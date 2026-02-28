// backend/controllers/movieController.js

const Movie = require("../models/Movie")
const User = require("../models/User")
const axios = require("axios")
const mongoose = require("mongoose")

// ===============================
// Helpers
// ===============================

// Builds nested/threaded comment structure from a flat list
const buildThreadedComments = (comments) => {
  const map = new Map()
  const roots = []

  const cloned = comments.map((c) => {
    const obj = typeof c.toObject === "function" ? c.toObject() : { ...c }
    obj.replies = []
    return obj
  })

  for (const c of cloned) {
    map.set(String(c._id), c)
  }

  for (const c of cloned) {
    if (c.parentCommentId) {
      const parent = map.get(String(c.parentCommentId))
      if (parent) parent.replies.push(c)
      else roots.push(c)
    } else {
      roots.push(c)
    }
  }

  return roots
}

// Collect all descendant comment IDs for cascade delete (parent + children + deeper)
const collectDescendants = (comments, parentId) => {
  const childrenByParent = new Map()

  for (const c of comments) {
    const p = c.parentCommentId ? String(c.parentCommentId) : null
    if (!childrenByParent.has(p)) childrenByParent.set(p, [])
    childrenByParent.get(p).push(String(c._id))
  }

  const ids = []
  const stack = [String(parentId)]

  while (stack.length) {
    const current = stack.pop()
    ids.push(current)

    const kids = childrenByParent.get(current) || []
    for (const kid of kids) stack.push(kid)
  }

  return ids
}

// Safe numeric parse
const toNumber = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// ===============================
// ADD MOVIE (AUTO OMDb FETCH) - logged-in users
// ===============================
exports.addMovie = async (req, res) => {
  try {
    const { title } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Movie title is required." })
    }

    if (!process.env.OMDB_API_KEY) {
      console.log("ADD MOVIE ERROR >>> OMDB_API_KEY missing in environment")
      return res.status(500).json({ message: "OMDB_API_KEY is not set on the server." })
    }

    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(
      title.trim()
    )}&apikey=${process.env.OMDB_API_KEY}`

    const omdbRes = await axios.get(url)

    if (!omdbRes?.data) {
      console.log("ADD MOVIE ERROR >>> No data from OMDb")
      return res.status(500).json({ message: "No response from OMDb." })
    }

    if (omdbRes.data.Response === "False") {
      return res.status(404).json({ message: omdbRes.data.Error || "Movie not found in OMDb." })
    }

    const data = omdbRes.data
    const parsedYear = parseInt(data.Year, 10)
    const year = Number.isFinite(parsedYear) ? parsedYear : undefined

    const created = await Movie.create({
      title: data.Title,
      director: data.Director,
      year,
      description: data.Plot,
      genre: data.Genre,
      posterUrl: data.Poster,
      createdBy: req.user.id
    })

    return res.status(201).json({ message: "Movie added successfully", movie: created })
  } catch (error) {
    console.log("ADD MOVIE ERROR >>>", error?.message)
    console.log("ADD MOVIE ERROR FULL >>>", error)

    if (error.code === 11000) {
      return res.status(400).json({ message: "Movie already exists (same title and year)." })
    }

    const msg =
      error?.response?.data?.Error ||
      error?.response?.data?.message ||
      error?.message ||
      "Server error"

    return res.status(500).json({ message: msg })
  }
}

// ===============================
// GET ALL MOVIES (SEARCH + FILTER + PAGINATION + SORT)
// ===============================
exports.getMovies = async (req, res) => {
  try {
    const search = (req.query.search || "").trim()
    const genre = (req.query.genre || "").trim()
    const page = Math.max(1, toNumber(req.query.page, 1))
    const limit = Math.min(50, Math.max(1, toNumber(req.query.limit, 10)))
    const sort = (req.query.sort || "").trim()

    const query = {}

    if (search) {
      query.title = { $regex: search, $options: "i" }
    }

    if (genre) {
      query.genre = { $regex: genre, $options: "i" }
    }

    const skip = (page - 1) * limit

    let movies = await Movie.find(query).skip(skip).limit(limit)

    if (sort === "highestRated") {
      movies = movies.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    } else if (sort === "mostLiked") {
      movies = movies.sort((a, b) => (b.likes?.length || 0) - (b.likes?.length || 0))
    } else if (sort === "trending") {
      movies = movies.sort((a, b) => {
        const scoreA = (a.averageRating || 0) * 2 + (a.likes?.length || 0)
        const scoreB = (b.averageRating || 0) * 2 + (b.likes?.length || 0)
        return scoreB - scoreA
      })
    } else {
      movies = movies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    const total = await Movie.countDocuments(query)

    return res.status(200).json({
      totalResults: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      movies
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// GET SINGLE MOVIE
// ===============================
exports.getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    return res.status(200).json({ movie })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// UPDATE MOVIE (CREATOR OR ADMIN)
// ===============================
exports.updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" })
    }

    const isOwner = String(movie.createdBy) === String(req.user.id)
    const isAdmin = req.user.isAdmin === true

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    Object.assign(movie, req.body)
    await movie.save()

    return res.status(200).json({ message: "Movie updated successfully", movie })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Movie already exists (same title and year)." })
    }
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// DELETE MOVIE (CREATOR OR ADMIN)
// ===============================
exports.deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" })
    }

    const isOwner = String(movie.createdBy) === String(req.user.id)
    const isAdmin = req.user.isAdmin === true

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    await Movie.findByIdAndDelete(req.params.id)

    return res.status(200).json({ message: "Movie deleted successfully" })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// LIKE / UNLIKE MOVIE (TOGGLE)
// ===============================
exports.toggleLikeMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" })
    }

    const userId = req.user.id
    const alreadyLiked = movie.likes.some((id) => String(id) === String(userId))

    if (alreadyLiked) {
      movie.likes = movie.likes.filter((id) => String(id) !== String(userId))
    } else {
      movie.likes.push(userId)
    }

    await movie.save()

    return res.status(200).json({
      message: alreadyLiked ? "Movie unliked" : "Movie liked",
      totalLikes: movie.likes.length
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// RATE MOVIE (1-5)
// ===============================
exports.rateMovie = async (req, res) => {
  try {
    const value = toNumber(req.body.value, 0)
    const movieId = req.params.id
    const userId = req.user.id

    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" })
    }

    const movie = await Movie.findById(movieId)
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    const existing = movie.ratings.find((r) => String(r.userId) === String(userId))

    if (existing) {
      existing.value = value
    } else {
      movie.ratings.push({ userId, value })
    }

    const total = movie.ratings.reduce((sum, r) => sum + (r.value || 0), 0)
    movie.averageRating = movie.ratings.length ? total / movie.ratings.length : 0

    await movie.save()

    return res.status(200).json({
      message: "Rating submitted",
      averageRating: Number(movie.averageRating.toFixed(2)),
      totalRatings: movie.ratings.length
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// GET COMMENTS (THREADED + POPULATE USERNAME)
// ===============================
exports.getComments = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).populate("comments.userId", "username")
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    const threadedComments = buildThreadedComments(movie.comments)

    return res.status(200).json({
      comments: movie.comments,
      threadedComments
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// ADD TOP-LEVEL COMMENT
// ===============================
exports.addComment = async (req, res) => {
  try {
    const comment = (req.body.comment || "").trim()
    if (!comment) {
      return res.status(400).json({ message: "Comment is required." })
    }

    const movie = await Movie.findById(req.params.id)
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    movie.comments.push({
      userId: req.user.id,
      comment,
      parentCommentId: null
    })

    await movie.save()

    return res.status(200).json({ message: "Comment added" })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// REPLY TO COMMENT
// ===============================
exports.replyToComment = async (req, res) => {
  try {
    const comment = (req.body.comment || "").trim()
    const { movieId, commentId } = req.params

    if (!comment) {
      return res.status(400).json({ message: "Reply is required." })
    }

    const movie = await Movie.findById(movieId)
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    const parent = movie.comments.id(commentId)
    if (!parent) return res.status(404).json({ message: "Parent comment not found" })

    movie.comments.push({
      userId: req.user.id,
      comment,
      parentCommentId: parent._id
    })

    await movie.save()

    return res.status(200).json({ message: "Reply added" })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// EDIT COMMENT (OWNER OR ADMIN)
// ===============================
exports.editComment = async (req, res) => {
  try {
    const comment = (req.body.comment || "").trim()
    const { movieId, commentId } = req.params

    if (!comment) {
      return res.status(400).json({ message: "Comment is required." })
    }

    const movie = await Movie.findById(movieId)
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    const target = movie.comments.id(commentId)
    if (!target) return res.status(404).json({ message: "Comment not found" })

    const isOwner = String(target.userId) === String(req.user.id)
    const isAdmin = req.user.isAdmin === true

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    target.comment = comment
    target.isEdited = true
    target.editedAt = new Date()

    await movie.save()

    return res.status(200).json({ message: "Comment updated" })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// DELETE COMMENT (OWNER OR ADMIN) + CASCADE DELETE
// ===============================
exports.deleteComment = async (req, res) => {
  try {
    const { movieId, commentId } = req.params

    const movie = await Movie.findById(movieId)
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    const target = movie.comments.id(commentId)
    if (!target) return res.status(404).json({ message: "Comment not found" })

    const isOwner = String(target.userId) === String(req.user.id)
    const isAdmin = req.user.isAdmin === true

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    const idsToDelete = collectDescendants(movie.comments, commentId)
    movie.comments = movie.comments.filter((c) => !idsToDelete.includes(String(c._id)))

    await movie.save()

    return res.status(200).json({ message: "Comment deleted" })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// LIKE / DISLIKE COMMENT (PREVENT DUPES)
// ===============================
exports.reactToComment = async (req, res) => {
  try {
    const { movieId, commentId } = req.params
    const { type } = req.body
    const userId = req.user.id

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({ message: "Invalid reaction type" })
    }

    const movie = await Movie.findById(movieId)
    if (!movie) return res.status(404).json({ message: "Movie not found" })

    const comment = movie.comments.id(commentId)
    if (!comment) return res.status(404).json({ message: "Comment not found" })

    comment.likes = comment.likes.filter((id) => String(id) !== String(userId))
    comment.dislikes = comment.dislikes.filter((id) => String(id) !== String(userId))

    if (type === "like") comment.likes.push(userId)
    if (type === "dislike") comment.dislikes.push(userId)

    await movie.save()

    return res.status(200).json({
      message: "Reaction updated",
      likes: comment.likes.length,
      dislikes: comment.dislikes.length
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// GET ALL COMMENTS (ADMIN EXTRACTION)
// ===============================
exports.getAllCommentsAdmin = async (req, res) => {
  try {
    const movies = await Movie.find().populate("comments.userId", "username")
    const allComments = []

    movies.forEach((movie) => {
      movie.comments.forEach((comment) => {
        allComments.push({
          movieId: movie._id,
          movieTitle: movie.title,
          commentId: comment._id,
          username: comment.userId?.username || "Unknown",
          comment: comment.comment,
          parentCommentId: comment.parentCommentId,
          likes: comment.likes.length,
          dislikes: comment.dislikes.length,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt
        })
      })
    })

    return res.status(200).json({ totalComments: allComments.length, comments: allComments })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// TOGGLE WATCHLIST (NO user.save validation issues)
// ===============================
exports.toggleWatchlist = async (req, res) => {
  try {
    const userId = req.user.id
    const movieId = req.params.movieId

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ message: "Invalid movie ID" })
    }

    const movie = await Movie.findById(movieId)
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" })
    }

    const user = await User.findById(userId).select("watchlist")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const exists = (user.watchlist || []).some((id) => String(id) === String(movieId))

    if (exists) {
      await User.updateOne({ _id: userId }, { $pull: { watchlist: movieId } })
    } else {
      await User.updateOne({ _id: userId }, { $addToSet: { watchlist: movieId } })
    }

    const updated = await User.findById(userId).select("watchlist")
    const totalWatchlist = updated?.watchlist?.length || 0

    return res.status(200).json({
      message: exists ? "Removed from watchlist" : "Added to watchlist",
      totalWatchlist
    })
  } catch (error) {
    console.log("WATCHLIST ERROR >>>", error)
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// GET WATCHLIST
// ===============================
exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("watchlist")
    if (!user) return res.status(404).json({ message: "User not found" })

    return res.status(200).json({ total: user.watchlist.length, watchlist: user.watchlist })
  } catch (error) {
    console.log("GET WATCHLIST ERROR >>>", error)
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// ADMIN DASHBOARD DATA
// ===============================
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalMovies = await Movie.countDocuments()

    const movies = await Movie.find()

    let totalComments = 0
    let totalRatings = 0
    let totalMovieLikes = 0

    movies.forEach((movie) => {
      totalComments += movie.comments.length
      totalRatings += movie.ratings.length
      totalMovieLikes += movie.likes.length
    })

    return res.status(200).json({
      totalUsers,
      totalMovies,
      totalComments,
      totalRatings,
      totalMovieLikes
    })
  } catch (error) {
    console.log("ADMIN DASHBOARD ERROR >>>", error)
    return res.status(500).json({ message: "Server error" })
  }
}

// ===============================
// ADMIN - GET ALL MOVIES (NO PAGINATION)
// ===============================
exports.getAllMoviesAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.isAdmin !== true) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    const movies = await Movie.find({})

    return res.status(200).json({ movies })
  } catch (error) {
    console.log("ADMIN GET ALL MOVIES ERROR >>>", error)
    return res.status(500).json({ message: "Server error" })
  }
}