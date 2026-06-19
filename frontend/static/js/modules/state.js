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
    KL: { positioning: 0.35, agility: 0.30, decision: 0.20, strength: 0.15 },
    STP: { marking: 0.40, strength: 0.20, positioning: 0.20, heading: 0.10, decision: 0.10 },
    SLB: { pace: 0.30, crossing: 0.20, marking: 0.20, stamina: 0.20, passing: 0.10 },
    SĞB: { pace: 0.30, crossing: 0.20, marking: 0.20, stamina: 0.20, passing: 0.10 },
    DOS: { marking: 0.30, passing: 0.25, positioning: 0.20, teamwork: 0.15, stamina: 0.10 },
    OS: { passing: 0.35, vision: 0.25, decision: 0.15, teamwork: 0.15, stamina: 0.10 },
    SLK: { pace: 0.35, dribbling: 0.25, crossing: 0.20, passing: 0.10, shooting: 0.10 },
    SĞK: { pace: 0.35, dribbling: 0.25, crossing: 0.20, passing: 0.10, shooting: 0.10 },
    OOS: { passing: 0.30, vision: 0.30, dribbling: 0.20, decision: 0.10, shooting: 0.10 },
    SNT: { finishing: 0.35, shooting: 0.25, pace: 0.20, heading: 0.10, dribbling: 0.10 }
};

// Pitch Coordinate Mapping
export const PITCH_COORDINATES = {
    KL: { bottom: "5%", left: "50%" },
    STP: { bottom: "23%", left: "50%" },
    SLB: { bottom: "25%", left: "16%" },
    SĞB: { bottom: "25%", left: "84%" },
    DOS: { bottom: "43%", left: "50%" },
    OS: { bottom: "56%", left: "50%" },
    SLK: { bottom: "68%", left: "16%" },
    SĞK: { bottom: "68%", left: "84%" },
    OOS: { bottom: "73%", left: "50%" },
    SNT: { bottom: "90%", left: "50%" }
};
