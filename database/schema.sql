CREATE TABLE schools (
    school_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL,
    school_domain VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE users (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_users_school
        FOREIGN KEY (school_id)
        REFERENCES schools(school_id),

    CONSTRAINT chk_users_role
        CHECK (role IN ('student', 'instructor'))
);