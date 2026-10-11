
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                "https://officeflow-api-f462.onrender.com/api/auth/login",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Unable to sign in.");
                return;
            }

            const dashboardPaths = {
                student: "/dashboard",
                instructor: "/instructor-dashboard",
                admin: "/admin-dashboard"
            };

            const destination = dashboardPaths[data.user?.role];

            if (!destination) {
                setError("Unknown account role.");
                return;
            }

            navigate(destination, { replace: true });
        } catch {
            setError(
                "Unable to connect to the server. Please try again."
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
                    <h1>Welcome back</h1>

                    <p className="login-subtitle">
                        Sign in to your OfficeFlow account.
                    </p>

                    {location.state?.message && (
                        <p className="login-success" role="status">
                            {location.state.message}
                        </p>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="login-field">
                            <label htmlFor="login-email">
                                Email address
                            </label>

                            <input
                                id="login-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="login-field">
                            <label htmlFor="login-password">
                                Password
                            </label>

                            <div className="login-password-wrapper">
                                <input
                                    id="login-password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    autoComplete="current-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="login-show-password"
                                    onClick={() =>
                                        setShowPassword((value) => !value)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="login-error" role="alert">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Signing in..."
                                : "Sign In →"}
                        </button>
                    </form>

                    <p className="login-signup">
                        Don't have an account?{" "}
                        <Link to="/signup">
                            Create an account
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}

export default Login;
