// State Management
export const state = {
    teams: [],
    activeTeamId: null,
    activePlayerId: null,
    currentUploadedPhoto: null,
    activeTab: "nav-dashboard",
    searchQuery: "",
    filterPosition: "ALL",
    sortBy: "rating-desc",
    isAdminLoggedIn: true,
    editingPlayerId: null,
    adminEmail: "",
    adminEmailVerified: 0,
    adminMonthlyFee: 500,
    isAdminInitialized: false
};

// Position Weight Configuration for 0-100 overall calculation
export const POSITION_WEIGHTS = {
    GK: { positioning: 0.35, agility: 0.30, decision: 0.20, strength: 0.15 },
    CB: { marking: 0.40, strength: 0.20, positioning: 0.20, heading: 0.10, decision: 0.10 },
    LB: { pace: 0.30, crossing: 0.20, marking: 0.20, stamina: 0.20, passing: 0.10 },
    RB: { pace: 0.30, crossing: 0.20, marking: 0.20, stamina: 0.20, passing: 0.10 },
    DM: { marking: 0.30, passing: 0.25, positioning: 0.20, teamwork: 0.15, stamina: 0.10 },
    CM: { passing: 0.35, vision: 0.25, decision: 0.15, teamwork: 0.15, stamina: 0.10 },
    LM: { pace: 0.35, dribbling: 0.25, crossing: 0.20, passing: 0.10, shooting: 0.10 },
    RM: { pace: 0.35, dribbling: 0.25, crossing: 0.20, passing: 0.10, shooting: 0.10 },
    AM: { passing: 0.30, vision: 0.30, dribbling: 0.20, decision: 0.10, shooting: 0.10 },
    ST: { finishing: 0.35, shooting: 0.25, pace: 0.20, heading: 0.10, dribbling: 0.10 }
};

// Pitch Coordinate Mapping
export const PITCH_COORDINATES = {
    GK: { bottom: "5%", left: "50%" },
    CB: { bottom: "23%", left: "50%" },
    LB: { bottom: "25%", left: "16%" },
    RB: { bottom: "25%", left: "84%" },
    DM: { bottom: "43%", left: "50%" },
    CM: { bottom: "56%", left: "50%" },
    LM: { bottom: "68%", left: "16%" },
    RM: { bottom: "68%", left: "84%" },
    AM: { bottom: "73%", left: "50%" },
    ST: { bottom: "90%", left: "50%" }
};
