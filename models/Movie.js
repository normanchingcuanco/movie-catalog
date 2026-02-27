const mongoose = require("mongoose");

// ===============================
// COMMENT SCHEMA
// ===============================
const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    comment: {
        type: String,
        required: true
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
    }
}, { timestamps: true });

// ===============================
// MOVIE SCHEMA
// ===============================
const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  director: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    required: true
  },

  // 🔥 IMPORTANT: Attach comments here
  comments: [commentSchema]

}, { timestamps: true });

// Unique compound index
movieSchema.index({ title: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Movie", movieSchema);