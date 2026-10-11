

import { useEffect, useRef, useState } from "react";

import { useOutletContext } from "react-router-dom";

import "./InstructorDashBoard.css";



const API_URL = "https://officeflow-api-f462.onrender.com";



const DAYS = [

    "Sunday",

    "Monday",

    "Tuesday",

    "Wednesday",

    "Thursday",

    "Friday",

    "Saturday"

];



const HOURS = Array.from(

    { length: 12 },

    (_, index) => String(index + 1)

);



const MINUTES = ["00", "15", "30", "45"];



const initialForm = {

    dayOfWeek: "1",

    startHour: "9",

    startMinute: "00",

    startPeriod: "AM",

    endHour: "10",

    endMinute: "00",

    endPeriod: "AM",

    meetingType: "in_person",

    location: ""

};



function to24Hour(hour, minute, period) {

    let hour24 = Number(hour) % 12;



    if (period === "PM") {

        hour24 += 12;

    }



    return `${String(hour24).padStart(2, "0")}:${minute}`;

}



function from24Hour(time) {

    const [hour, minute] = time.split(":");

    const hour24 = Number(hour);



    return {

        hour: String(hour24 % 12 || 12),

        minute,

        period: hour24 >= 12 ? "PM" : "AM"

    };

}



function formatTime(time) {

    if (!time) return "";



    const [hour, minute] = time.split(":");

    const hour24 = Number(hour);



    return `${hour24 % 12 || 12}:${minute} ${

        hour24 >= 12 ? "PM" : "AM"

    }`;

}



function sortOfficeHours(items) {

    return [...items].sort(

        (a, b) =>

            a.day_of_week - b.day_of_week ||

            a.start_time.localeCompare(b.start_time)

    );

}



function InstructorDashBoard() {

    const { user } = useOutletContext();

    const formRef = useRef(null);

    const [officeHours, setOfficeHours] = useState([]);

    const [loading, setLoading] = useState(true);

    const [appointments, setAppointments] = useState([]);

    const [appointmentsLoading, setAppointmentsLoading] = useState(true);

    const [appointmentsError, setAppointmentsError] = useState("");

    const [appointmentActionId, setAppointmentActionId] = useState(null);

    const [appointmentMessage, setAppointmentMessage] = useState("");

    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({ ...initialForm });

    const [editingId, setEditingId] = useState(null);

    const [saving, setSaving] = useState(false);



    const [pauseTarget, setPauseTarget] = useState(null);

    const [pauseReason, setPauseReason] = useState("Unavailable");

    const [pauseNote, setPauseNote] = useState("");

    const [updatingId, setUpdatingId] = useState(null);


    const [notifications, setNotifications] = useState([]);
const [showNotifications, setShowNotifications] = useState(false);

    const [formError, setFormError] = useState("");

    const [pauseError, setPauseError] = useState("");

    const [loadError, setLoadError] = useState("");

    const [scheduleError, setScheduleError] = useState("");

    const [success, setSuccess] = useState("");



    const isApproved =

        user?.verification_status === "approved" &&

        user?.is_verified === true;



    const canCreate =

        isApproved && user?.email_verified === true;



    const status = user?.verification_status || "pending";



    const statusMessages = {

        pending: {

            title: "Verification Pending",

            message:

                "Your instructor account is awaiting administrator approval."

        },

        approved: {

            title: "Account Approved",

            message:

                "Your instructor account has been approved. Manage your weekly availability below."

        },

        rejected: {

            title: "Verification Rejected",

            message:

                "Your instructor verification was rejected. Please contact an administrator."

        },

        revoked: {

            title: "Verification Revoked",

            message:

                "Your instructor verification has been revoked. You cannot publish office hours."

        }

    };



    const currentStatus =

        statusMessages[status] || statusMessages.pending;



    useEffect(() => {

        let active = true;



        async function loadOfficeHours() {

            try {

                const response = await fetch(

                    `${API_URL}/api/office-hours/mine`,

                    {

                        credentials: "include"

                    }

                );



                const data = await response.json();



                if (!response.ok) {

                    throw new Error(

                        data.message || "Unable to load office hours."

                    );

                }



                if (active) {

                    setOfficeHours(

                        sortOfficeHours(data.officeHours || [])

                    );

                    setLoadError("");

                }

            } catch (error) {

                if (active) {

                    setLoadError(error.message);

                }

            } finally {

                if (active) {

                    setLoading(false);

                }

            }

        }



        loadOfficeHours();



        return () => {

            active = false;

        };

    }, []);



    async function clearOldHistory() {
        const confirmed = window.confirm(
    "Clear cancelled, declined, and past appointments? " +
    "Upcoming pending and approved appointments will be kept."
);

if (!confirmed) return;

        setAppointmentsError("");
        setAppointmentMessage("");
        try {
            const response = await fetch(`${API_URL}/api/appointments/history/old`, {
                method: "DELETE",
                credentials: "include"
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to clear history.");
            await loadAppointments();
            setAppointmentMessage(data.message || "Old appointment history cleared.");
        } catch (err) {
            setAppointmentsError(err.message || "Unable to clear history.");
        }
    }

    async function loadAppointments() {
        setAppointmentsLoading(true);
        setAppointmentsError("");

        try {
            const response = await fetch(
                `${API_URL}/api/appointments/mine`,
                { credentials: "include" }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load appointment requests."
                );
            }

            setAppointments(data.appointments || []);
        } catch (error) {
            setAppointmentsError(
                error.message || "Unable to load appointment requests."
            );
        } finally {
            setAppointmentsLoading(false);
        }
    }

    useEffect(() => {
        loadAppointments();
    }, []);

    async function updateAppointmentStatus(appointmentId, status) {
        setAppointmentActionId(appointmentId);
        setAppointmentsError("");
        setAppointmentMessage("");

        try {
            const response = await fetch(
                `${API_URL}/api/appointments/${appointmentId}/status`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ status })
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update appointment."
                );
            }

            setAppointmentMessage(data.message || "Appointment updated.");
            await loadAppointments();
        } catch (error) {
            setAppointmentsError(
                error.message || "Unable to update appointment."
            );
        } finally {
            setAppointmentActionId(null);
        }
    }
    
