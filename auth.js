const jwt = require("jsonwebtoken");

// ===============================
// AUTH MIDDLEWARE: VERIFY TOKEN
// ===============================
// NOTE: This middleware checks if the request has a valid JWT token.
// It attaches the decoded user payload into `req.user` for use in protected routes.
exports.verify = (req, res, next) => {
    let token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    token = token.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid token"
        });
    }
};

// ===============================
// NEW MIDDLEWARE: VERIFY ADMIN
// ===============================
// NOTE: This middleware ensures the logged-in user is an admin.
// It must be used AFTER `exports.verify` because it depends on `req.user`.
exports.verifyAdmin = (req, res, next) => {
    // If somehow req.user is missing, treat as unauthorized.
    // (This also protects us if someone forgets to add `verify` before `verifyAdmin`.)
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    // Only admins can proceed.
    if (!req.user.isAdmin) {
        return res.status(403).json({
            message: "Access denied. Admins only."
        });
    }

    next();
};