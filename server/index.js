
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);

const pool = require("./config/database");
const authRoutes = require("./routes/auth");
const officeHoursRoutes = require("./routes/officeHours");
const adminRoutes = require("./routes/admin");
const {
    router: emailVerificationRoutes
} = require("./routes/emailVerification");

const appointmentsRoutes = require("./routes/appointments");


const app = express();
const PORT = 3000;

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    credentials: true
}));

app.use(express.json());

app.use(session({
    store: new PgSession({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true
    }),
    name: "officeflow.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

/* =========================
   API ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/email-verification", emailVerificationRoutes);
app.use("/api/appointments", appointmentsRoutes);

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "OfficeFlow backend connected!"
    });
});

/* =========================
   DATABASE TEST
========================= */

app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.json({
            success: true,
            message: "PostgreSQL connected successfully!",
            databaseTime: result.rows[0].current_time
        });
    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

/* =========================
   SCHOOLS
========================= */

app.get("/api/schools", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                school_id,
                school_name,
                school_domain
             FROM schools`
        );

        res.json({
            success: true,
            schools: result.rows
        });
    } catch (error) {
        console.error("Error fetching schools:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch schools"
        });
    }
});

/* =========================
   INSTRUCTORS
========================= */

app.get("/api/instructors", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                user_id,
                display_name
             FROM users
             WHERE role = $1
             ORDER BY display_name`,
            ["instructor"]
        );

        res.json({
            success: true,
            instructors: result.rows
        });
    } catch (error) {
        console.error(
            "Error fetching instructors:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch instructors"
        });
    }
});

app.use("/api/office-hours", officeHoursRoutes);
/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
