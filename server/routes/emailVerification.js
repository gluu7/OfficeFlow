
const express = require("express");
const crypto = require("crypto");
const { Resend } = require("resend");
const pool = require("../config/database");

const router = express.Router();

const TOKEN_EXPIRATION_MINUTES = 30;
const RESEND_COOLDOWN_SECONDS = 60;

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

async function sendVerificationEmail(user) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured.");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `DELETE FROM email_verification_tokens
             WHERE user_id = $1`,
            [user.user_id]
        );

        await client.query(
            `INSERT INTO email_verification_tokens
                (user_id, token_hash, expires_at)
             VALUES (
                $1,
                $2,
                NOW() + INTERVAL '30 minutes'
             )`,
            [user.user_id, tokenHash]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const baseUrl =
        process.env.CLIENT_URL || "http://localhost:5173";

    const verificationUrl =
        `${baseUrl}/verify-email?token=${token}`;

    const { error } = await resend.emails.send({
        from:
            process.env.RESEND_FROM_EMAIL ||
            "OfficeFlow <onboarding@resend.dev>",
        to: user.email,
        subject: "Verify your OfficeFlow email",
        text:
            `Hello ${user.display_name},\n\n` +
            "Please verify your OfficeFlow email address:\n\n" +
            `${verificationUrl}\n\n` +
            `This link expires in ${TOKEN_EXPIRATION_MINUTES} minutes.\n\n` +
            "If you did not request this, ignore this email."
    });

    if (error) {
        console.error("Resend error:", error);
        throw new Error("Email delivery request failed.");
    }
}

/* =========================
   REQUEST VERIFICATION
========================= */

router.post("/send", async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({
            success: false,
            message: "Please sign in first."
        });
    }

    try {
        const result = await pool.query(
            `SELECT
                user_id,
                display_name,
                email,
                email_verified
             FROM users
             WHERE user_id = $1`,
            [req.session.userId]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Account not found."
            });
        }

        if (user.email_verified) {
            return res.json({
                success: true,
                message: "Your email is already verified."
            });
        }

        const previous = await pool.query(
            `SELECT created_at
             FROM email_verification_tokens
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [user.user_id]
        );

        if (previous.rows.length > 0) {
            const elapsed =
                (Date.now() -
                    new Date(previous.rows[0].created_at).getTime()) /
                1000;

            if (elapsed < RESEND_COOLDOWN_SECONDS) {
                return res.status(429).json({
                    success: false,
                    message:
                        "Please wait one minute before requesting another email."
                });
            }
        }

        await sendVerificationEmail(user);

        return res.json({
            success: true,
            message:
                "Verification email requested. Check your inbox."
        });
    } catch (error) {
        console.error("Verification email error:", error);

        return res.status(500).json({
            success: false,
            message:
                "Unable to send verification email. Check your Resend configuration."
        });
    }
});

/* =========================
   VERIFY EMAIL
========================= */

router.post("/confirm", async (req, res) => {
    const { token } = req.body || {};

    if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/.test(token)
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid verification link."
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `DELETE FROM email_verification_tokens
             WHERE token_hash = $1
               AND expires_at > NOW()
             RETURNING user_id`,
            [hashToken(token)]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "This verification link is invalid, expired, or already used."
            });
        }

        const userId = result.rows[0].user_id;

        await client.query(
            `UPDATE users
             SET email_verified = TRUE
             WHERE user_id = $1`,
            [userId]
        );

        await client.query(
            `DELETE FROM email_verification_tokens
             WHERE user_id = $1`,
            [userId]
        );

        await client.query("COMMIT");

        return res.json({
            success: true,
            message: "Your email has been verified successfully."
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Email confirmation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify email."
        });
    } finally {
        client.release();
    }
});

module.exports = {
    router,
    sendVerificationEmail
};
