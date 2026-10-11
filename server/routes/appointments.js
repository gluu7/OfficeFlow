
const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// Student creates an appointment request.
router.post("/", async (req, res) => {
    try {
        const studentId = req.session?.userId;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        const {
            officeHourId,
            appointmentDate,
            startTime,
            reason
        } = req.body || {};

        const hourId = Number(officeHourId);

        if (
            !Number.isSafeInteger(hourId) ||
            hourId <= 0 ||
            typeof appointmentDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
            typeof startTime !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment details."
            });
        }

        const date = new Date(`${appointmentDate}T12:00:00Z`);

        if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== appointmentDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment date."
            });
        }

        if (
            reason !== undefined &&
            (typeof reason !== "string" || reason.length > 500)
        ) {
            return res.status(400).json({
                success: false,
                message: "Reason must be 500 characters or fewer."
            });
        }

        const studentResult = await pool.query(
            `SELECT role, email_verified
             FROM users
             WHERE user_id = $1`,
            [studentId]
        );

        const student = studentResult.rows[0];

        if (!student || student.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Only students can book appointments."
            });
        }

        if (!student.email_verified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before booking."
            });
        }

        const officeResult = await pool.query(
            `SELECT
                oh.office_hour_id,
                oh.instructor_id,
                oh.day_of_week,
                oh.start_time,
                oh.end_time,
                oh.is_active
             FROM office_hours oh
             JOIN users u ON u.user_id = oh.instructor_id
             WHERE oh.office_hour_id = $1
               AND u.role = 'instructor'
               AND u.is_verified = TRUE
               AND u.email_verified = TRUE
               AND u.verification_status = 'approved'`,
            [hourId]
        );

        const officeHour = officeResult.rows[0];

        if (!officeHour || !officeHour.is_active) {
            return res.status(400).json({
                success: false,
                message: "These office hours are unavailable."
            });
        }

        if (date.getUTCDay() !== Number(officeHour.day_of_week)) {
            return res.status(400).json({
                success: false,
                message: "The selected date is not an office-hours day."
            });
        }

        const toMinutes = (time) => {
            const [hours, minutes] = String(time)
                .slice(0, 5)
                .split(":")
                .map(Number);

            return hours * 60 + minutes;
        };

        const startMinutes = toMinutes(startTime);
        const endMinutes = startMinutes + 30;

        if (
            startMinutes % 30 !== 0 ||
            startMinutes < toMinutes(officeHour.start_time) ||
            endMinutes > toMinutes(officeHour.end_time)
        ) {
            return res.status(400).json({
                success: false,
                message: "The selected time is outside available office hours."
            });
        }

        const result = await pool.query(
            `INSERT INTO appointments (
                student_id,
                instructor_id,
                office_hour_id,
                appointment_date,
                start_time,
                end_time,
                reason,
                status
             )
             SELECT
                $1, $2, $3, $4::date,
                $5::time, $6::time, $7, 'pending'
             WHERE ($4::date + $5::time)
                > (NOW() AT TIME ZONE 'America/Los_Angeles')
             RETURNING *`,
            [
                studentId,
                officeHour.instructor_id,
                hourId,
                appointmentDate,
                `${startTime}:00`,
                `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}:00`,
                reason?.trim() || null
            ]
        );

       
if (result.rows.length === 0) {
    return res.status(400).json({
        success: false,
        message: "You cannot book an appointment in the past."
    });
}

// Notify the instructor about the new booking request.
const appointment = result.rows[0];

try {
    await pool.query(
        `INSERT INTO notifications (
            user_id,
            appointment_id,
            message,
            is_read
        )
        VALUES ($1, $2, $3, FALSE)`,
        [
            officeHour.instructor_id,
            appointment.appointment_id,
            `New appointment request for ${appointmentDate} at ${startTime}.`
        ]
    );
} catch (notificationError) {
    console.error(
        "CREATE INSTRUCTOR NOTIFICATION ERROR:",
        notificationError
    );
}

