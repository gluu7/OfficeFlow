
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInstructors } from "../services/api";

function FindInstructors() {
    const navigate = useNavigate();

    const [search, setSearch] = useState("");
    const [instructors, setInstructors] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const listId = useId();

    useEffect(() => {
        getInstructors()
            .then((data) => setInstructors(data.instructors))
            .catch(() => setError("Failed to load instructors."))
            .finally(() => setLoading(false));
    }, []);

    const query = search.trim().toLowerCase();

    const suggestions = query
        ? instructors.filter((instructor) =>
            instructor.display_name.toLowerCase().includes(query)
        ).slice(0, 6)
        : [];

    const dropdownOpen =
        showSuggestions && query !== "" && !loading && !error;

    function selectInstructor(instructor) {
        setSearch(instructor.display_name);
        setResults([instructor]);
        setShowSuggestions(false);
        setActiveIndex(-1);
    }

    function handleSearch(event) {
        event.preventDefault();

        if (
            dropdownOpen &&
            activeIndex >= 0 &&
            activeIndex < suggestions.length
        ) {
            selectInstructor(suggestions[activeIndex]);
            return;
        }

        setResults(
            query
                ? instructors.filter((instructor) =>
                    instructor.display_name.toLowerCase().includes(query)
                )
                : null
        );

        setShowSuggestions(false);
        setActiveIndex(-1);
    }

    function handleKeyDown(event) {
        if (event.key === "Escape") {
            setShowSuggestions(false);
            setActiveIndex(-1);
        } else if (event.key === "ArrowDown" && suggestions.length) {
            event.preventDefault();
            setShowSuggestions(true);
            setActiveIndex((index) =>
                index < suggestions.length - 1 ? index + 1 : 0
            );
        } else if (event.key === "ArrowUp" && suggestions.length) {
            event.preventDefault();
            setShowSuggestions(true);
            setActiveIndex((index) =>
                index <= 0 ? suggestions.length - 1 : index - 1
            );
        }
    }

    return (
        <div className="find-instructors">
            <h1 className="page-title">Find Instructors</h1>

            <p className="page-description">
                Search for instructors and explore their office hours.
            </p>

            <form className="instructor-search" onSubmit={handleSearch}>
                <div className="search-input-wrapper">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>

                    <input
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={dropdownOpen}
                        aria-controls={listId}
                        aria-activedescendant={
                            dropdownOpen && activeIndex >= 0
                                ? `${listId}-${activeIndex}`
                                : undefined
                        }
                        placeholder="Search instructors by name..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setShowSuggestions(true);
                            setActiveIndex(-1);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setShowSuggestions(false)}
                        onKeyDown={handleKeyDown}
                    />

                    <span className="search-enter-hint">Enter ↵</span>
                </div>

                {dropdownOpen && (
                    <div
                        className="suggestions-dropdown"
                        id={listId}
                        role="listbox"
                    >
                        <div className="suggestions-heading">
                            INSTRUCTORS
                        </div>

                        {suggestions.length === 0 ? (
                            <p className="suggestion-message">
                                No matching instructors
                            </p>
                        ) : (
                            suggestions.map((instructor, index) => (
                                <button
                                    key={instructor.user_id}
                                    id={`${listId}-${index}`}
                                    role="option"
                                    aria-selected={index === activeIndex}
                                    type="button"
                                    className={
                                        "suggestion-item" +
                                        (index === activeIndex
                                            ? " active"
                                            : "")
                                    }
                                    onMouseEnter={() =>
                                        setActiveIndex(index)
                                    }
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() =>
                                        selectInstructor(instructor)
                                    }
                                >
                                    <span className="suggestion-avatar">
                                        {instructor.display_name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </span>

                                    <span className="suggestion-info">
                                        <strong>
                                            {instructor.display_name}
                                        </strong>
                                        <small>Instructor</small>
                                    </span>

                                    <span className="suggestion-arrow">
                                        ↵
                                    </span>
                                </button>
                            ))
                        )}

                        <div className="suggestions-footer">
                            ↑ ↓ Navigate
                            <span>↵ Select</span>
                            <span>Esc Close</span>
                        </div>
                    </div>
                )}
            </form>

            <div className="dashboard-section">
                {loading ? (
                    <p>Loading instructors...</p>
                ) : error ? (
                    <p>{error}</p>
                ) : results === null ? (
                    <>
                        <h2>Explore Instructors</h2>
                        <p>
                            Search for an instructor to view their details.
                        </p>
                    </>
                ) : results.length === 0 ? (
                    <p>No instructors found.</p>
                ) : (
                    <>
                        <h2>Search Results</h2>

                        {results.map((instructor) => (
                            <button
                                type="button"
                                className="instructor-result instructor-result-button"
                                key={instructor.user_id}
                                onClick={() =>
                                    navigate(
                                        `/instructors/${instructor.user_id}`
                                    )
                                }
                            >
                                <h3>{instructor.display_name}</h3>
                                <p>Instructor</p>
                            </button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

export default FindInstructors;
