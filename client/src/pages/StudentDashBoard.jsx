
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "https://officeflow-api-f462.onrender.com";

function formatTime(time) {
    if (!time) return "";

    const [hours, minutes] = time.split(":");
    const hour = Number(hours);

    return `${hour % 12 || 12}:${minutes} ${
        hour >= 12 ? "PM" : "AM"
    }`;
}

function StudentDashboard() {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDashboard() {
        try {
            setLoading(true);
            setError("");

            const [notificationsResponse, appointmentsResponse] =
                await Promise.all([
                    fetch(`${API_URL}/api/appointments/notifications`, {
                        credentials: "include"
                    }),
                    fetch(`${API_URL}/api/appointments/mine`, {
                        credentials: "include"
                    })
                ]);

            const notificationsData =
                await notificationsResponse.json();

            const appointmentsData =
                await appointmentsResponse.json();

            if (!notificationsResponse.ok) {
                throw new Error(
                    notificationsData.message ||
                    "Unable to load notifications."
                );
            }

            if (!appointmentsResponse.ok) {
                throw new Error(
                    appointmentsData.message ||
                    "Unable to load appointments."
                );
            }

            setNotifications(notificationsData.notifications || []);
            setAppointments(appointmentsData.appointments || []);
        } catch (err) {
            setError(err.message || "Unable to load dashboard.");
        } finally {
            setLoading(false);
        }
    }

   useEffect(() => {
    loadDashboard();

    const intervalId = setInterval(() => {
        refreshNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
}, []);

async function refreshNotifications() {
    try {
        const response = await fetch(
            `${API_URL}/api/appointments/notifications`,
            {
                credentials: "include"
            }
        );

        if (!response.ok) return;

        const data = await response.json();

        setNotifications(data.notifications || []);
    } catch (err) {
        console.error("Notification refresh failed:", err);
    }
}

async function markAllNotificationsRead() {
    setError("");
    try {
        const response = await fetch(
            `${API_URL}/api/appointments/notifications/read-all`,
            {
                method: "PATCH",
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to mark notifications as read.");
        }

        setNotifications((previous) =>
            previous.map((notification) => ({
                ...notification,
                is_read: true
            }))
        );
    } catch (err) {
        setError(err.message);
    }
}

async function clearNotifications() {
    const confirmed = window.confirm(
        "Permanently delete all your notifications?"
    );

    if (!confirmed) return;

    setError("");

    try {
        const response = await fetch(
            `${API_URL}/api/appointments/notifications`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to clear notifications."
            );
        }

        setNotifications([]);
        setError("");
    } catch (err) {
        setError(err.message || "Unable to clear notifications.");
    }
}


    async function markAsRead(notificationId) {
        try {
            const response = await fetch(
                `${API_URL}/api/appointments/notifications/${notificationId}/read`,
                {
                    method: "PATCH",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update notification."
                );
            }

            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.notification_id === notificationId
                        ? { ...notification, is_read: true }
                        : notification
                )
            );
        } catch (err) {
            setError(err.message);
        }
    }

    const unreadCount = notifications.filter(
        (notification) => !notification.is_read
    ).length;

    const now = new Date();

    const upcomingAppointments = appointments
        .filter((appointment) => {
            if (!["pending", "approved"].includes(
                appointment.status
            )) {
                return false;
            }

            const date = String(
                appointment.appointment_date
            ).slice(0, 10);

            const appointmentDateTime = new Date(
                `${date}T${appointment.start_time}`
            );

            return appointmentDateTime > now;
        })
        .sort((a, b) => {
            const dateA = new Date(
                `${String(a.appointment_date).slice(0, 10)}T${a.start_time}`
            );

            const dateB = new Date(
                `${String(b.appointment_date).slice(0, 10)}T${b.start_time}`
            );

            return dateA - dateB;
        });

    return (
        <div className="student-dashboard">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "20px",
                    flexWrap: "wrap"
                }}
            >
                <div>
                    <h1 className="page-title">
                        Student Dashboard
                    </h1>

                    <p className="page-description">
                        Manage your appointments and find office hours.
                    </p>
                </div>

                
<div
    style={{ position: "relative" }}
    onMouseEnter={() => setShowNotifications(true)}
    onMouseLeave={() => setShowNotifications(false)}
