function startCountdown(targetDate, elementId) {
    function updateCountdown() {
        const now = new Date().getTime();
        const timeLeft = targetDate - now;

        if (timeLeft <= 0) {
            document.getElementById(elementId).innerHTML = "Event Started!";
            clearInterval(interval);
            return;
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        document.getElementById(elementId).innerHTML = `
            <span>${days.toString().padStart(2, '0')}</span> Days 
            <span>${hours.toString().padStart(2, '0')}</span> Hours 
            <span>${minutes.toString().padStart(2, '0')}</span> Minutes 
            <span>${seconds.toString().padStart(2, '0')}</span> Seconds
        `;
    }

    const interval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initialize countdown immediately
}

document.addEventListener("DOMContentLoaded", function () {
    const eventDate = new Date("2025-05-20T00:00:00").getTime(); // Change date as needed
    startCountdown(eventDate, "countdown");
});

function preventDevTools() {
    // Disable right-click context menu
    document.addEventListener("contextmenu", function (e) {
        e.preventDefault();
    });

    // Disable F12, Ctrl + Shift + I / Command + Shift + I, Ctrl + U / Command + Option + U, and other DevTools-related shortcuts
    document.addEventListener("keydown", function (e) {
        // For Windows/Linux (Ctrl + U, Ctrl + S, Ctrl + C, Ctrl + J)
        if (e.ctrlKey && (e.key === "u" || e.key === "s" || e.key === "c" || e.key === "j" || e.key === "I" || e.key === "F12")) {
            e.preventDefault();
        }

        // For Mac (Command + Option + U and Command + Option + I)
        if (e.metaKey && e.altKey && (e.key === "u" || e.key === "I")) {
            e.preventDefault();
        }

        // Disable F12 (DevTools)
        if (e.key === "F12") {
            e.preventDefault();
        }

        // Disable Cmd + Option + I (DevTools on macOS)
        if (e.metaKey && e.altKey && e.key === "I") {
            e.preventDefault();
        }

        // Disable Ctrl + Shift + I or Cmd + Shift + I
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
            e.preventDefault();
        }
    });

    // // Prevent 'View Source' using the "beforeunload" event
    // window.addEventListener('beforeunload', function (event) {
    //     // This prevents users from navigating to a new URL or opening a new tab/window
    //     event.preventDefault();
    //     event.returnValue = ''; // Necessary for some browsers to show confirmation message
    // });
}

// Call the function to activate the restrictions
preventDevTools();