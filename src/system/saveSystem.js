const SAVE_KEY = "turngame_saves";

export const SaveSystem = {
    getAll() {
        return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    },
    setAll(data) {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    },
    save(slotId, slotName, state) {
        if (!slotId) return false;
        const saves = this.getAll();
        saves[slotId] = {
            name: slotName || saves[slotId]?.name || "이름 없는 슬롯",
            savedAt: Date.now(),
            state: JSON.parse(JSON.stringify(state))
        };
        this.setAll(saves);
        return true;
    },
    load(slotId) {
        const slot = this.getAll()[slotId];
        if (!slot) return null;
        return {
            ...slot,
            state: JSON.parse(JSON.stringify(slot.state))
        };
    }
};

window.SaveSystem = SaveSystem;
