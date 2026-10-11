
import { useState } from "react";

function EmailVerificationBanner({ user }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState(false);

    if (!user || user.email_verified) {
        return null;
    }

    async function sendEmail() {
        setLoading(true);
        setMessage("");
        setError(false);

        try {
            const response = await fetch(
                "https://officeflow-api-f462.onrender.com/api/email-verification/send",
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to send email."
                );
            }

            setMessage(data.message);
        } catch (err) {
            setError(true);
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                margin: "20px 28px 0",
                padding: "18px 22px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap"
            }}
        >
            <div>
                <strong>Email verification required</strong>
                <p style={{
                    margin: "6px 0 0",
                    color: "#475569"
                }}>
                    Verify {user.email} to complete email
                    verification for your account.
                </p>

                {message && (
                    <p
                        role="status"
                        style={{
                            margin: "8px 0 0",
                            color: error ? "#b91c1c" : "#166534"
                        }}
                    >
                        {message}
                    </p>
                )}
            </div>

            <button
                type="button"
                onClick={sendEmail}
                disabled={loading}
                style={{
                    padding: "11px 17px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "9px",
                    cursor: loading ? "wait" : "pointer",
                    fontWeight: 700
                }}
            >
                {loading
                    ? "Sending..."
                    : "Send Verification Email"}
            </button>
        </div>
    );
}

export default EmailVerificationBanner;
