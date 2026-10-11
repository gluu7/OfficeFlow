
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function NavBar({ user }) {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const closeTimerRef = useRef(null);

    const dashboardPaths = {
        student: "/dashboard",
        instructor: "/instructor-dashboard",
        admin: "/admin-dashboard"
    };

    const dashboardPath =
        dashboardPaths[user?.role] || "/dashboard";

    const displayName = user?.display_name || "My Account";

    const initials = displayName
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    function cancelCloseTimer() {
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }

    function openMenu() {
        cancelCloseTimer();
        setMenuOpen(true);
    }

    function scheduleCloseMenu() {
        cancelCloseTimer();

        closeTimerRef.current = setTimeout(() => {
            setMenuOpen(false);
            closeTimerRef.current = null;
        }, 250);
    }

    function closeMenu() {
        cancelCloseTimer();
        setMenuOpen(false);
    }

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                cancelCloseTimer();
                setMenuOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                cancelCloseTimer();
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );

            document.removeEventListener(
                "keydown",
                handleEscape
            );

            cancelCloseTimer();
        };
    }, []);

    async function handleLogout() {
        try {
            const response = await fetch(
                "https://officeflow-api-f462.onrender.com/api/auth/logout",
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            if (!response.ok) {
                throw new Error("Logout failed.");
            }

            closeMenu();
            navigate("/login", { replace: true });
        } catch {
            alert("Unable to log out. Please try again.");
        }
    }

    return (
        <header className="navbar">
            <Link
                to={dashboardPath}
                className="navbar-brand brand-link"
            >
                <span className="navbar-logo">OF</span>
                <span>OfficeFlow</span>
            </Link>

            <div className="navbar-right">
                <span className="navbar-school">
                    {displayName}
                </span>

                <div
                    className="account-menu-wrapper"
                    ref={menuRef}
                    onMouseEnter={openMenu}
                    onMouseLeave={scheduleCloseMenu}
                >
                    <button
                        type="button"
                        className="account-avatar-button"
                        onClick={() => {
                            cancelCloseTimer();
                            setMenuOpen((current) => !current);
                        }}
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label="Open account menu"
                    >
                        {initials}
                    </button>

                    {menuOpen && (
                        <div
                            className="account-dropdown"
                            role="menu"
                            onMouseEnter={openMenu}
                        >
                            <div className="account-dropdown-header">
                                <strong>{displayName}</strong>

                                <span>
                                    {user?.email || ""}
                                </span>
                            </div>

                            <div className="account-dropdown-divider" />

                            <Link
                                to={dashboardPath}
                                className="account-menu-item"
                                role="menuitem"
                                onClick={closeMenu}
                            >
                                My Dashboard
                            </Link>

                            <button
                                type="button"
                                className="account-menu-item account-logout"
                                role="menuitem"
                                onClick={handleLogout}
                            >
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default NavBar;
