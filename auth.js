const jwt = require("jsonwebtoken");

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