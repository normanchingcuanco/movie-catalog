const jwt = require("jsonwebtoken")

// ===============================
// VERIFY TOKEN
// ===============================
const verify = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" })
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Invalid token format" })
    }

    const token = authHeader.split(" ")[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded

    next()

  } catch (error) {
    console.log("AUTH ERROR >>>", error.message)
    return res.status(401).json({ message: "Invalid token" })
  }
}

// ===============================
// VERIFY ADMIN
// ===============================
const verifyAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" })
  }

  next()
}

module.exports = {
  verify,
  verifyAdmin
}