// utils/formatDate.js
export function formatDate(dateString) {
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12; // 0 becomes 12
    const hourStr = String(hours).padStart(2, "0");

    return `${day}-${month}-${year} ${hourStr}:${minutes} ${ampm}`;
}
