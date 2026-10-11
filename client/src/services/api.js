
const API_URL = "http://localhost:3000/api";

export async function checkBackend() {
    const response = await fetch(`${API_URL}/health`);

    if (!response.ok) {
        throw new Error("Backend connection failed");
    }

    return response.json();
}

export async function getSchools() {
    const response = await fetch("http://localhost:3000/api/schools");

    if (!response.ok) {
        throw new Error("Failed to fetch schools");
    }

    return response.json();
}

export async function getInstructors() {
    const response = await fetch(
        "http://localhost:3000/api/instructors"
    );

    if (!response.ok) {
        throw new Error("Failed to fetch instructors");
    }

    return response.json();
}
