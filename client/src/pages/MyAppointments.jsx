

import { useEffect, useState } from "react";

const API_URL = "https://officeflow-api-f462.onrender.com";

function formatTime(time) {

  if (!time) return "";

  const [hour, minute] = time.split(":");

  const hour24 = Number(hour);

  return `${hour24 % 12 || 12}:${minute} ${

    hour24 >= 12 ? "PM" : "AM"

  }`;

}

function formatDate(dateString) {

  if (!dateString) return "";

  const datePart = String(dateString).slice(0, 10);

  const [year, month, day] = datePart.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {

    weekday: "long",

    month: "long",

    day: "numeric",

    year: "numeric"

  });

}

function MyAppointments() {

  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [cancellingId, setCancellingId] = useState(null);

  const [filter, setFilter] = useState("all");

    async function clearOldHistory() {
        const confirmed = window.confirm(
        "Clear cancelled, declined, and past appointments? " +
        "Upcoming pending and approved appointments will be kept."
    );

    if (!confirmed) return;

    // Keep your existing fetch request here.
    // It sends DELETE /api/appointments/history/old
    // and refreshes the appointment list afterward.


        setError("");
        setSuccess("");
        try {
            const response = await fetch(`${API_URL}/api/appointments/history/old`, {
                method: "DELETE",
                credentials: "include"
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to clear history.");
            await loadAppointments();
            setSuccess(data.message || "Old appointment history cleared.");
        } catch (err) {
            setError(err.message || "Unable to clear history.");
        }
    }

  async function loadAppointments() {

    setLoading(true);

    setError("");

    try {

      const response = await fetch(

        `${API_URL}/api/appointments/mine`,

        {

          credentials: "include"

        }

      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(

          data.message || "Unable to load appointments."

        );

      }

      setAppointments(data.appointments || []);

    } catch (err) {

      setError(err.message || "Unable to load appointments.");

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    loadAppointments();

  }, []);

  async function cancelAppointment(appointmentId) {

    if (cancellingId !== null) return;

    const confirmed = window.confirm(

      "Are you sure you want to cancel this appointment?"

    );

    if (!confirmed) return;

    setCancellingId(appointmentId);

    setError("");

    setSuccess("");

    try {

      const response = await fetch(

        `${API_URL}/api/appointments/${appointmentId}/cancel`,

        {

          method: "PATCH",

          credentials: "include"

        }

      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(

          data.message || "Unable to cancel appointment."

        );

      }

      setAppointments((previous) =>

        previous.map((appointment) =>

          appointment.appointment_id === appointmentId

            ? {

              ...appointment,

              status: "cancelled"

            }

            : appointment

        )

      );

      setSuccess("Appointment cancelled successfully.");

    } catch (err) {

      setError(err.message || "Unable to cancel appointment.");

    } finally {

      setCancellingId(null);

    }

  }

  const filteredAppointments = appointments.filter(

    (appointment) =>

      filter === "all" || appointment.status === filter

  );

  const counts = {

    all: appointments.length,

    pending: appointments.filter(

      (appointment) => appointment.status === "pending"

    ).length,

    approved: appointments.filter(

      (appointment) => appointment.status === "approved"

    ).length,

    declined: appointments.filter(

      (appointment) => appointment.status === "declined"

    ).length,

    cancelled: appointments.filter(

      (appointment) => appointment.status === "cancelled"

    ).length

  };

  return (

    <div className="appointments-page">

      <div

        style={{

          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          flexWrap: "wrap",

          gap: "12px"

        }}

      >

        <div>

          <h1>My Appointments</h1>

          <p>

            View and manage your office hour appointments.

          </p>

        </div>

        <button type="button" onClick={clearOldHistory}
          disabled={loading || cancellingId !== null}
          style={{ background: "#dc2626", color: "white", padding: "10px 16px", border: "none", borderRadius: "8px", cursor: "pointer", marginRight: "10px" }}>
          Clear Old History
        </button>

        <button

          type="button"

          onClick={loadAppointments}

          disabled={loading}

          style={{

            padding: "10px 18px",

            borderRadius: "8px",

            border: "1px solid #d1d5db",

            cursor: "pointer"

          }}

        >

          {loading ? "Loading..." : "Refresh"}

        </button>

      </div>

      <div

        style={{

          display: "flex",

          gap: "10px",

          flexWrap: "wrap",

          margin: "24px 0"

        }}

      >

        {[

          "all",

          "pending",

          "approved",

          "declined",

          "cancelled"

        ].map((status) => (

          <button

            key={status}

            type="button"

            onClick={() => setFilter(status)}

            style={{

              padding: "10px 16px",

              borderRadius: "8px",

              border: filter === status

                ? "2px solid #2563eb"

                : "1px solid #d1d5db",

              background: filter === status

                ? "#eff6ff"

                : "#ffffff",

              color: "#1f2937",

              cursor: "pointer"

            }}

          >

            {status.charAt(0).toUpperCase() +

              status.slice(1)}

            {" "}

            ({counts[status]})

          </button>

        ))}

      </div>

      {error && (

        <p

          role="alert"

          style={{ color: "#dc2626", marginBottom: "16px" }}

        >

          {error}

        </p>

      )}

      {success && (

        <p

          role="status"

          style={{ color: "#15803d", marginBottom: "16px" }}

        >

          {success}

        </p>

      )}

      {loading ? (

        <p>Loading appointments...</p>

      ) : filteredAppointments.length === 0 ? (

        <div className="appointments-empty">

          <h2>

            {filter === "all"

              ? "No appointments yet"

              : `No ${filter} appointments`}

          </h2>

          <p>

            {filter === "all"

              ? "You haven't booked any appointments. Find an instructor to get started."

              : "There are no appointments with this status."}

          </p>

        </div>

      ) : (

        <div

          style={{

            display: "grid",

            gap: "18px",

            marginTop: "20px"

          }}

        >

          {filteredAppointments.map((appointment) => {

            const canCancel =

              ["pending", "approved"].includes(

                appointment.status

              ) &&

              new Date(

                `${String(

                  appointment.appointment_date

                ).slice(0, 10)}T${appointment.start_time}`

              ).getTime() > Date.now();

            const statusColors = {

              pending: {

                background: "#fef3c7",

                color: "#92400e"

              },

              approved: {

                background: "#dcfce7",

                color: "#166534"

              },

              declined: {

                background: "#fee2e2",

                color: "#991b1b"

              },

              cancelled: {

                background: "#f3f4f6",

                color: "#4b5563"

              }

            };

            return (

              <div

                key={appointment.appointment_id}

                style={{

                  background: "#ffffff",

                  padding: "24px",

                  borderRadius: "12px",

                  border: "1px solid #e5e7eb",

                  boxShadow:

                    "0 2px 8px rgba(0,0,0,0.04)"

                }}

              >

                <div

                  style={{

                    display: "flex",

                    justifyContent:

                      "space-between",

                    alignItems: "center",

                    flexWrap: "wrap",

                    gap: "12px"

                  }}

                >

                  <h2 style={{ margin: 0 }}>

                    {appointment.other_person_name ||

                      "Instructor"}

                  </h2>

                  <span

                    style={{

                      padding: "6px 12px",

                      borderRadius: "20px",

                      fontWeight: 600,

                      textTransform: "capitalize",

                      ...(

                        statusColors[

                          appointment.status

                        ] || statusColors.cancelled

                      )

                    }}

                  >

                    {appointment.status}

                  </span>

                </div>

                <p>

                  <strong>Date:</strong>{" "}

                  {formatDate(

                    appointment.appointment_date

                  )}

                </p>

                <p>

                  <strong>Time:</strong>{" "}

                  {formatTime(appointment.start_time)}

                  {" - "}

                  {formatTime(appointment.end_time)}

                </p>

                <p>

                  <strong>Reason:</strong>{" "}

                  {appointment.reason ||

                    "No reason provided"}

                </p>

                {appointment.status === "pending" && (

                  <p>

                    Waiting for instructor approval.

                  </p>

                )}

                {appointment.status === "approved" && (

                  <p>

                    Your appointment has been approved.

                  </p>

                )}

                {canCancel && (

                  <button

                    type="button"

                    onClick={() =>

                      cancelAppointment(

                        appointment.appointment_id

                      )

                    }

                    disabled={cancellingId !== null}

                    style={{

                      marginTop: "12px",

                      padding: "10px 16px",

                      borderRadius: "8px",

                      border: "1px solid #dc2626",

                      background: "#ffffff",

                      color: "#dc2626",

                      fontWeight: 600,

                      cursor: "pointer"

                    }}

                  >

                    {cancellingId ===

                    appointment.appointment_id

                      ? "Cancelling..."

                      : "Cancel Appointment"}

                  </button>

                )}

              </div>

            );

          })}

        </div>

      )}

    </div>

  );

}

export default MyAppointments;
