require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const movieRoutes = require("./routes/movieRoutes");

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// DATABASE CONNECTION
// ===============================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Connection Error:", err));

// ===============================
// ROUTES
// ===============================
app.use("/users", userRoutes);
app.use("/movies", movieRoutes);

// ===============================
// TEST ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
    res.send("s84 Movie Catalog API is running");
});

// ===============================
// SERVER START
// ===============================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});