return res.status(201).json({
    success: true,
    message: "Appointment request submitted.",
    appointment
});

    } catch (error) {
        if (error.code === "23P01") {
            return res.status(409).json({
                success: false,
                message: "This time slot is already requested or booked."
            });
        }

        console.error("CREATE APPOINTMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create appointment."
        });
    }
});

// Students and instructors view their own appointments.
router.get("/mine", async (req, res) => {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        const role = userResult.rows[0]?.role;

        if (!["student", "instructor"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const idColumn = role === "student"
            ? "a.student_id"
            : "a.instructor_id";

        const otherIdColumn = role === "student"
            ? "a.instructor_id"
            : "a.student_id";

        const result = await pool.query(
            `SELECT
                a.*,
                u.display_name AS other_person_name,
                u.email AS other_person_email
             FROM appointments a
             JOIN users u ON u.user_id = ${otherIdColumn}
            
WHERE ${idColumn} = $1
  AND NOT EXISTS (
      SELECT 1
      FROM appointment_history_hidden h
      WHERE h.appointment_id = a.appointment_id
        AND h.user_id = $1
  )

             ORDER BY a.appointment_date, a.start_time`,
            [userId]
        );

        return res.json({
            success: true,
            appointments: result.rows
        });
    } catch (error) {
        console.error("LOAD APPOINTMENTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load appointments."
        });
    }
});

// Instructor approves or declines an appointment request.
router.patch("/:appointmentId/status", async (req, res) => {
    try {
        const instructorId = req.session?.userId;

        if (!instructorId) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        const appointmentId = Number(req.params.appointmentId);
        const { status } = req.body || {};

        if (
            !Number.isSafeInteger(appointmentId) ||
            appointmentId <= 0 ||
            !["approved", "declined"].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment or status."
            });
        }

        const userResult = await pool.query(
            `SELECT role, is_verified, email_verified,
                    verification_status
             FROM users
             WHERE user_id = $1`,
            [instructorId]
        );

        const instructor = userResult.rows[0];

        if (
            !instructor ||
            instructor.role !== "instructor" ||
            !instructor.is_verified ||
            !instructor.email_verified ||
            instructor.verification_status !== "approved"
        ) {
            return res.status(403).json({
                success: false,
                message: "An approved instructor account is required."
            });
        }

        
const result = await pool.query(
    `UPDATE appointments
     SET status = $1
     WHERE appointment_id = $2
       AND instructor_id = $3
       AND status = 'pending'
       AND appointment_date + start_time >
           (NOW() AT TIME ZONE 'America/Los_Angeles')
     RETURNING *`,
    [status, appointmentId, instructorId]
);


        if (result.rows.length === 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Request not found, already processed, or appointment time has passed."
            });
        }

const appointment = result.rows[0];

const notificationMessage =
    status === "approved"
        ? `Your appointment on ${appointment.appointment_date} at ${appointment.start_time} has been approved.`
        : `Your appointment on ${appointment.appointment_date} at ${appointment.start_time} has been declined.`;

try {
    await pool.query(
        `INSERT INTO notifications (
            user_id,
            appointment_id,
            message
        )
        VALUES ($1, $2, $3)`,
        [
            appointment.student_id,
            appointment.appointment_id,
            notificationMessage
        ]
    );
} catch (notificationError) {
    console.error(
        "CREATE NOTIFICATION ERROR:",
        notificationError
    );
}

        return res.json({
            success: true,
            message: status === "approved"
                ? "Appointment approved."
                : "Appointment declined.",
            appointment: result.rows[0]
        });
    } catch (error) {
        if (error.code === "23P01") {
            return res.status(409).json({
                success: false,
                message: "This time conflicts with another appointment."
            });
        }

        console.error("UPDATE APPOINTMENT STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update appointment."
        });
    }
});

 // Student cancels their own pending or approved appointment.
