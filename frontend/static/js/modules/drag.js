// Initialize Layout Splitters and Panel Resizing
export function initPanelDragAndDrop() {
    const sidebar = document.querySelector(".sidebar");
    const teamsPanel = document.getElementById("teams-panel");
    const playersPanel = document.getElementById("players-panel");

    const splitterSidebar = document.getElementById("splitter-sidebar");
    const splitterTeams = document.getElementById("splitter-teams");
    const splitterPlayers = document.getElementById("splitter-players");

    // Load saved widths from localStorage
    const savedWidths = localStorage.getItem("fm_panel_widths");
    if (savedWidths) {
        try {
            const widths = JSON.parse(savedWidths);
            if (widths.teams && teamsPanel) {
                teamsPanel.style.width = widths.teams + "px";
            }
            if (widths.players && playersPanel) {
                playersPanel.style.width = widths.players + "px";
            }
        } catch (e) {
            console.error("Error loading panel widths", e);
        }
    }

    // Set up resizing for each splitter
    setupResizer(splitterTeams, teamsPanel, 180, 450, "teams");
    setupResizer(splitterPlayers, playersPanel, 200, 450, "players");

    // Initial check for visibility of splitters
    updateSplittersVisibility();
}

function setupResizer(splitter, leftElement, minWidth, maxWidth, key) {
    if (!splitter || !leftElement) return;

    // Mouse drag support
    splitter.addEventListener("mousedown", (e) => {
        e.preventDefault();
        splitter.classList.add("active");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const startX = e.clientX;
        const startWidth = leftElement.offsetWidth;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            let newWidth = startWidth + deltaX;

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            leftElement.style.width = newWidth + "px";
            leftElement.style.flex = `0 0 ${newWidth}px`;
        };

        const onMouseUp = () => {
            splitter.classList.remove("active");
            document.body.style.cursor = "";
            document.body.style.userSelect = "";

            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);

            // Save new widths to localStorage
            savePanelWidths();
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    });

    // Touch support for mobile devices
    splitter.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        splitter.classList.add("active");
        document.body.style.userSelect = "none";

        const startX = e.touches[0].clientX;
        const startWidth = leftElement.offsetWidth;

        const onTouchMove = (moveEvent) => {
            if (moveEvent.touches.length !== 1) return;
            const deltaX = moveEvent.touches[0].clientX - startX;
            let newWidth = startWidth + deltaX;

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            leftElement.style.width = newWidth + "px";
            leftElement.style.flex = `0 0 ${newWidth}px`;
        };

        const onTouchEnd = () => {
            splitter.classList.remove("active");
            document.body.style.userSelect = "";

            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);

            // Save new widths to localStorage
            savePanelWidths();
        };

        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd);
    });
}

function savePanelWidths() {
    const teamsPanel = document.getElementById("teams-panel");
    const playersPanel = document.getElementById("players-panel");

    const widths = {};
    if (teamsPanel) widths.teams = teamsPanel.offsetWidth;
    if (playersPanel) widths.players = playersPanel.offsetWidth;

    localStorage.setItem("fm_panel_widths", JSON.stringify(widths));
}

// Update splitters visibility based on whether their adjacent panels are visible
export function updateSplittersVisibility() {
    const teamsPanel = document.getElementById("teams-panel");
    const playersPanel = document.getElementById("players-panel");

    const splitterTeams = document.getElementById("splitter-teams");
    const splitterPlayers = document.getElementById("splitter-players");

    if (splitterTeams && teamsPanel) {
        splitterTeams.style.display = teamsPanel.style.display === "none" ? "none" : "block";
    }
    if (splitterPlayers && playersPanel) {
        splitterPlayers.style.display = playersPanel.style.display === "none" ? "none" : "block";
    }
}
