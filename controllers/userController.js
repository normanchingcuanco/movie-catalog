const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// =======================
// REGISTER USER
// =======================
exports.register = async (req, res) => {
    try {
        const { email, password, isAdmin } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            email,
            password: hashedPassword,
            isAdmin: isAdmin || false
        });

        return res.status(201).json({
            message: "Registered Successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};


// =======================
// LOGIN USER
// =======================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        // Generate token
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // 🔥 UPDATED RESPONSE
        return res.status(200).json({
            access: token,
            user: {
                _id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};