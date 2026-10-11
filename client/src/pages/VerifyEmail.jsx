
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState("");

    async function handleVerify() {
        if (!token || loading || success) {
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const response = await fetch(
                "http://localhost:3000/api/email-verification/confirm",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ token })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Email verification failed."
                );
            }

            setSuccess(true);
            setMessage(
                data.message ||
                "Your email has been verified successfully!"
            );
        } catch (error) {
            setMessage(
                error.message ||
                "Unable to verify your email. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <section className="login-card">
                <Link to="/" className="login-brand">
                    <span className="navbar-logo">OF</span>
                    <span>OfficeFlow</span>
                </Link>

                <div className="login-content">
                    <h1>Verify Your Email</h1>

                    <p className="login-subtitle">
                        Confirm your email address to complete
                        your OfficeFlow account setup.
                    </p>

                    {!token && (
                        <p className="login-error" role="alert">
                            Invalid verification link.
                            Please request a new email.
                        </p>
                    )}

                    {message && (
                        <p
                            className={
                                success
                                    ? "login-success"
                                    : "login-error"
                            }
                            role="status"
                        >
                            {message}
                        </p>
                    )}

                    {token && !success && (
                        <button
                            type="button"
                            className="login-submit"
                            onClick={handleVerify}
                            disabled={loading}
                        >
                            {loading
                                ? "Verifying..."
                                : "Verify My Email"}
                        </button>
                    )}

                    {success && (
                        <p className="login-success">
                            Your email is now verified.
                            You can return to your dashboard.
                        </p>
                    )}

                    <p className="login-signup">
                        <Link to="/login">
                            Continue to Sign In
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}

export default VerifyEmail;