>
    <button
        type="button"
        className="notification-bell"
        onClick={() => setShowNotifications(!showNotifications)}
        aria-label={`Notifications, ${unreadCount} unread`}
    >
        <svg
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
            <span
                style={{
                    marginLeft: "8px",
                    background: "#dc2626",
                    color: "white",
                    borderRadius: "20px",
                    padding: "3px 8px",
                    fontSize: "12px",
                    fontWeight: 700
                }}
            >
                {unreadCount}
            </span>
        )}
    </button>


                    {showNotifications && (
    <div className="notification-dropdown">
                          
<h3 style={{ marginTop: 0 }}>
    Notifications
</h3>

<div
    style={{
        display: "flex",
        gap: "8px",
        marginBottom: "12px",
        flexWrap: "wrap"
    }}
>
    <button
        type="button"
        onClick={markAllNotificationsRead}
        disabled={unreadCount === 0}
        style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            cursor: unreadCount === 0
                ? "not-allowed"
                : "pointer"
        }}
    >
        Mark All as Read
    </button>

    <button
        type="button"
        onClick={clearNotifications}
        disabled={notifications.length === 0}
        style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#dc2626",
            cursor: notifications.length === 0
                ? "not-allowed"
                : "pointer"
        }}
    >
        Clear All
    </button>
</div>

{notifications.length === 0 ? (

                                <p>No notifications yet.</p>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={
                                            notification.notification_id
                                        }
                                        style={{
                                            padding: "12px 0",
                                            borderBottom:
                                                "1px solid #e5e7eb",
                                            opacity: notification.is_read
                                                ? 0.65
                                                : 1
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: "0 0 8px",
                                                fontWeight:
                                                    notification.is_read
                                                        ? 400
                                                        : 600
                                            }}
                                        >
                                            {notification.message}
                                        </p>

                                        <small>
                                            {new Date(
                                                notification.created_at
                                            ).toLocaleString()}
                                        </small>

                                        {!notification.is_read && (
                                            <div
                                                style={{
                                                    marginTop: "10px"
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        markAsRead(
                                                            notification.notification_id
                                                        )
                                                    }
                                                    style={{
                                                        padding:
                                                            "6px 10px",
                                                        borderRadius:
                                                            "6px",
                                                        border:
                                                            "1px solid #cbd5e1",
                                                        background:
                                                            "#f8fafc",
                                                        cursor:
                                                            "pointer"
                                                    }}
                                                >
                                                    Mark as read
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <p role="alert" style={{ color: "#dc2626" }}>
                    {error}
                </p>
            )}

            <div className="dashboard-stats">
                <div className="stat-card">
                    <h3>Upcoming Appointments</h3>
                    <p className="stat-number">
                        {upcomingAppointments.length}
                    </p>
                </div>

                <div className="stat-card">
                    <h3>Followed Instructors</h3>
                    <p className="stat-number">0</p>
                </div>
            </div>

            <div className="dashboard-section">
                <h2>Upcoming Appointments</h2>

                {loading ? (
                    <p>Loading appointments...</p>
                ) : upcomingAppointments.length === 0 ? (
                    <p>You don't have any upcoming appointments.</p>
                ) : (
                    upcomingAppointments.map((appointment) => (
                        <div
                            key={appointment.appointment_id}
                            style={{
                                padding: "16px",
                                marginBottom: "12px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px"
                            }}
                        >
                            <h3>
                                {appointment.other_person_name}
                            </h3>

                            <p>
                                Date:{" "}
                                {String(
                                    appointment.appointment_date
                                ).slice(0, 10)}
                            </p>

                            <p>
                                Time:{" "}
                                {formatTime(appointment.start_time)}
                                {" – "}
                                {formatTime(appointment.end_time)}
                            </p>

                            <p>
                                Status:{" "}
                                <strong>
                                    {appointment.status}
                                </strong>
                            </p>
                        </div>
                    ))
                )}
            </div>

            <div className="dashboard-section">
                <h2>Find Office Hours</h2>

                <p>
                    Browse instructors and book available office hours.
                </p>

                <button
                    type="button"
                    onClick={() => navigate("/instructors")}
                    className="profile-book-button"
                >
                    Browse Instructors
                </button>
            </div>
        </div>
    );
}

export default StudentDashboard;
