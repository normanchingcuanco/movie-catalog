const Movie = require("../models/Movie");

// =======================
// ADD MOVIE
// =======================
exports.addMovie = async (req, res) => {
  try {
    const { title, director, year, description, genre } = req.body;

    const existingMovie = await Movie.findOne({ title, year });

    if (existingMovie) {
      return res.status(400).json({
        message: "Movie already exists"
      });
    }

    const newMovie = await Movie.create({
      title,
      director,
      year,
      description,
      genre
    });

    return res.status(201).json(newMovie);

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Movie already exists"
      });
    }

    return res.status(500).json({
      message: "Server error"
    });
  }
};

// =======================
// GET ALL MOVIES
// =======================
exports.getMovies = async (req, res) => {
  try {
    const movies = await Movie.find();

    return res.status(200).json({ movies });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// GET MOVIE BY ID
// =======================
exports.getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    return res.status(200).json(movie);

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// UPDATE MOVIE
// =======================
exports.updateMovie = async (req, res) => {
  try {
    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    return res.status(200).json({
      message: "Movie updated successfully",
      updatedMovie
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// DELETE MOVIE
// =======================
exports.deleteMovie = async (req, res) => {
  try {
    const deletedMovie = await Movie.findByIdAndDelete(req.params.id);

    if (!deletedMovie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    return res.status(200).json({
      message: "Movie deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// ADD COMMENT
// =======================
exports.addComment = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    movie.comments.push({
      userId: req.user.id,
      comment: req.body.comment,
      parentCommentId: null
    });

    await movie.save();

    return res.status(200).json({
      message: "Comment added successfully",
      updatedMovie: movie
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// REPLY TO COMMENT
// =======================
exports.replyToComment = async (req, res) => {
  try {
    const { movieId, commentId } = req.params;

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const parentComment = movie.comments.id(commentId);

    if (!parentComment) {
      return res.status(404).json({ message: "Parent comment not found" });
    }

    movie.comments.push({
      userId: req.user.id,
      comment: req.body.comment,
      parentCommentId: parentComment._id
    });

    await movie.save();

    return res.status(200).json({
      message: "Reply added successfully",
      updatedMovie: movie
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// BUILD THREADED COMMENTS
// =======================
const buildThreadedComments = (comments) => {
  const map = new Map();

  const plain = comments.map(c => {
    const obj = c.toObject();
    obj.replies = [];
    return obj;
  });

  plain.forEach(c => {
    map.set(String(c._id), c);
  });

  const roots = [];

  plain.forEach(c => {
    if (c.parentCommentId) {
      const parent = map.get(String(c.parentCommentId));
      if (parent) {
        parent.replies.push(c);
      } else {
        roots.push(c);
      }
    } else {
      roots.push(c);
    }
  });

  return roots;
};

// =======================
// GET COMMENTS (POPULATED VERSION)
// =======================
exports.getComments = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
      .populate("comments.userId", "email isAdmin");

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const threadedComments = buildThreadedComments(movie.comments);

    return res.status(200).json({
      comments: movie.comments,
      threadedComments
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// EDIT COMMENT
// =======================
exports.editComment = async (req, res) => {
  try {
    const { movieId, commentId } = req.params;
    const { comment } = req.body;

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const targetComment = movie.comments.id(commentId);

    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isOwner = String(targetComment.userId) === String(req.user.id);
    const isAdmin = req.user.isAdmin === true;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Access denied."
      });
    }

    targetComment.comment = comment;
    targetComment.isEdited = true;
    targetComment.editedAt = new Date();

    await movie.save();

    return res.status(200).json({
      message: "Comment updated successfully",
      updatedMovie: movie
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// =======================
// DELETE COMMENT
// =======================
exports.deleteComment = async (req, res) => {
  try {
    const { movieId, commentId } = req.params;

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const targetComment = movie.comments.id(commentId);

    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isOwner = String(targetComment.userId) === String(req.user.id);
    const isAdmin = req.user.isAdmin === true;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Access denied."
      });
    }

    const idsToDelete = new Set([String(targetComment._id)]);

    let foundNew = true;
    while (foundNew) {
      foundNew = false;

      movie.comments.forEach(c => {
        if (
          c.parentCommentId &&
          idsToDelete.has(String(c.parentCommentId)) &&
          !idsToDelete.has(String(c._id))
        ) {
          idsToDelete.add(String(c._id));
          foundNew = true;
        }
      });
    }

    movie.comments = movie.comments.filter(
      c => !idsToDelete.has(String(c._id))
    );

    await movie.save();

    return res.status(200).json({
      message: "Comment deleted successfully",
      updatedMovie: movie
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};