
import { useEffect, useState } from "react";
import "./AdminDashboard.css";

const API = "https://officeflow-api-f462.onrender.com/api/admin";

function AdminDashboard() {
    const [overview, setOverview] = useState(null);
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [filter, setFilter] = useState("all");

    async function loadDashboard() {
        const [overviewResponse, instructorsResponse] =
            await Promise.all([
                fetch(`${API}/overview`, {
                    credentials: "include"
                }),
                fetch(`${API}/instructors`, {
                    credentials: "include"
                })
            ]);

        if (!overviewResponse.ok || !instructorsResponse.ok) {
            throw new Error("Unable to load administrator data.");
        }

        const overviewData = await overviewResponse.json();
        const instructorsData = await instructorsResponse.json();

        setOverview(overviewData.overview);
        setInstructors(instructorsData.instructors);
    }

    useEffect(() => {
        let active = true;

        async function initialize() {
            try {
                const [overviewResponse, instructorsResponse] =
                    await Promise.all([
                        fetch(`${API}/overview`, {
                            credentials: "include"
                        }),
                        fetch(`${API}/instructors`, {
                            credentials: "include"
                        })
                    ]);

                if (!overviewResponse.ok || !instructorsResponse.ok) {
                    throw new Error("Unable to load administrator data.");
                }

                const overviewData = await overviewResponse.json();
                const instructorsData = await instructorsResponse.json();

                if (active) {
                    setOverview(overviewData.overview);
                    setInstructors(instructorsData.instructors);
                }
            } catch (err) {
                if (active) setError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        }

        initialize();

        return () => {
            active = false;
        };
    }, []);

    async function updateStatus(instructor, status) {
        const confirmed = window.confirm(
            `Change ${instructor.display_name}'s status to ${status}?`
        );

        if (!confirmed) return;

        setBusyId(instructor.user_id);
        setError("");

        try {
            const response = await fetch(
                `${API}/instructors/${instructor.user_id}/verification`,
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
                    data.message || "Unable to update verification."
                );
            }

            await loadDashboard();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    }

    const filteredInstructors = instructors.filter(
        (instructor) =>
            filter === "all" ||
            instructor.verification_status === filter
    );

    if (loading) {
        return <div className="admin-page">Loading dashboard...</div>;
    }

    return (
        <div className="admin-page">
            <div className="admin-heading">
                <div>
                    <span className="admin-eyebrow">
                        OFFICEFLOW ADMINISTRATION
                    </span>
                    <h1>Admin Dashboard</h1>
                    <p>
                        Review instructor accounts and manage
                        verification requests.
                    </p>
                </div>
                <span className="admin-role-badge">
                    Administrator
                </span>
            </div>

            {error && (
                <div className="admin-error" role="alert">
                    {error}
                </div>
            )}

            {overview && (
                <div className="admin-stats">
                    {[
                        ["Pending", overview.pending],
                        ["Approved", overview.approved],
                        ["Rejected", overview.rejected],
                        ["Revoked", overview.revoked]
                    ].map(([label, value]) => (
                        <div className="admin-stat" key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                        </div>
                    ))}
                </div>
            )}

            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Instructor Verification</h2>
                        <p>
                            Manage registration and approval status.
                        </p>
                    </div>

                    <select
                        value={filter}
                        onChange={(event) =>
                            setFilter(event.target.value)
                        }
                        aria-label="Filter instructors"
                    >
                        <option value="all">All instructors</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="revoked">Revoked</option>
                    </select>
                </div>

                {filteredInstructors.length === 0 ? (
                    <div className="admin-empty">
                        No instructors found for this filter.
                    </div>
                ) : (
                    <div className="admin-instructor-list">
                        {filteredInstructors.map((instructor) => (
                            <article
                                className="admin-instructor"
                                key={instructor.user_id}
                            >
                                <div className="admin-instructor-details">
                                    <div className="admin-instructor-avatar">
                                        {instructor.display_name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div>
                                        <h3>
                                            {instructor.display_name}
                                        </h3>
                                        <p>{instructor.email}</p>
                                        <div className="admin-status-row">
                                            <span
                                                className={
                                                    "admin-status " +
                                                    instructor.verification_status
                                                }
                                            >
                                                {instructor.verification_status}
                                            </span>
                                            <span className="admin-email-status">
                                                Email:{" "}
                                                {instructor.email_verified
                                                    ? "Verified"
                                                    : "Not verified"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-actions">
                                    {instructor.verification_status !==
                                        "approved" && (
                                        <button
                                            className="admin-approve"
                                            disabled={
                                                busyId !== null
                                            }
                                            onClick={() =>
                                                updateStatus(
                                                    instructor,
                                                    "approved"
                                                )
                                            }
                                        >
                                            Approve
                                        </button>
                                    )}

                                    {instructor.verification_status !==
                                        "rejected" && (
                                        <button
                                            className="admin-reject"
                                            disabled={
                                                busyId !== null
                                            }
                                            onClick={() =>
                                                updateStatus(
                                                    instructor,
                                                    "rejected"
                                                )
                                            }
                                        >
                                            Reject
                                        </button>
                                    )}

                                    {instructor.verification_status ===
                                        "approved" && (
                                        <button
                                            className="admin-revoke"
                                            disabled={
                                                busyId !== null
                                            }
                                            onClick={() =>
                                                updateStatus(
                                                    instructor,
                                                    "revoked"
                                                )
                                            }
                                        >
                                            Revoke
                                        </button>
                                    )}

                                    {instructor.verification_status !==
                                        "pending" && (
                                        <button
                                            className="admin-reset"
                                            disabled={
                                                busyId !== null
                                            }
                                            onClick={() =>
                                                updateStatus(
                                                    instructor,
                                                    "pending"
                                                )
                                            }
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default AdminDashboard;
