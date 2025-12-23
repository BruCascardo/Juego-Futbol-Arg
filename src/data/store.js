const STORAGE_KEY = 'futbol_arg_arcade_save_v1';

export default {
    save(careerData) {
        try {
            const serialized = JSON.stringify(careerData);
            localStorage.setItem(STORAGE_KEY, serialized);
            console.log("Game saved successfully.");
            return true;
        } catch (e) {
            console.error("Failed to save game:", e);
            return false;
        }
    },

    load() {
        try {
            const serialized = localStorage.getItem(STORAGE_KEY);
            if (!serialized) return null;
            return JSON.parse(serialized);
        } catch (e) {
            console.error("Failed to load game:", e);
            return null;
        }
    },

    exists() {
        return !!localStorage.getItem(STORAGE_KEY);
    },

    clear() {
        localStorage.removeItem(STORAGE_KEY);
    }
};
