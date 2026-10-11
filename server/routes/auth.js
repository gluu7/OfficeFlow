
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/database");
const {
    sendVerificationEmail
} = require("./emailVerification");

const router = express.Router();

router.post("/signup", async (req, res) => {
    try {
        const { name, email, password, schoolId, role } =
            req.body || {};

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter your name."
            });
        }

        const cleanName = name.trim();

        if (cleanName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must be 100 characters or fewer."
            });
        }

        if (typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        if (
            cleanEmail.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        if (Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({
                success: false,
                message: "Password is too long."
            });
        }

        const selectedSchoolId = Number(schoolId);

        if (
            !Number.isSafeInteger(selectedSchoolId) ||
            selectedSchoolId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Please select a school."
            });
        }

        if (!["student", "instructor"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Please select Student or Instructor."
            });
        }

        const existingUser = await pool.query(
            "SELECT user_id FROM users WHERE LOWER(email) = $1",
            [cleanEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const school = await pool.query(
            "SELECT school_id FROM schools WHERE school_id = $1",
            [selectedSchoolId]
        );

        if (school.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected school does not exist."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (
                school_id,
                email,
                display_name,
                role,
                is_verified,
                password_hash
             )
             VALUES ($1, $2, $3, $4, FALSE, $5)
             RETURNING
                user_id,
                school_id,
                email,
                display_name,
                role,
                is_verified,
                email_verified,
                verification_status`,
            [
                selectedSchoolId,
                cleanEmail,
                cleanName,
                role,
                passwordHash
            ]
        );

        const user = result.rows[0];
        let verificationEmailSent = false;

        try {
            await sendVerificationEmail(user);
            verificationEmailSent = true;
        } catch (error) {
            console.error(
                "Signup verification email failed:",
                error.message
            );
        }

        return res.status(201).json({
            success: true,
            message: verificationEmailSent
                ? "Account created. Check your email to verify it."
                : "Account created. Sign in to request a verification email.",
            verificationEmailSent,
            user
        });
    } catch (error) {
        console.error("Signup error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create account."
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const result = await pool.query(
            `SELECT
                user_id,
                school_id,
                email,
                display_name,
                role,
                is_verified,
                email_verified,
                verification_status,
                password_hash
             FROM users
             WHERE LOWER(email) = $1`,
            [email.trim().toLowerCase()]
        );

        const user = result.rows[0];

        if (
            !user ||
            !user.password_hash ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({
                    success: false,
                    message: "Unable to start session."
                });
            }

            req.session.userId = user.user_id;

            req.session.save((saveError) => {
                if (saveError) {
                    return res.status(500).json({
                        success: false,
                        message: "Unable to save session."
                    });
                }

                return res.json({
                    success: true,
                    message: "Logged in successfully.",
                    user: {
                        user_id: user.user_id,
                        school_id: user.school_id,
                        email: user.email,
                        display_name: user.display_name,
                        role: user.role,
                        is_verified: user.is_verified,
                        email_verified: user.email_verified,
                        verification_status: user.verification_status
                    }
                });
            });
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to log in."
        });
    }
});

router.get("/me", async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({
            success: false,
            message: "Not logged in."
        });
    }

    try {
        const result = await pool.query(
            `SELECT
                user_id,
                school_id,
                email,
                display_name,
                role,
                is_verified,
                email_verified,
                verification_status
             FROM users
             WHERE user_id = $1`,
            [req.session.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Account not found."
            });
        }

        return res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error("Session lookup error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to load account."
        });
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Unable to log out."
            });
        }

        res.clearCookie("officeflow.sid", {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: false
        });

        return res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});

module.exports = router;
