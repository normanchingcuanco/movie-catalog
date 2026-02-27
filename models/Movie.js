const mongoose = require("mongoose");

// ===============================
// COMMENT SCHEMA
// ===============================
// NOTE: This schema represents a comment under a movie.
// Existing fields:
// - userId: which user posted the comment
// - comment: the comment text
//
// NEW FIELDS ADDED FOR COMMENT ENHANCEMENTS:
// - parentCommentId: allows nested/threaded replies (null = top-level comment)
// - isEdited: indicates the comment was edited
// - editedAt: timestamp of last edit
const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    comment: {
        type: String
    },

    // ===============================
    // NEW: NESTED COMMENTS SUPPORT
    // ===============================
    // NOTE: If parentCommentId is null -> this is a top-level comment.
    // If parentCommentId has a value -> this is a reply to another comment.
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    // ===============================
    // NEW: EDIT TRACKING
    // ===============================
    // NOTE: Used for "Edit Own Comment" and "Admin Edit Any Comment".
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const movieSchema = new mongoose.Schema({
    title: String,
    director: String,
    year: Number,
    description: String,
    genre: String,
    comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model("Movie", movieSchema);