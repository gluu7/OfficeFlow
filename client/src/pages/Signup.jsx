
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState("student");
    const [schoolId, setSchoolId] = useState("");
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadSchools() {
            try {
                const response = await fetch(
                    "http://localhost:3000/api/schools"
                );

                if (!response.ok) {
                    throw new Error("Failed to load schools.");
                }

                const data = await response.json();

                setSchools(
                    Array.isArray(data)
                        ? data
                        : data.schools || []
                );
            } catch {
                setError(
                    "Unable to load schools. Please check your server."
                );
            }
        }

        loadSchools();
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (!schoolId) {
            setError("Please select your school.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:3000/api/auth/signup",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        password,
                        schoolId: Number(schoolId),
                        role
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.message || "Unable to create account."
                );
                return;
            }

            navigate("/login", {
                replace: true,
                state: {
                    message: "Account created! Please sign in."
                }
            });
        } catch {
            setError("Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="signup-page">
            <section className="signup-form-side">
                <Link to="/" className="signup-brand">
                    <span className="navbar-logo">OF</span>
                    <span>OfficeFlow</span>
                </Link>

                <div className="signup-form-container">
                    <h1>Create your account</h1>

                    <p className="signup-subtitle">
                        Sign up to get started with OfficeFlow.
                    </p>

                    
<form onSubmit={handleSubmit}>
    {/* Row 1: Name and Email */}
    <div className="signup-field-row">
        <div className="signup-field">
            <label htmlFor="signup-name">Full name</label>
            <input
                id="signup-name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
            />
        </div>

        <div className="signup-field">
            <label htmlFor="signup-email">Email address</label>
            <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
            />
        </div>
    </div>

    {/* Row 2: School and Role */}
    <div className="signup-field-row">
        <div className="signup-field">
            <label htmlFor="signup-school">School</label>
            <select
                id="signup-school"
                value={schoolId}
                onChange={(event) => setSchoolId(event.target.value)}
                required
            >
                <option value="">Select your school</option>

                {schools.map((school) => (
                    <option
                        key={school.school_id}
                        value={school.school_id}
                    >
                        {school.school_name}
                    </option>
                ))}
            </select>
        </div>

        <div className="signup-field">
            <label htmlFor="signup-role">I am a</label>
            <select
                id="signup-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                required
            >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
            </select>
        </div>
    </div>

    {/* Row 3: Password and Confirmation */}
    <div className="signup-field-row">
        <div className="signup-field">
            <label htmlFor="signup-password">Password</label>
            <input
                id="signup-password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                maxLength={72}
                required
            />
        </div>

        <div className="signup-field">
            <label htmlFor="signup-confirm">
                Confirm password
            </label>
            <input
                id="signup-confirm"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) =>
                    setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                required
            />
        </div>
    </div>

    {/* Error message */}
    {error && (
        <p className="signup-error" role="alert">
            {error}
        </p>
    )}

    {/* Submit button */}
    <button
        type="submit"
        className="signup-submit"
        disabled={loading}
    >
        {loading ? "Creating account..." : "Create Account →"}
    </button>
</form>


                    <p className="signup-signin">
                        Already have an account?{" "}
                        <Link to="/login">
                            Sign In
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}

export default Signup;
