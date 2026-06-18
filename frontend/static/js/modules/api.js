// Re-export modular API sub-scripts to keep single entry import paths intact
export {
    loadData, handleCreateTeam, handleUpdateTeamName, deleteTeam,
    deletePlayer, handleCreatePlayer, handleCreateCoach, deleteCoach,
    archiveTeamAction
} from "./api_core.js";

export {
    loadFinanceData, handleFeeStatusChange, loadExpensesData,
    saveExpenseAction, deleteExpenseAction, loadKitsData,
    saveKitAction, deleteKitAction
} from "./api_finance.js";

export {
    loadAttendanceData, loadAttendanceAnalysis, handleSaveAttendance
} from "./api_attendance.js";

export {
    checkAdminStatus, setupAdminPassword, loginAdmin,
    changeAdminPassword, updateAdminSettings, sendAdminOTP,
    verifyAdminOTP, getBackups, createManualBackup, restoreBackup
} from "./api_admin.js";

export {
    saveSeasonAction, deleteSeasonAction, activateSeasonAction,
    saveTransferAction, deleteTransferAction
} from "./api_management.js";

export {
    getCalendarEvents, saveCalendarEventAction, deleteCalendarEventAction
} from "./api_calendar.js";

export {
    loadInjuriesHistory, handleSaveInjurySubmit, handleResolveInjury,
    handleDeleteInjury
} from "./api_health.js";

export {
    fetchMatches, saveMatchAction, deleteMatchAction
} from "./api_matches.js";
