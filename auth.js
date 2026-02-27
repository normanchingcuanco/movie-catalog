const jwt = require("jsonwebtoken")

// ===============================
// VERIFY TOKEN
// ===============================
const verify = (req, res, next) => {
  let token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    token = token.split(" ")[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" })
  }
}

// ===============================
// VERIFY ADMIN
// ===============================
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin === true) {
    return next()
  }
  return res.status(403).json({ message: "Admin access required" })
}

module.exports = {
  verify,
  verifyAdmin
}