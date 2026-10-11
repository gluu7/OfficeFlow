
const express = require("express");
const pool = require("../config/database");

const router = express.Router();

// Check that the logged-in user is an instructor.
async function requireInstructor(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    try {
        const result = await pool.query(
            `SELECT role
             FROM users
             WHERE user_id = $1`,
            [req.session.userId]
        );
        console.log("SESSION USER ID:", req.session.userId);
console.log("DATABASE RESULT:", result.rows);
        if (
            result.rows.length === 0 ||
            result.rows[0].role !== "instructor"
        ) {
            return res.status(403).json({
                message: "Only instructors can manage office hours."
            });
        }

        next();
    } catch (error) {
        console.error("INSTRUCTOR AUTH ERROR:", error);

        return res.status(500).json({
            message: "Unable to verify instructor permissions."
        });
    }
}

// Get all office hours belonging to the logged-in instructor.
router.get("/mine", requireInstructor, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                office_hour_id,
                instructor_id,
                day_of_week,
                start_time,
                end_time,
                location,
                meeting_type,
                is_active,
                created_at
             FROM office_hours
             WHERE instructor_id = $1
             ORDER BY day_of_week, start_time`,
            [req.session.userId]
        );

        return res.json({
            success: true,
            officeHours: result.rows
        });
    } catch (error) {
        console.error("GET OFFICE HOURS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load office hours."
        });
    }
});

// Create new recurring office hours.
router.post("/", requireInstructor, async (req, res) => {
    try {
        const {
            dayOfWeek,
            startTime,
            endTime,
            meetingType,
            location
        } = req.body || {};

        // Check current instructor approval and email status.
        const instructorResult = await pool.query(
            `SELECT
                role,
                email_verified,
                is_verified,
                verification_status
             FROM users
             WHERE user_id = $1`,
            [req.session.userId]
        );

        const instructor = instructorResult.rows[0];

        if (
            !instructor ||
            instructor.role !== "instructor" ||
            !instructor.email_verified ||
            !instructor.is_verified ||
            instructor.verification_status !== "approved"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Email verification and admin approval are required."
            });
        }

        // Validate day of week: Sunday = 0, Saturday = 6.
        const day = Number(dayOfWeek);

        if (
            !Number.isInteger(day) ||
            day < 0 ||
            day > 6
        ) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid day."
            });
        }

        // Validate 24-hour time strings such as 09:00 or 14:30.
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

        if (
            typeof startTime !== "string" ||
            typeof endTime !== "string" ||
            !timePattern.test(startTime) ||
            !timePattern.test(endTime) ||
            endTime <= startTime
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please enter a valid start and end time."
            });
        }

        if (
            !["online", "in_person"].includes(meetingType)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid meeting type."
            });
        }

        if (
            typeof location !== "string" ||
            location.trim().length > 255
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Location must be 255 characters or fewer."
            });
        }

        const cleanLocation = location.trim();

        if (
            meetingType === "in_person" &&
            !cleanLocation
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please enter a location for in-person office hours."
            });
        }

        // Prevent overlapping active schedules.
        const overlapResult = await pool.query(
            `SELECT office_hour_id
             FROM office_hours
             WHERE instructor_id = $1
               AND day_of_week = $2
               AND is_active = TRUE
               AND start_time < $4::time
               AND end_time > $3::time
             LIMIT 1`,
            [
                req.session.userId,
                day,
                startTime,
                endTime
            ]
        );

        if (overlapResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "These office hours overlap an existing schedule."
            });
        }

        // Save the schedule to PostgreSQL.
        const result = await pool.query(
            `INSERT INTO office_hours (
                instructor_id,
                day_of_week,
                start_time,
                end_time,
                meeting_type,
                location
             )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING
                office_hour_id,
                instructor_id,
                day_of_week,
                start_time,
                end_time,
                location,
                meeting_type,
                is_active,
                created_at`,
            [
                req.session.userId,
                day,
                startTime,
                endTime,
                meetingType,
                cleanLocation
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Office hours created successfully.",
            officeHour: result.rows[0]
        });
    } catch (error) {
        console.error("CREATE OFFICE HOURS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create office hours."
        });
    }
});



router.patch("/:officeHourId/status", requireInstructor, async (req, res) => {
    try {
        const officeHourId = Number(req.params.officeHourId);
        const { isActive, pauseReason, pauseNote } = req.body || {};

        if (
            !Number.isSafeInteger(officeHourId) ||
            officeHourId <= 0 ||
            typeof isActive !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid office hours status request."
            });
        }

        const allowedReasons = [
            "Unavailable",
            "Sick leave",
            "Conference / Meeting",
            "Other"
        ];

        let cleanReason = null;
        let cleanNote = null;

        if (!isActive) {
            if (
                pauseReason !== undefined &&
                pauseReason !== null &&
                typeof pauseReason !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid pause reason."
                });
            }

            if (
                pauseNote !== undefined &&
                pauseNote !== null &&
                typeof pauseNote !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid pause note."
                });
            }

            cleanReason = (pauseReason || "").trim() || null;
            cleanNote = (pauseNote || "").trim() || null;

            if (
                cleanReason !== null &&
                !allowedReasons.includes(cleanReason)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a valid pause reason."
                });
            }

            if (cleanNote && cleanNote.length > 500) {
                return res.status(400).json({
                    success: false,
                    message: "Pause note cannot exceed 500 characters."
                });
            }
        }

        const result = await pool.query(
            `UPDATE office_hours
             SET
                is_active = $1,
                pause_reason = $2,
                pause_note = $3
             WHERE office_hour_id = $4
               AND instructor_id = $5
             RETURNING
                office_hour_id,
                instructor_id,
                day_of_week,
                start_time,
                end_time,
                location,
                meeting_type,
                is_active,
                pause_reason,
                pause_note,
                created_at`,
            [
                isActive,
                cleanReason,
                cleanNote,
                officeHourId,
                req.session.userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Office hours not found."
            });
        }

        return res.json({
            success: true,
            message: isActive
                ? "Office hours reactivated successfully."
                : "Office hours paused successfully.",
            officeHour: result.rows[0]
        });
    } catch (error) {
        console.error("UPDATE OFFICE HOURS STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update office hours."
        });
    }
});


router.patch("/:officeHourId", requireInstructor, async (req, res) => {
    try {
        const officeHourId = Number(req.params.officeHourId);
        const instructorId = req.session.userId;

        const {
            dayOfWeek,
            startTime,
            endTime,
            meetingType,
            location
        } = req.body || {};

        if (!Number.isSafeInteger(officeHourId) || officeHourId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid office hours ID."
            });
        }

        const instructorResult = await pool.query(
            `SELECT role, email_verified, is_verified,
                    verification_status
             FROM users
             WHERE user_id = $1`,
            [instructorId]
        );

        const instructor = instructorResult.rows[0];

        if (
            !instructor ||
            instructor.role !== "instructor" ||
            !instructor.email_verified ||
            !instructor.is_verified ||
            instructor.verification_status !== "approved"
        ) {
            return res.status(403).json({
                success: false,
                message: "Your instructor account must be approved."
            });
        }

        const day = Number(dayOfWeek);
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

        if (!Number.isInteger(day) || day < 0 || day > 6) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid day."
            });
        }

        if (
            typeof startTime !== "string" ||
            typeof endTime !== "string" ||
            !timePattern.test(startTime) ||
            !timePattern.test(endTime) ||
            endTime <= startTime
        ) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid start and end time."
            });
        }

        if (!["in_person", "online"].includes(meetingType)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid meeting type."
            });
        }

        if (typeof location !== "string" || location.length > 255) {
            return res.status(400).json({
                success: false,
                message: "Invalid office location."
            });
        }

        const cleanLocation = location.trim();

        if (meetingType === "in_person" && !cleanLocation) {
            return res.status(400).json({
                success: false,
                message: "An office location is required."
            });
        }

        const overlapResult = await pool.query(
            `SELECT office_hour_id
             FROM office_hours
             WHERE instructor_id = $1
               AND day_of_week = $2
               AND is_active = TRUE
               AND office_hour_id <> $3
               AND start_time < $5::time
               AND end_time > $4::time
             LIMIT 1`,
            [
                instructorId,
                day,
                officeHourId,
                startTime,
                endTime
            ]
        );

        if (overlapResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "These office hours overlap another active schedule."
            });
        }

        const result = await pool.query(
            `UPDATE office_hours
             SET day_of_week = $1,
                 start_time = $2,
                 end_time = $3,
                 meeting_type = $4,
                 location = $5
             WHERE office_hour_id = $6
               AND instructor_id = $7
             RETURNING *`,
            [
                day,
                startTime,
                endTime,
                meetingType,
                cleanLocation,
                officeHourId,
                instructorId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Office hours not found."
            });
        }

        return res.json({
            success: true,
            message: "Office hours updated successfully.",
            officeHour: result.rows[0]
        });
    } catch (error) {
        console.error("EDIT OFFICE HOURS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update office hours."
        });
    }
});


router.get("/instructor/:instructorId", async (req, res) => {
    try {
        const instructorId = Number(req.params.instructorId);

        if (
            !Number.isSafeInteger(instructorId) ||
            instructorId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid instructor ID."
            });
        }

        const instructorResult = await pool.query(
            `SELECT user_id
             FROM users
             WHERE user_id = $1
               AND role = 'instructor'
               AND is_verified = TRUE
               AND email_verified = TRUE
               AND verification_status = 'approved'`,
            [instructorId]
        );

        if (instructorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Instructor not found or not approved."
            });
        }

        const result = await pool.query(
            `SELECT
                office_hour_id,
                instructor_id,
                day_of_week,
                start_time,
                end_time,
                location,
                meeting_type,
                is_active,
                pause_reason,
                pause_note
             FROM office_hours
             WHERE instructor_id = $1
             ORDER BY day_of_week, start_time`,
            [instructorId]
        );

        return res.json({
            success: true,
            officeHours: result.rows
        });
    } catch (error) {
        console.error("LOAD INSTRUCTOR OFFICE HOURS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load instructor office hours."
        });
    }
});

module.exports = router;
