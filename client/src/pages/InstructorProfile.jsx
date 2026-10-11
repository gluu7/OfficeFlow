
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInstructors } from "../services/api.js";
const API_URL = "http://localhost:3000";
const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];
function formatTime(time) {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    const hour24 = Number(hour);
    return `${hour24 % 12 || 12}:${minute} ${
        hour24 >= 12 ? "PM" : "AM"
    }`;
}
function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function nextDateForDay(dayOfWeek) {
    const date = new Date();
    const difference = (dayOfWeek - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + difference);
    return localDateString(date);
}
function minutesFromTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}
function generateTimeSlots(officeHour, appointmentDate) {
    if (!officeHour || !appointmentDate) {
        return [];
    }
    const date = new Date(`${appointmentDate}T12:00:00`);
    if (date.getDay() !== Number(officeHour.day_of_week)) {
        return [];
    }
    const officeStart = minutesFromTime(officeHour.start_time);
    const officeEnd = minutesFromTime(officeHour.end_time);
    // Start at the next half-hour boundary if necessary.
    let start = Math.ceil(officeStart / 30) * 30;
    // Do not offer times that have already passed today.
    if (appointmentDate === localDateString(new Date())) {
        const now = new Date();
        const currentMinutes =
            now.getHours() * 60 + now.getMinutes();
        start = Math.max(
            start,
            Math.ceil((currentMinutes + 1) / 30) * 30
        );
    }
    const slots = [];
    for (
        let time = start;
        time + 30 <= officeEnd;
        time += 30
    ) {
        const startHour = String(
            Math.floor(time / 60)
        ).padStart(2, "0");
        const startMinute = String(time % 60).padStart(2, "0");
        slots.push({
            value: `${startHour}:${startMinute}`,
            label: `${formatTime(`${startHour}:${startMinute}`)} – ${
                formatTime(
                    `${String(Math.floor((time + 30) / 60)).padStart(2, "0")}:${String((time + 30) % 60).padStart(2, "0")}`
                )
            }`
        });
    }
    return slots;
}
function InstructorProfile() {
    const { instructorId } = useParams();
    const navigate = useNavigate();
    const [instructor, setInstructor] = useState(null);
    const [officeHours, setOfficeHours] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [scheduleError, setScheduleError] = useState("");
    const [bookingOfficeHour, setBookingOfficeHour] = useState(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedStartTime, setSelectedStartTime] = useState("");
    const [reason, setReason] = useState("");
    const [bookingError, setBookingError] = useState("");
    const [bookingMessage, setBookingMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState("");
    useEffect(() => {
        let active = true;
        async function loadInstructor() {
            try {
                setLoading(true);
                setError("");
                setScheduleError("");
                setInstructor(null);
                setOfficeHours([]);
                const data = await getInstructors();
                const instructors = data.instructors || [];
                const selectedInstructor = instructors.find(
                    (item) =>
                        Number(item.user_id) === Number(instructorId)
                );
                if (!selectedInstructor) {
                    if (active) {
                        setError("Instructor not found.");
                    }
                    return;
                }
                if (active) {
                    setInstructor(selectedInstructor);
                }
                const response = await fetch(
                    `${API_URL}/api/office-hours/instructor/${instructorId}`,
                    {
                        credentials: "include"
                    }
                );
                const scheduleData = await response.json();
                if (!response.ok) {
                    throw new Error(
                        scheduleData.message ||
                        "Unable to load office hours."
                    );
                }
                if (active) {
                    setOfficeHours(scheduleData.officeHours || []);
                }
            } catch (err) {
                if (active) {
                    if (!instructor) {
                        setError("Unable to load instructor.");
                    } else {
                        setScheduleError(
                            err.message ||
                            "Unable to load office hours."
                        );
                    }
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
        loadInstructor();
        return () => {
            active = false;
        };
    }, [instructorId]);
    function openBooking(officeHour) {
        setBookingOfficeHour(officeHour);
        setSelectedDate(
            nextDateForDay(Number(officeHour.day_of_week))
        );
        setSelectedStartTime("");
        setReason("");
        setBookingError("");
        setBookingMessage("");
    }
    function closeBooking() {
        if (submitting) return;
        setBookingOfficeHour(null);
        setSelectedDate("");
        setSelectedStartTime("");
        setReason("");
        setBookingError("");
        setBookingMessage("");
    }
    useEffect(() => {
        if (!bookingOfficeHour || !selectedDate) {
            setBookedSlots([]);
            setAvailabilityError("");
            setAvailabilityLoading(false);
            return;
        }

        const controller = new AbortController();

        async function loadAvailability() {
            setAvailabilityLoading(true);
            setAvailabilityError("");
            setBookedSlots([]);
            setSelectedStartTime("");

            try {
                const params = new URLSearchParams({
                    officeHourId: String(bookingOfficeHour.office_hour_id),
                    appointmentDate: selectedDate
                });
                const response = await fetch(
                    `${API_URL}/api/appointments/availability?${params}`,
                    {
                        credentials: "include",
                        signal: controller.signal
                    }
                );
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Unable to load availability."
                    );
                }

                if (!Array.isArray(data.bookedSlots)) {
                    throw new Error("Unexpected availability response.");
                }

                if (!controller.signal.aborted) {
                    setBookedSlots(data.bookedSlots);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setAvailabilityError(
                        err.message || "Unable to load availability."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setAvailabilityLoading(false);
                }
            }
        }

        loadAvailability();
        return () => controller.abort();
    }, [bookingOfficeHour, selectedDate]);

    const availableSlots = bookingOfficeHour
        ? generateTimeSlots(bookingOfficeHour, selectedDate).map((slot) => {
            const slotStart = minutesFromTime(slot.value);
            const slotEnd = slotStart + 30;
            const isBooked = bookedSlots.some((booked) => {
                const bookedStart = minutesFromTime(booked.start_time);
                const bookedEnd = minutesFromTime(booked.end_time);
                return slotStart < bookedEnd && slotEnd > bookedStart;
            });
            return { ...slot, isBooked };
        })
        : [];

    async function submitAppointment(event) {
        event.preventDefault();
        if (!bookingOfficeHour) return;

        if (
            availabilityLoading ||
            availabilityError ||
            !availableSlots.some(
                (slot) => slot.value === selectedStartTime && !slot.isBooked
            )
        ) {
            setBookingError("Please choose an available appointment time.");
            return;
        }
        setBookingError("");
        setBookingMessage("");
        if (!selectedDate || !selectedStartTime) {
            setBookingError(
                "Please select a date and an available time."
            );
            return;
        }
        if (reason.length > 500) {
            setBookingError(
                "Your reason must be 500 characters or fewer."
            );
            return;
        }
        setSubmitting(true);
        try {
            const response = await fetch(
                `${API_URL}/api/appointments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        officeHourId:
                            bookingOfficeHour.office_hour_id,
                        appointmentDate: selectedDate,
                        startTime: selectedStartTime,
                        reason: reason.trim()
                    })
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to submit appointment request."
                );
            }
            setBookingMessage(
                data.message ||
                "Appointment request submitted successfully."
            );
            const bookedEndMinutes = minutesFromTime(selectedStartTime) + 30;
            const bookedEndTime =
                `${String(Math.floor(bookedEndMinutes / 60)).padStart(2, "0")}:` +
                `${String(bookedEndMinutes % 60).padStart(2, "0")}:00`;
            setBookedSlots((previous) => [
                ...previous,
                { start_time: selectedStartTime, end_time: bookedEndTime }
            ]);
            setSelectedStartTime("");
            setReason("");
        } catch (err) {
            setBookingError(
                err.message ||
                "Unable to submit appointment request."
            );
        } finally {
            setSubmitting(false);
        }
    }
    return (
        <div className="instructor-profile">
            <button
                type="button"
                className="profile-back"
                onClick={() => navigate("/instructors")}
            >
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                </svg>
                <span>Back to Search</span>
            </button>
            <div className="dashboard-section">
                {loading && <p>Loading instructor...</p>}
                {error && <p role="alert">{error}</p>}
                {!loading && !error && instructor && (
                    <>
                        <h1 className="page-title">
                            {instructor.display_name}
                        </h1>
                        <p className="page-description">
                            Instructor
                        </p>
                        <div className="profile-office-heading">
                            <h2>Weekly Office Hours</h2>
                            <p>
                                View this instructor's regular
                                availability and request an appointment.
                            </p>
                        </div>
                        {scheduleError && (
                            <p role="alert">{scheduleError}</p>
                        )}
                        {!scheduleError &&
                            officeHours.length === 0 && (
                                <div className="profile-empty-hours">
                                    <p>
                                        No office hours have been
                                        scheduled yet.
                                    </p>
                                </div>
                            )}
                        {!scheduleError &&
                            officeHours.length > 0 && (
                                <div className="profile-hours-list">
                                    {officeHours.map((officeHour) => (
                                        <div
                                            className="profile-hours-card"
                                            key={officeHour.office_hour_id}
                                        >
                                            <div className="profile-hours-info">
                                                <h3>
                                                    {DAYS[
                                                        officeHour.day_of_week
                                                    ]}
                                                </h3>
                                                <p className="profile-hours-time">
                                                    {formatTime(
                                                        officeHour.start_time
                                                    )}
                                                    {" – "}
                                                    {formatTime(
                                                        officeHour.end_time
                                                    )}
                                                </p>
                                                <p className="profile-hours-location">
                                                    {officeHour.meeting_type ===
                                                    "online"
                                                        ? "Online"
                                                        : "In Person"}
                                                    {officeHour.location
                                                        ? ` • ${officeHour.location}`
                                                        : ""}
                                                </p>
                                                {!officeHour.is_active && (
                                                    <div className="profile-pause-info">
                                                        {officeHour.pause_reason && (
                                                            <p>
                                                                <strong>
                                                                    Reason:
                                                                </strong>{" "}
                                                                {officeHour.pause_reason}
                                                            </p>
                                                        )}
                                                        {officeHour.pause_note && (
                                                            <p>
                                                                <strong>
                                                                    Note:
                                                                </strong>{" "}
                                                                {officeHour.pause_note}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="profile-hours-actions">
                                                <span
                                                    className={`profile-hours-status ${
                                                        officeHour.is_active
                                                            ? "active"
                                                            : "paused"
                                                    }`}
                                                >
                                                    {officeHour.is_active
                                                        ? "Available"
                                                        : "Paused"}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="profile-book-button"
                                                    disabled={
                                                        !officeHour.is_active
                                                    }
                                                    title={
                                                        officeHour.is_active
                                                            ? "Request an appointment"
                                                            : "Office hours are paused"
                                                    }
                                                    onClick={() =>
                                                        openBooking(officeHour)
                                                    }
                                                >
                                                    {officeHour.is_active
                                                        ? "Book Appointment"
                                                        : "Unavailable"}
                                                </button>
                                            </div>
                                            {bookingOfficeHour &&
                                                Number(
                                                    bookingOfficeHour.office_hour_id
                                                ) ===
                                                    Number(
                                                        officeHour.office_hour_id
                                                    ) && (
                                                    <div
                                                        className="profile-booking-form"
                                                        style={{
                                                            flexBasis: "100%",
                                                            width: "100%",
                                                            marginTop: "20px",
                                                            padding: "24px",
                                                            border: "1px solid #dbe3ef",
                                                            borderRadius: "12px",
                                                            background: "#f8fafc",
                                                            boxSizing: "border-box"
                                                        }}
                                                    >
                                                        <h3>
                                                            Request an Appointment
                                                        </h3>
                                                        <p>
                                                            {DAYS[
                                                                officeHour.day_of_week
                                                            ]}{" "}
                                                            office hours
                                                        </p>
                                                        <form
                                                            onSubmit={
                                                                submitAppointment
                                                            }
                                                        >
                                                            <div
                                                                style={{
                                                                    display: "grid",
                                                                    gridTemplateColumns:
                                                                        "repeat(auto-fit, minmax(220px, 1fr))",
                                                                    gap: "16px"
                                                                }}
                                                            >
                                                                <div>
                                                                    <label
                                                                        htmlFor="appointment-date"
                                                                        style={{
                                                                            display: "block",
                                                                            marginBottom: "8px",
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        Appointment date
                                                                    </label>
                                                                    <input
                                                                        id="appointment-date"
                                                                        type="date"
                                                                        min={localDateString(
                                                                            new Date()
                                                                        )}
                                                                        value={selectedDate}
                                                                        required
                                                                        onChange={(
                                                                            event
                                                                        ) => {
                                                                            setSelectedDate(
                                                                                event.target.value
                                                                            );
                                                                            setSelectedStartTime(
                                                                                ""
                                                                            );
                                                                            setBookingError(
                                                                                ""
                                                                            );
                                                                            setBookingMessage(
                                                                                ""
                                                                            );
                                                                        }}
                                                                        style={{
                                                                            width: "100%",
                                                                            boxSizing: "border-box",
                                                                            padding: "12px",
                                                                            border: "1px solid #cbd5e1",
                                                                            borderRadius: "8px",
                                                                            font: "inherit"
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label
                                                                        htmlFor="appointment-time"
                                                                        style={{
                                                                            display: "block",
                                                                            marginBottom: "8px",
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        Available time
                                                                    </label>
                                                                    {availabilityLoading && (
                                                            <p>Checking available times...</p>
                                                        )}
                                                        {availabilityError && (
                                                            <p role="alert" style={{ color: "#dc2626" }}>
                                                                {availabilityError}
                                                            </p>
                                                        )}
                                                        <select
                                                                        id="appointment-time"
                                                                        value={selectedStartTime}
                                                                        required
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            setSelectedStartTime(
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                        style={{
                                                                            width: "100%",
                                                                            boxSizing: "border-box",
                                                                            padding: "12px",
                                                                            border: "1px solid #cbd5e1",
                                                                            borderRadius: "8px",
                                                                            font: "inherit"
                                                                        }}
                                                                    >
                                                                        <option value="">
                                                                            Select a time
                                                                        </option>
                {availableSlots.map((slot) => (
                                                            <option
                                                                key={slot.value}
                                                                value={slot.value}
                                                                disabled={slot.isBooked || availabilityLoading || !!availabilityError}
                                                            >
                                                                {slot.label} — {slot.isBooked ? "Booked" : "Available"}
                                                            </option>
                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            {selectedDate &&
                                                                availableSlots.length ===
                                                                    0 && (
                                                                    <p
                                                                        style={{
                                                                            color: "#b45309",
                                                                            marginTop: "12px"
                                                                        }}
                                                                    >
                                                                        {new Date(
                                                                            `${selectedDate}T12:00:00`
                                                                        ).getDay() !==
                                                                        Number(
                                                                            officeHour.day_of_week
                                                                        )
                                                                            ? `Please select a ${DAYS[officeHour.day_of_week]}.`
                                                                            : "No future 30-minute slots are available for this date. Please choose another date."}
                                                                    </p>
                                                                )}
                                                            <div
                                                                style={{
                                                                    marginTop: "16px"
                                                                }}
                                                            >
                                                                <label
                                                                    htmlFor="appointment-reason"
                                                                    style={{
                                                                        display: "block",
                                                                        marginBottom: "8px",
                                                                        fontWeight: 600
                                                                    }}
                                                                >
                                                                    Reason for appointment
                                                                    <span
                                                                        style={{
                                                                            fontWeight: 400
                                                                        }}
                                                                    >
                                                                        {" "}
                                                                        (optional)
                                                                    </span>
                                                                </label>
                                                                <textarea
                                                                    id="appointment-reason"
                                                                    value={reason}
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setReason(
                                                                            event.target.value
                                                                        )
                                                                    }
                                                                    maxLength={500}
                                                                    rows={3}
                                                                    placeholder="What would you like to discuss?"
                                                                    style={{
                                                                        width: "100%",
                                                                        boxSizing: "border-box",
                                                                        padding: "12px",
                                                                        border: "1px solid #cbd5e1",
                                                                        borderRadius: "8px",
                                                                        font: "inherit",
                                                                        resize: "vertical"
                                                                    }}
                                                                />
                                                                <small>
                                                                    {reason.length}/500
                                                                    characters
                                                                </small>
                                                            </div>
                                                            {bookingError && (
                                                                <p
                                                                    role="alert"
                                                                    style={{
                                                                        color: "#b91c1c",
                                                                        marginTop: "16px"
                                                                    }}
                                                                >
                                                                    {bookingError}
                                                                </p>
                                                            )}
                                                            {bookingMessage && (
                                                                <p
                                                                    role="status"
                                                                    style={{
                                                                        color: "#047857",
                                                                        marginTop: "16px"
                                                                    }}
                                                                >
                                                                    {bookingMessage}
                                                                </p>
                                                            )}
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    flexWrap: "wrap",
                                                                    gap: "12px",
                                                                    marginTop: "20px"
                                                                }}
                                                            >
                                                                <button
                                                                    type="submit"
                                                                    className="profile-book-button"
                                                                    disabled={
                                                                        submitting ||
                                                                        availabilityLoading ||
                                                            !!availabilityError ||
                                                            !selectedStartTime ||
                                                                        availableSlots.length ===
                                                                            0
                                                                    }
                                                                >
                                                                    {submitting
                                                                        ? "Submitting..."
                                                                        : "Submit Request"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        closeBooking
                                                                    }
                                                                    disabled={
                                                                        submitting
                                                                    }
                                                                    style={{
                                                                        padding: "10px 18px",
                                                                        border: "1px solid #cbd5e1",
                                                                        borderRadius: "8px",
                                                                        background: "#ffffff",
                                                                        cursor: submitting
                                                                            ? "not-allowed"
                                                                            : "pointer",
                                                                        font: "inherit"
                                                                    }}
                                                                >
                                                                    Close
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            )}
                    </>
                )}
            </div>
        </div>
    );
}
export default InstructorProfile;
