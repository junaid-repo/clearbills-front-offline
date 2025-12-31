// src/utils/authFetch.js
export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("jwt_token");

    // Default headers
    const headers = {
        ...(options.headers || {}),
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };

    return fetch(url, {
        ...options,
        headers,
    });
};
