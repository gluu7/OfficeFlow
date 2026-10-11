
const API_URL = "https://officeflow-api-f462.onrender.com/api";

export async function checkBackend() {
    const response = await fetch(`${API_URL}/health`);

    if (!response.ok) {
        throw new Error("Backend connection failed");
    }

    return response.json();
}

export async function getSchools() {
    const response = await fetch("https://officeflow-api-f462.onrender.com/api/schools");

    if (!response.ok) {
        throw new Error("Failed to fetch schools");
    }

    return response.json();
}

export async function getInstructors() {
    const response = await fetch(
        "https://officeflow-api-f462.onrender.com/api/instructors"
    );

    if (!response.ok) {
        throw new Error("Failed to fetch instructors");
    }

    return response.json();
}