async function refreshNotifications() {
    try {
        const response = await fetch(
            `${API_URL}/api/appointments/notifications`,
            { credentials: "include" }
        );

        if (!response.ok) {
            throw new Error("Unable to load notifications.");
        }

        const data = await response.json();
        setNotifications(data.notifications || []);
    } catch (err) {
        console.error("Notification refresh failed:", err);
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

        if (!response.ok) {
            throw new Error("Unable to mark notification as read.");
        }

        setNotifications((previous) =>
            previous.map((notification) =>
                notification.notification_id === notificationId
                    ? { ...notification, is_read: true }
                    : notification
            )
        );
    } catch (err) {
        alert(err.message);
    }
}

async function markAllNotificationsRead() {
    try {
        const response = await fetch(
            `${API_URL}/api/appointments/notifications/read-all`,
            {
                method: "PATCH",
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to mark all as read.");
        }

        await refreshNotifications();
    } catch (err) {
        alert(err.message);
    }
}

async function clearNotifications() {
    const confirmed = window.confirm(
        "Permanently delete all your notifications?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_URL}/api/appointments/notifications`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to clear notifications.");
        }

        setNotifications([]);
    } catch (err) {
        alert(err.message);
    }
}
useEffect(() => {
    refreshNotifications();

    const intervalId = setInterval(() => {
        refreshNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
}, []);const unreadCount = notifications.filter(
    (notification) => !notification.is_read
).length;
    function formatAppointmentDate(value) {
        if (!value) return "Date unavailable";
        const datePart = String(value).slice(0, 10);
        const date = new Date(`${datePart}T12:00:00`);
        return Number.isNaN(date.getTime())
            ? datePart
            : date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric"
            });
    }

    function handleChange(event) {

        const { name, value } = event.target;



        setForm((previous) => ({

            ...previous,

            [name]: value

        }));



        setFormError("");

    }



    function cancelOfficeHoursForm() {

        if (saving) return;



        setEditingId(null);

        setForm({ ...initialForm });

        setShowForm(false);

        setFormError("");

    }



    function toggleOfficeHoursForm() {

        if (!canCreate || saving) return;



        if (showForm) {

            cancelOfficeHoursForm();

        } else {

            setEditingId(null);

            setForm({ ...initialForm });

            setFormError("");

            setSuccess("");

            setShowForm(true);

        }

    }



    function handleEdit(officeHour) {

        if (!canCreate || saving || updatingId !== null) {

            return;

        }



        const start = from24Hour(officeHour.start_time);

        const end = from24Hour(officeHour.end_time);



        setForm({

            dayOfWeek: String(officeHour.day_of_week),

            startHour: start.hour,

            startMinute: start.minute,

            startPeriod: start.period,

            endHour: end.hour,

            endMinute: end.minute,

            endPeriod: end.period,

            meetingType: officeHour.meeting_type,

            location: officeHour.location || ""

        });



        setEditingId(officeHour.office_hour_id);

        setShowForm(true);

        setFormError("");

        setSuccess("");



        setTimeout(() => {

    formRef.current?.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}, 100);

    }



    async function handleSubmit(event) {

        event.preventDefault();



        setFormError("");

        setSuccess("");



        if (!canCreate) {

            setFormError(

                "Your instructor account must be verified and approved."

            );

            return;

        }



        if (saving) return;



        const startTime = to24Hour(

            form.startHour,

            form.startMinute,

            form.startPeriod

        );



        const endTime = to24Hour(

            form.endHour,

            form.endMinute,

            form.endPeriod

        );



        if (endTime <= startTime) {

            setFormError("End time must be later than start time.");

            return;

        }



        if (

            form.meetingType === "in_person" &&

            !form.location.trim()

        ) {

            setFormError("Please enter an office location.");

            return;

        }



        const isEditing = editingId !== null;



        setSaving(true);



        try {

            const url = isEditing

                ? `${API_URL}/api/office-hours/${editingId}`

                : `${API_URL}/api/office-hours`;



            const response = await fetch(url, {

                method: isEditing ? "PATCH" : "POST",

                credentials: "include",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    dayOfWeek: Number(form.dayOfWeek),

                    startTime,

                    endTime,

                    meetingType: form.meetingType,

                    location: form.location.trim()

                })

            });



            const data = await response.json();



            if (!response.ok) {

                throw new Error(

                    data.message || "Unable to save office hours."

                );

            }



            if (isEditing) {

                setOfficeHours((previous) =>

                    sortOfficeHours(

                        previous.map((item) =>

                            item.office_hour_id === editingId

                                ? data.officeHour

                                : item

                        )

                    )

                );

            } else {

                setOfficeHours((previous) =>

                    sortOfficeHours([

                        ...previous,

                        data.officeHour

                    ])

                );

            }



            setEditingId(null);

            setForm({ ...initialForm });

            setShowForm(false);



            setSuccess(

                isEditing

                    ? "Office hours updated successfully!"

                    : "Office hours created successfully!"

            );

        } catch (error) {

            setFormError(

                error.message || "Unable to save office hours."

            );

        } finally {

            setSaving(false);

        }

    }



    function openPauseForm(officeHour) {

        if (!canCreate || updatingId !== null) return;



        setPauseTarget(officeHour);

        setPauseReason("Unavailable");

        setPauseNote("");

        setPauseError("");

        setScheduleError("");

        setSuccess("");

    }



    function closePauseForm() {

        if (updatingId !== null) return;



        setPauseTarget(null);

        setPauseError("");

    }



    async function updateOfficeHourStatus(

        officeHour,

        isActive,

        reason = null,

        note = null

    ) {

        if (!canCreate || updatingId !== null) return;



        setUpdatingId(officeHour.office_hour_id);

        setScheduleError("");

        setPauseError("");

        setSuccess("");



        try {

            const response = await fetch(

                `${API_URL}/api/office-hours/${officeHour.office_hour_id}/status`,

                {

                    method: "PATCH",

                    credentials: "include",

                    headers: {

                        "Content-Type": "application/json"

                    },

                    body: JSON.stringify({

                        isActive,

                        pauseReason: reason,

                        pauseNote: note

                    })

                }

            );



            const data = await response.json();



            if (!response.ok) {

                throw new Error(

                    data.message || "Unable to update office hours."

                );

            }



            setOfficeHours((previous) =>

                previous.map((item) =>

                    item.office_hour_id === officeHour.office_hour_id

                        ? data.officeHour

                        : item

                )

            );



            setPauseTarget(null);

            setSuccess(data.message);

        } catch (error) {

            const message =

                error.message || "Unable to update office hours.";



            if (pauseTarget) {

                setPauseError(message);

            } else {

                setScheduleError(message);

            }

        } finally {

            setUpdatingId(null);

        }

    }



    function confirmPause(event) {

        event.preventDefault();



        if (!pauseTarget) return;



        updateOfficeHourStatus(

            pauseTarget,

            false,

            pauseReason,

            pauseNote.trim()

        );

    }



    function renderTimeSelect(prefix) {

        return (

            <div className="instructor-time-selects">

                <select

                    name={`${prefix}Hour`}

                    value={form[`${prefix}Hour`]}

                    onChange={handleChange}

                    aria-label={`${prefix} hour`}

                >

                    {HOURS.map((hour) => (

                        <option key={hour} value={hour}>

                            {hour}

                        </option>

                    ))}

                </select>



                <select

                    name={`${prefix}Minute`}

                    value={form[`${prefix}Minute`]}

                    onChange={handleChange}

                    aria-label={`${prefix} minute`}

                >

                    {MINUTES.map((minute) => (

                        <option key={minute} value={minute}>

                            {minute}

                        </option>

                    ))}

                </select>



                <select

                    name={`${prefix}Period`}

                    value={form[`${prefix}Period`]}

                    onChange={handleChange}

                    aria-label={`${prefix} AM or PM`}

                >

                    <option value="AM">AM</option>

                    <option value="PM">PM</option>

                </select>

            </div>

        );

    }



   return (
    <div className="instructor-dashboard">
        <div
            className="instructor-heading"
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px"
            }}
        >
            <div>
                <span className="instructor-eyebrow">
                    INSTRUCTOR WORKSPACE
                </span>

                <h1>
                    Welcome, {user?.display_name || "Instructor"}
                </h1>

                <p>
                    Manage your availability and connect with students.
                </p>
            </div>

            {/* NOTIFICATION BELL */}
            
