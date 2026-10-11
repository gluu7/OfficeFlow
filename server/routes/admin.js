
const express = require("express");
const pool = require("../config/database");

const router = express.Router();

/* =========================
   ADMIN AUTHENTICATION
========================= */

async function requireAdmin(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({
            success: false,
            message: "Please log in."
        });
    }

    try {
        const result = await pool.query(
            `SELECT role
             FROM users
             WHERE user_id = $1`,
            [req.session.userId]
        );

        if (
            result.rows.length === 0 ||
            result.rows[0].role !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Administrator access required."
            });
        }

        next();
    } catch (error) {
        console.error("Admin authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify administrator."
        });
    }
}

// All routes below require administrator access.
router.use(requireAdmin);

/* =========================
   DASHBOARD OVERVIEW
========================= */

router.get("/overview", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                COUNT(*) FILTER (
                    WHERE verification_status = 'pending'
                )::int AS pending,

                COUNT(*) FILTER (
                    WHERE verification_status = 'approved'
                )::int AS approved,

                COUNT(*) FILTER (
                    WHERE verification_status = 'rejected'
                )::int AS rejected,

                COUNT(*) FILTER (
                    WHERE verification_status = 'revoked'
                )::int AS revoked

             FROM users
             WHERE role = 'instructor'`
        );

        return res.json({
            success: true,
            overview: result.rows[0]
        });
    } catch (error) {
        console.error("Admin overview error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard overview."
        });
    }
});

/* =========================
   GET ALL INSTRUCTORS
========================= */

router.get("/instructors", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.user_id,
                u.display_name,
                u.email,
                u.school_id,
                s.school_name,
                u.email_verified,
                u.verification_status,
                u.is_verified,
                u.verified_at,
                u.verified_by

             FROM users u

             LEFT JOIN schools s
                ON u.school_id = s.school_id

             WHERE u.role = 'instructor'

             ORDER BY
                CASE u.verification_status
                    WHEN 'pending' THEN 0
                    WHEN 'rejected' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'revoked' THEN 3
                    ELSE 4
                END,
                u.display_name`
        );

        return res.json({
            success: true,
            instructors: result.rows
        });
    } catch (error) {
        console.error("Admin instructor list error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load instructors."
        });
    }
});

/* =========================
   UPDATE INSTRUCTOR STATUS
========================= */

router.patch(
    "/instructors/:id/verification",
    async (req, res) => {
        const instructorId = Number(req.params.id);
        const { status } = req.body || {};

        const allowedStatuses = [
            "pending",
            "approved",
            "rejected",
            "revoked"
        ];

        if (
            !Number.isSafeInteger(instructorId) ||
            instructorId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid instructor ID."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification status."
            });
        }

        try {
            const result = await pool.query(
                `UPDATE users
                 SET
                    verification_status = $1::varchar,

                    is_verified = (
                        $1::varchar = 'approved'
                    ),

                    verified_at = CASE
                        WHEN $1::varchar = 'approved'
                            THEN NOW()
                        ELSE NULL
                    END,

                    verified_by = CASE
                        WHEN $1::varchar = 'approved'
                            THEN $2::integer
                        ELSE NULL
                    END

                 WHERE user_id = $3
                   AND role = 'instructor'

                 RETURNING
                    user_id,
                    display_name,
                    email,
                    school_id,
                    email_verified,
                    verification_status,
                    is_verified,
                    verified_at,
                    verified_by`,
                [
                    status,
                    req.session.userId,
                    instructorId
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Instructor not found."
                });
            }

            return res.json({
                success: true,
                message:
                    `Instructor status updated to ${status}.`,
                instructor: result.rows[0]
            });
        } catch (error) {
            console.error(
                "Verification update error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update instructor verification."
            });
        }
    }
);

module.exports = router;
