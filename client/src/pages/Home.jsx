
import { useState } from "react";
import { Link } from "react-router-dom";

const features = [
    {
        title: "Find Instructors",
        icon: "⌕",
        description: "Discover the right instructor",
        detail:
            "Search instructors at your school and explore their office hours.",
        steps: ["Search", "Explore", "Connect"]
    },
    {
        title: "Book Appointments",
        icon: "▦",
        description: "Schedule meetings with ease",
        detail:
            "Choose from available office hours and book a time that works.",
        steps: ["Choose", "Book", "Meet"]
    },
    {
        title: "Manage Availability",
        icon: "◷",
        description: "Stay organized as an instructor",
        detail:
            "Set office hours and manage upcoming student appointments.",
        steps: ["Set hours", "Review", "Manage"]
    }
];

function Home() {
    const [activeFeature, setActiveFeature] = useState(0);
    const feature = features[activeFeature];

    return (
        <div className="home-page">
            <header className="home-navbar">
                <Link to="/" className="home-brand">
                    <span className="navbar-logo">OF</span>
                    <span>OfficeFlow</span>
                </Link>

                <nav className="home-auth-links">
                    <Link to="/login" className="home-signin-link">
                        Sign In
                    </Link>

                    <Link to="/signup" className="home-signup-link">
                        Sign Up
                    </Link>
                </nav>
            </header>

            <main className="home-hero">
                <section className="home-hero-content">
                    <span className="home-eyebrow">
                        OFFICE HOURS MADE SIMPLE
                    </span>

                    <h1>
                        Office hours,
                        <br />
                        without the hassle.
                    </h1>

                    <p>
                        Connect with instructors, discover office
                        hours, and schedule appointments in one
                        convenient place.
                    </p>

                    <div className="home-hero-actions">
                        <Link
                            to="/signup"
                            className="home-primary-button"
                        >
                            Get Started
                            <span aria-hidden="true">→</span>
                        </Link>
                    </div>

                    <div className="home-benefits">
                        <span>✓ Easy scheduling</span>
                        <span>✓ Less back-and-forth</span>
                        <span>✓ Built for your campus</span>
                    </div>
                </section>

                <section className="home-preview">
                    <div className="home-preview-header">
                        <span>EXPLORE OFFICEFLOW</span>
                    </div>

                    <div className="home-feature-options">
                        {features.map((item, index) => (
                            <button
                                key={item.title}
                                type="button"
                                className={
                                    "home-feature-option " +
                                    (activeFeature === index
                                        ? "active"
                                        : "")
                                }
                                onClick={() =>
                                    setActiveFeature(index)
                                }
                                aria-pressed={
                                    activeFeature === index
                                }
                            >
                                <span className="home-feature-icon">
                                    {item.icon}
                                </span>
                                <span>{item.title}</span>
                            </button>
                        ))}
                    </div>

                    <div
                        key={activeFeature}
                        className="home-feature-detail"
                    >
                        <div className="home-feature-symbol">
                            {feature.icon}
                        </div>

                        <h2>{feature.description}</h2>
                        <p>{feature.detail}</p>

                        <div className="home-feature-steps">
                            {feature.steps.map((step, index) => (
                                <div
                                    className="home-feature-step"
                                    key={step}
                                >
                                    <span>{index + 1}</span>
                                    {step}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="home-preview-footer">
                        Explore how OfficeFlow simplifies office hours.
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Home;
