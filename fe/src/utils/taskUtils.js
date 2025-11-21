// Utility functions for TaskManagement

/**
 * Map backend status code to display text
 * @param {number} statusCode - Backend status code
 * @returns {string} Display text for status
 */
export function mapTaskStatus(statusCode) {
    const statusMap = {
        3: "Canceled",
        5: "Sending failed",
        6: "Running",
        7: "Execution failed",
        8: "Completed",
        9: "Assigned",
        10: "Wait for acknowledgment",
        20: "Picking",
        21: "Picked",
        22: "Placing",
        23: "Placed",
    };

    return statusMap[statusCode] || `Unknown (${statusCode})`;
}

/**
 * Get status color based on status code
 * @param {number} statusCode - Backend status code
 * @returns {string} Tailwind CSS classes for status badge
 */
export function getTaskStatusColor(statusCode) {
    // Completed, Picked, Placed
    if ([8, 21, 23].includes(statusCode)) {
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    }

    // Running, Picking, Placing
    if ([6, 20, 22].includes(statusCode)) {
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    }

    // Assigned, Wait for acknowledgment
    if ([9, 10].includes(statusCode)) {
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }

    // Canceled, Execution failed, Sending failed
    if ([3, 5, 7].includes(statusCode)) {
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    }

    // Default
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}
