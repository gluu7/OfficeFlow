
import { NavLink } from "react-router-dom";

function SideBar() {
    return (
        <aside className="sidebar">
            <nav className="sidebar-nav">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `sidebar-link ${isActive ? "active" : ""}`
                    }
                >
                    Dashboard
                </NavLink>

                <NavLink
                    to="/appointments"
                    className={({ isActive }) =>
                        `sidebar-link ${isActive ? "active" : ""}`
                    }
                >
                    My Appointments
                </NavLink>

                <NavLink
                    to="/instructors"
                    className={({ isActive }) =>
                        `sidebar-link ${isActive ? "active" : ""}`
                    }
                >
                    Find Instructors
                </NavLink>
            </nav>
        </aside>
    );
}

export default SideBar;