router.patch("/:appointmentId/cancel", async (req, res) => {
    try {
        const studentId = req.session?.userId;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        const appointmentId = Number(req.params.appointmentId);

        if (
            !Number.isSafeInteger(appointmentId) ||
            appointmentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID."
            });
        }

        const result = await pool.query(
            `UPDATE appointments
             SET status = 'cancelled'
             WHERE appointment_id = $1
               AND student_id = $2
               AND status IN ('pending', 'approved')
               AND appointment_date + start_time
                   > (NOW() AT TIME ZONE 'America/Los_Angeles')
             RETURNING *`,
            [appointmentId, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Appointment not found, already cancelled, or time has passed."
            });
        }

        return res.json({
            success: true,
            message: "Appointment cancelled successfully.",
            appointment: result.rows[0]
        });
    } catch (error) {
        console.error("CANCEL APPOINTMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to cancel appointment."
        });
    }
});

 // Get booked appointment slots for an instructor and date.
router.get("/availability", async (req, res) => {
    try {
        const { officeHourId, appointmentDate } = req.query;
        const hourId = Number(officeHourId);

        if (
            !Number.isSafeInteger(hourId) ||
            hourId <= 0 ||
            typeof appointmentDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid office hour or appointment date."
            });
        }

        const result = await pool.query(
            `SELECT a.start_time, a.end_time
             FROM appointments a
             WHERE a.instructor_id = (
                 SELECT instructor_id
                 FROM office_hours
                 WHERE office_hour_id = $1
             )
               AND a.appointment_date = $2::date
               AND a.status IN ('pending', 'approved')
             ORDER BY a.start_time`,
            [hourId, appointmentDate]
        );

        return res.json({
            success: true,
            bookedSlots: result.rows
        });
    } catch (error) {
        console.error("LOAD AVAILABILITY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load appointment availability."
        });
    }
});

 // Get notifications for the logged-in user.
router.get("/notifications", async (req, res) => {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        const result = await pool.query(
            `SELECT
                notification_id,
                appointment_id,
                message,
                is_read,
                created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId]
        );

        return res.json({
            success: true,
            notifications: result.rows
        });
    } catch (error) {
        console.error("LOAD NOTIFICATIONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load notifications."
        });
    }
});

// Mark one notification as read.
router.patch("/notifications/:notificationId/read", async (req, res) => {
    try {
        const userId = req.session?.userId;
        const notificationId = Number(req.params.notificationId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        if (
            !Number.isSafeInteger(notificationId) ||
            notificationId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID."
            });
        }

        const result = await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE notification_id = $1
               AND user_id = $2
             RETURNING *`,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        return res.json({
            success: true,
            notification: result.rows[0]
        });
    } catch (error) {
        console.error("MARK NOTIFICATION READ ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update notification."
        });
    }
});


router.delete("/history/old", async (req, res) => {
    const userId = req.session?.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    try {
        const user = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        const role = user.rows[0]?.role;

        if (!["student", "instructor"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const ownerColumn =
            role === "student" ? "student_id" : "instructor_id";

        const result = await pool.query(
            `INSERT INTO appointment_history_hidden
                (user_id, appointment_id)
             SELECT $1, appointment_id
             FROM appointments
             WHERE ${ownerColumn} = $1
               AND (
    status IN ('cancelled', 'declined')
    OR appointment_date + end_time <=
       (NOW() AT TIME ZONE 'America/Los_Angeles')
)
             ON CONFLICT DO NOTHING
             RETURNING appointment_id`,
            [userId]
        );

        return res.json({
            success: true,
            deletedCount: result.rowCount,
            message: `${result.rowCount} appointments cleared from your history.`
        });
    } catch (error) {
        console.error("CLEAR HISTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to clear history."
        });
    }
});

router.patch("/notifications/read-all", async (req, res) => {
    const userId = req.session?.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    try {
        const result = await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );

        return res.json({
            success: true,
            updatedCount: result.rowCount
        });
    } catch (error) {
        console.error("MARK ALL READ ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to mark notifications as read."
        });
    }
});

router.delete("/notifications", async (req, res) => {
    const userId = req.session?.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    try {
        const result = await pool.query(
            `DELETE FROM notifications
             WHERE user_id = $1`,
            [userId]
        );

        return res.json({
            success: true,
            deletedCount: result.rowCount,
            message: `${result.rowCount} notifications cleared.`
        });
    } catch (error) {
        console.error("CLEAR NOTIFICATIONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to clear notifications."
        });
    }
});

module.exports = router;