<div
    style={{
        position: "relative",
        flexShrink: 0,
        alignSelf: "center"
    }}
    onMouseEnter={() => setShowNotifications(true)}
    onMouseLeave={() => setShowNotifications(false)}
>
    <button
        type="button"
        className="notification-bell"
        onClick={() => setShowNotifications(!showNotifications)}
    >

                    
<svg
    width="21"
    height="21"
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
 {unreadCount > 0 && `(${unreadCount})`}
                </button>

               {showNotifications && (
    <div className="notification-dropdown">
                    
                        <h3>Notifications</h3>

                        <div style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "12px"
                        }}>
                            <button
                                type="button"
                                onClick={markAllNotificationsRead}
                                disabled={unreadCount === 0}
                            >
                                Mark All as Read
                            </button>

                            <button
                                type="button"
                                onClick={clearNotifications}
                                disabled={notifications.length === 0}
                            >
                                Clear All
                            </button>
                        </div>

                        {notifications.length === 0 ? (
                            <p>No notifications yet.</p>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.notification_id}
                                    style={{
                                        padding: "10px 0",
                                        borderBottom: "1px solid #ddd",
                                        opacity: notification.is_read ? 0.6 : 1
                                    }}
                                >
                                    <p>{notification.message}</p>

                                    <small>
                                        {new Date(
                                            notification.created_at
                                        ).toLocaleString()}
                                    </small>

                                    {!notification.is_read && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                markAsRead(
                                                    notification.notification_id
                                                )
                                            }
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

        </div>


            <section className="instructor-verification-card">

                <div className="instructor-verification-top">

                    <div>

                        <h2>{currentStatus.title}</h2>

                        <p>{currentStatus.message}</p>

                    </div>



                    <span

                        className={`instructor-status-badge ${status}`}

                    >

                        {status}

                    </span>

                </div>



                <div className="instructor-verification-details">

                    <div>

                        <span>Account email</span>

                        <strong>{user?.email}</strong>

                    </div>



                    <div>

                        <span>Email verification</span>

                        <strong>

                            {user?.email_verified

                                ? "Verified"

                                : "Not verified"}

                        </strong>

                    </div>



                    <div>

                        <span>Instructor approval</span>

                        <strong>{currentStatus.title}</strong>

                    </div>

                </div>

            </section>



            <section className="instructor-office-card" style={{ marginBottom: "28px" }}>
                <div className="instructor-section-heading" style={{ marginTop: 0 }}>
                    <div>
                        <h2>Appointment Requests</h2>
                        <p>Review student requests and confirm or decline appointments.</p>
                    </div>
                    <button
                        type="button"
                        className="instructor-edit-button"
                        onClick={clearOldHistory}
                        disabled={appointmentsLoading || appointmentActionId !== null}
                        style={{ background: "#dc2626", color: "white", marginRight: "10px" }}
                    >
                        Clear Old History
                    </button>
                    <button
                        type="button"
                        className="instructor-edit-button"
                        onClick={loadAppointments}
                        disabled={appointmentsLoading || appointmentActionId !== null}
                    >
                        {appointmentsLoading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {appointmentMessage && (
                    <p className="instructor-message instructor-success" role="status">
                        {appointmentMessage}
                    </p>
                )}

                {appointmentsError && (
                    <p className="instructor-message instructor-error" role="alert">
                        {appointmentsError}
                    </p>
                )}

                {appointmentsLoading ? (
                    <p>Loading appointment requests...</p>
                ) : appointments.length === 0 ? (
                    <p>No appointment requests yet. New student requests will appear here.</p>
                ) : (
                    <div style={{ display: "grid", gap: "14px" }}>
                        {appointments.map((appointment) => {
                            const pending = appointment.status === "pending";
                            const timeLabel = `${formatTime(appointment.start_time)} – ${formatTime(appointment.end_time)}`;

                            return (
                                <article
                                    key={appointment.appointment_id}
                                    style={{
                                        border: "1px solid #dbe3ef",
                                        borderRadius: "12px",
                                        padding: "18px",
                                        background: "#ffffff"
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                                        <div>
                                            <h3 style={{ margin: "0 0 6px" }}>
                                                {appointment.other_person_name || "Student"}
                                            </h3>
                                            <p style={{ margin: "4px 0" }}>
                                                <strong>{formatAppointmentDate(appointment.appointment_date)}</strong>
                                                {" · "}{timeLabel}
                                            </p>
                                            {appointment.other_person_email && (
                                                <p style={{ margin: "4px 0", color: "#64748b" }}>
                                                    {appointment.other_person_email}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`instructor-schedule-status ${appointment.status === "approved" ? "" : appointment.status === "declined" ? "paused" : ""}`}>
                                            {appointment.status || "pending"}
                                        </span>
                                    </div>

                                    <p style={{ margin: "12px 0 0", whiteSpace: "pre-wrap" }}>
                                        <strong>Reason:</strong>{" "}
                                        {appointment.reason?.trim() || "No reason provided."}
                                    </p>

                                    {pending && (
                                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
                                            <button
                                                type="button"
                                                className="instructor-create-button"
                                                disabled={appointmentActionId !== null}
                                                onClick={() => updateAppointmentStatus(appointment.appointment_id, "approved")}
                                            >
                                                {appointmentActionId === appointment.appointment_id ? "Updating..." : "Approve"}
                                            </button>
                                            <button
                                                type="button"
                                                className="instructor-cancel-button"
                                                disabled={appointmentActionId !== null}
                                                onClick={() => updateAppointmentStatus(appointment.appointment_id, "declined")}
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="instructor-section-heading">
                <h2>Office Hours</h2>

                <p>

                    Set your availability so students can book appointments.

                </p>

            </div>



            <section className="instructor-office-card">

                <button

                    type="button"

                    className="instructor-office-icon"

                    onClick={toggleOfficeHoursForm}

                    disabled={!canCreate}

                    aria-label={

                        showForm

                            ? "Close office hours form"

                            : "Create office hours"

                    }

                    aria-expanded={showForm}

                >

                    <span>+</span>

                </button>



                <h3>

                    {canCreate

                        ? "Manage Your Office Hours"

                        : "Office hours are locked"}

                </h3>



                <p>

                    {canCreate

                        ? "Create weekly availability for students to book appointments."

                        : "Email verification and administrator approval are required before publishing office hours."}

                </p>



                <button

                    type="button"

                    className="instructor-create-button"

                    disabled={!canCreate}

                    onClick={toggleOfficeHoursForm}

                >

                    {showForm ? "Cancel" : "Create Office Hours"}

                </button>

            </section>



           {showForm && canCreate && (

    <section

        ref={formRef}

        className="instructor-form-card"

    >

                    <h3>

                        {editingId !== null

                            ? "Edit Office Hours"

                            : "Create Weekly Office Hours"}

                    </h3>



                    <form onSubmit={handleSubmit} noValidate>

                        <div className="instructor-form-grid">

                            <label>

                                Day of Week

                                <select

                                    name="dayOfWeek"

                                    value={form.dayOfWeek}

                                    onChange={handleChange}

                                >

                                    {DAYS.map((day, index) => (

                                        <option key={day} value={index}>

                                            {day}

                                        </option>

                                    ))}

                                </select>

                            </label>



                            <div>

                                <label

                                    style={{

                                        display: "block",

                                        marginBottom: "8px"

                                    }}

                                >

                                    Start Time

                                </label>

                                {renderTimeSelect("start")}

                            </div>



                            <div>

                                <label

                                    style={{

                                        display: "block",

                                        marginBottom: "8px"

                                    }}

                                >

                                    End Time

                                </label>

                                {renderTimeSelect("end")}

                            </div>



                            <label>

                                Meeting Type

                                <select

                                    name="meetingType"

                                    value={form.meetingType}

                                    onChange={handleChange}

                                >

                                    <option value="in_person">

                                        In Person

                                    </option>

                                    <option value="online">

                                        Online

                                    </option>

                                </select>

                            </label>



                            <label className="instructor-location-field">

                                {form.meetingType === "online"

                                    ? "Meeting Link or Instructions (Optional)"

                                    : "Office Location"}



                                <input

                                    type="text"

                                    name="location"

                                    value={form.location}

                                    onChange={handleChange}

                                    placeholder={

                                        form.meetingType === "online"

                                            ? "e.g. Zoom link or details"

                                            : "e.g. Building A, Room 204"

                                    }

                                    maxLength={255}

                                />

                            </label>

                        </div>



                        {formError && (

                            <p

                                className="instructor-message instructor-error"

                                role="alert"

                            >

                                {formError}

                            </p>

                        )}



                        <div className="instructor-form-actions">

                            <button

                                type="button"

                                className="instructor-cancel-button"

                                onClick={cancelOfficeHoursForm}

                                disabled={saving}

                            >

                                Cancel

                            </button>



                            <button

                                type="submit"

                                className="instructor-create-button"

                                disabled={saving}

                            >

                                {saving

                                    ? "Saving..."

                                    : editingId !== null

                                        ? "Save Changes"

                                        : "Save Office Hours"}

                            </button>

                        </div>

                    </form>

                </section>

            )}



            <section className="instructor-schedule-section">

                <h2>Your Weekly Schedule</h2>



                {success && (

                    <p

                        className="instructor-message instructor-success"

                        role="status"

                    >

                        {success}

                    </p>

                )}



                {(loadError || scheduleError) && (

                    <p

                        className="instructor-message instructor-error"

                        role="alert"

                    >

                        {loadError || scheduleError}

                    </p>

                )}



                {loading ? (

                    <p>Loading office hours...</p>

                ) : officeHours.length === 0 ? (

                    <p>

                        No office hours created yet.

                        Your schedule will appear here.

                    </p>

                ) : (

                    <div className="instructor-schedule-list">

                        {officeHours.map((officeHour) => (

                            <div

                                className="instructor-schedule-item"

                                key={officeHour.office_hour_id}

                            >

                                <div className="instructor-schedule-info">

                                    <h3>

                                        {DAYS[officeHour.day_of_week]}

                                    </h3>



                                    <p>

                                        {formatTime(officeHour.start_time)}

                                        {" - "}

                                        {formatTime(officeHour.end_time)}

                                    </p>



                                    <p>

                                        {officeHour.meeting_type === "online"

                                            ? "Online"

                                            : "In Person"}



                                        {officeHour.location

                                            ? ` • ${officeHour.location}`

                                            : ""}

                                    </p>



                                    {!officeHour.is_active && (

                                        <div className="instructor-pause-details">

                                            {officeHour.pause_reason && (

                                                <p>

                                                    <strong>Reason:</strong>{" "}

                                                    {officeHour.pause_reason}

                                                </p>

                                            )}



                                            {officeHour.pause_note && (

                                                <p>

                                                    <strong>Note:</strong>{" "}

                                                    {officeHour.pause_note}

                                                </p>

                                            )}

                                        </div>

                                    )}

                                </div>



                                <div className="instructor-schedule-controls">

                                    <span

                                        className={`instructor-schedule-status ${

                                            officeHour.is_active

                                                ? ""

                                                : "paused"

                                        }`}

                                    >

                                        {officeHour.is_active

                                            ? "Active"

                                            : "Paused"}

                                    </span>



                                    <button

                                        type="button"

                                        className="instructor-edit-button"

                                        disabled={

                                            !canCreate ||

                                            updatingId !== null ||

                                            saving

                                        }

                                        onClick={() =>

                                            handleEdit(officeHour)

                                        }

                                    >

                                        Edit

                                    </button>



                                    <button

                                        type="button"

                                        className={`instructor-status-button ${

                                            officeHour.is_active

                                                ? "pause"

                                                : "reactivate"

                                        }`}

                                        disabled={

                                            !canCreate ||

                                            updatingId !== null ||

                                            saving

                                        }

                                        onClick={() => {

                                            if (officeHour.is_active) {

                                                openPauseForm(officeHour);

                                            } else {

                                                updateOfficeHourStatus(

                                                    officeHour,

                                                    true

                                                );

                                            }

                                        }}

                                    >

                                        {updatingId ===

                                        officeHour.office_hour_id

                                            ? "Updating..."

                                            : officeHour.is_active

                                                ? "Pause"

                                                : "Reactivate"}

                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </section>



            {pauseTarget && (

                <div

                    className="instructor-pause-overlay"

                    role="presentation"

                >

                    <section

                        className="instructor-pause-modal"

                        role="dialog"

                        aria-modal="true"

                        aria-labelledby="pause-dialog-title"

                    >

                        <h2 id="pause-dialog-title">

                            Pause Office Hours

                        </h2>



                        <p className="instructor-pause-description">

                            {DAYS[pauseTarget.day_of_week]}

                            {" · "}

                            {formatTime(pauseTarget.start_time)}

                            {" - "}

                            {formatTime(pauseTarget.end_time)}

                        </p>



                        <p className="instructor-pause-explanation">

                            This weekly schedule will remain paused

                            until you reactivate it.

                        </p>



                        <form onSubmit={confirmPause}>

                            <fieldset className="instructor-pause-reasons">

                                <legend>Reason (optional)</legend>



                                {[

                                    "Unavailable",

                                    "Sick leave",

                                    "Conference / Meeting",

                                    "Other"

                                ].map((reason) => (

                                    <label key={reason}>

                                        <input

                                            type="radio"

                                            name="pauseReason"

                                            value={reason}

                                            checked={

                                                pauseReason === reason

                                            }

                                            onChange={(event) =>

                                                setPauseReason(

                                                    event.target.value

                                                )

                                            }

                                        />

                                        <span>{reason}</span>

                                    </label>

                                ))}

                            </fieldset>



                            <label className="instructor-pause-note-label">

                                Additional Note (optional)



                                <textarea

                                    value={pauseNote}

                                    onChange={(event) =>

                                        setPauseNote(event.target.value)

                                    }

                                    maxLength={500}

                                    rows={3}

                                    placeholder="e.g. Office hours will resume next week."

                                />

                            </label>



                            {pauseError && (

                                <p

                                    className="instructor-message instructor-error"

                                    role="alert"

                                >

                                    {pauseError}

                                </p>

                            )}



                            <div className="instructor-pause-actions">

                                <button

                                    type="button"

                                    className="instructor-cancel-button"

                                    onClick={closePauseForm}

                                    disabled={updatingId !== null}

                                >

                                    Cancel

                                </button>



                                <button

                                    type="submit"

                                    className="instructor-confirm-pause"

                                    disabled={updatingId !== null}

                                >

                                    {updatingId !== null

                                        ? "Pausing..."

                                        : "Confirm Pause"}

                                </button>

                            </div>

                        </form>

                    </section>

                </div>

            )}

        </div>

    );

}



export default InstructorDashBoard;
