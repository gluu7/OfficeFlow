
    import { useEffect, useState } from "react";
    import {
        Navigate,
        Outlet,
        Route,
        Routes,
        useLocation,
        useOutletContext
    } from "react-router-dom";

    import Home from "./pages/Home.jsx";
    import Login from "./pages/Login.jsx";
    import Signup from "./pages/Signup.jsx";
    import VerifyEmail from "./pages/VerifyEmail.jsx";

    import StudentDashboard from "./pages/StudentDashBoard.jsx";
    import FindInstructors from "./pages/FindInstructors.jsx";
    import InstructorProfile from "./pages/InstructorProfile.jsx";
    import MyAppointments from "./pages/MyAppointments.jsx";

    import InstructorDashBoard from "./pages/InstructorDashBoard.jsx";
    import AdminDashboard from "./pages/AdminDashBoard.jsx";

    import NavBar from "./components/NavBar.jsx";
    import SideBar from "./components/SideBar.jsx";
    import EmailVerificationBanner from "./components/EmailVerificationBanner.jsx";

    import "./App.css";

    const API_URL = "http://localhost:3000";

    function ProtectedRoute({ role }) {
        const [user, setUser] = useState(null);
        const [loading, setLoading] = useState(true);
        const location = useLocation();

        useEffect(() => {
            let active = true;

            async function checkSession() {
                try {
                    const response = await fetch(
                        `${API_URL}/api/auth/me`,
                        { credentials: "include" }
                    );

                    if (!response.ok) {
                        if (active) {
                            setUser(null);
                        }
                        return;
                    }

                    const data = await response.json();

                    if (active) {
                        setUser(data.user);
                    }
                } catch {
                    if (active) {
                        setUser(null);
                    }
                } finally {
                    if (active) {
                        setLoading(false);
                    }
                }
            }

            checkSession();

            return () => {
                active = false;
            };
        }, []);

        if (loading) {
            return (
                <div className="auth-loading">
                    Checking your session...
                </div>
            );
        }

        if (!user) {
            return (
                <Navigate
                    to="/login"
                    state={{ from: location }}
                    replace
                />
            );
        }

        if (user.role !== role) {
            const dashboardPaths = {
                student: "/dashboard",
                instructor: "/instructor-dashboard",
                admin: "/admin-dashboard"
            };

            return (
                <Navigate
                    to={dashboardPaths[user.role] || "/login"}
                    replace
                />
            );
        }

        return <Outlet context={{ user }} />;
    }

    function StudentLayout() {
        const { user } = useOutletContext();

        return (
            <div className="app">
                <NavBar user={user} />

                <EmailVerificationBanner user={user} />

                <div className="dashboard-layout">
                    <SideBar />

                    <main className="app-content">
                        <Outlet context={{ user }} />
                    </main>
                </div>
            </div>
        );
    }

    function InstructorLayout() {
        const { user } = useOutletContext();

        return (
            <div className="app">
                <NavBar user={user} />

                <EmailVerificationBanner user={user} />

                <main className="app-content">
                    <Outlet context={{ user }} />
                </main>
            </div>
        );
    }

    function AdminLayout() {
        const { user } = useOutletContext();

        return (
            <div className="app">
                <NavBar user={user} />

                <EmailVerificationBanner user={user} />

                <main className="app-content">
                    <Outlet context={{ user }} />
                </main>
            </div>
        );
    }

    function App() {
        return (
            <Routes>
                {/* PUBLIC */}

                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                    path="/verify-email"
                    element={<VerifyEmail />}
                />

                {/* STUDENT */}

                <Route
                    element={<ProtectedRoute role="student" />}
                >
                    <Route element={<StudentLayout />}>
                        <Route
                            path="/dashboard"
                            element={<StudentDashboard />}
                        />

                        <Route
                            path="/appointments"
                            element={<MyAppointments />}
                        />

                        <Route
                            path="/instructors"
                            element={<FindInstructors />}
                        />

                        <Route
                            path="/instructors/:instructorId"
                            element={<InstructorProfile />}
                        />
                    </Route>
                </Route>

                {/* INSTRUCTOR */}

                <Route
                    element={<ProtectedRoute role="instructor" />}
                >
                    <Route element={<InstructorLayout />}>
                        <Route
                            path="/instructor-dashboard"
                            element={<InstructorDashBoard />}
                        />
                    </Route>
                </Route>

                {/* ADMIN */}

                <Route
                    element={<ProtectedRoute role="admin" />}
                >
                    <Route element={<AdminLayout />}>
                        <Route
                            path="/admin-dashboard"
                            element={<AdminDashboard />}
                        />
                    </Route>
                </Route>

                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        );
    }

    export default App;
