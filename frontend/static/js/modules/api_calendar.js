export async function getCalendarEvents(teamId) {
    try {
        const res = await fetch(`/api/calendar-events?team_id=${encodeURIComponent(teamId)}`);
        if (res.ok) {
            return await res.json();
        }
        return [];
    } catch (e) {
        console.error("Failed to load calendar events", e);
        return [];
    }
}

export async function saveCalendarEventAction(event) {
    try {
        const res = await fetch("/api/calendar-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event)
        });
        if (res.ok) {
            const data = await res.json();
            return { success: true, id: data.id };
        }
        return { success: false };
    } catch (e) {
        console.error("Failed to save calendar event", e);
        return { success: false };
    }
}

export async function updateCalendarEventAction(event) {
    try {
        const res = await fetch("/api/calendar-events/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event)
        });
        if (res.ok) {
            return { success: true };
        }
        return { success: false };
    } catch (e) {
        console.error("Failed to update calendar event", e);
        return { success: false };
    }
}

export async function cancelCalendarOccurrenceAction(eventId, date) {
    try {
        const res = await fetch("/api/calendar-events/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: eventId, date: date })
        });
        if (res.ok) {
            return true;
        }
        return false;
    } catch (e) {
        console.error("Failed to cancel calendar occurrence", e);
        return false;
    }
}

export async function deleteCalendarEventAction(eventId) {
    try {
        const res = await fetch(`/api/calendar-events?id=${encodeURIComponent(eventId)}`, {
            method: "DELETE"
        });
        if (res.ok) {
            return true;
        }
        return false;
    } catch (e) {
        console.error("Failed to delete calendar event", e);
        return false;
    }
}
