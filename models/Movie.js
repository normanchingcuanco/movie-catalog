const mongoose = require("mongoose")

// ===============================
// COMMENT SCHEMA
// ===============================
const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    comment: {
      type: String,
      required: true,
      trim: true
    },

    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    isEdited: {
      type: Boolean,
      default: false
    },

    editedAt: {
      type: Date,
      default: null
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true }
)

// ===============================
// RATING SCHEMA
// ===============================
const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  { timestamps: true }
)

// ===============================
// MOVIE SCHEMA
// ===============================
const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    director: {
      type: String,
      trim: true
    },

    year: {
      type: Number
    },

    description: {
      type: String,
      trim: true
    },

    genre: {
      type: String,
      trim: true
    },

    posterUrl: {
      type: String,
      default: null
    },

    // ===============================
    // ENGAGEMENT
    // ===============================

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    ratings: [ratingSchema],

    averageRating: {
      type: Number,
      default: 0
    },

    // ===============================
    // COMMENTS
    // ===============================

    comments: [commentSchema]
  },
  { timestamps: true }
)

// ===============================
// INDEXES (Performance Optimization)
// ===============================

// Prevent duplicate movies (title + year)
movieSchema.index({ title: 1, year: 1 }, { unique: true })

// Faster search by title
movieSchema.index({ title: "text" })

// Faster genre filter
movieSchema.index({ genre: 1 })

// Faster sorting by rating
movieSchema.index({ averageRating: -1 })

module.exports = mongoose.model("Movie", movieSchema)