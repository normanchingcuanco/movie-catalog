const mongoose = require("mongoose")

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
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
)

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

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    director: { type: String },
    year: { type: Number },
    description: { type: String },
    genre: { type: String },
    posterUrl: { type: String, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    ratings: [ratingSchema],

    averageRating: {
      type: Number,
      default: 0
    },

    comments: [commentSchema]
  },
  { timestamps: true }
)

movieSchema.index({ title: 1, year: 1 }, { unique: true })

module.exports = mongoose.model("Movie", movieSchema)