// src/ui/saveSlotUI.js

// ✨ 1. 다른 파일에서 쓸 수 있게 export 붙이기
export const SaveSlotUI = {
    mode: 'SAVE', 
    maxSlots: 30,

    open(mode) {
        this.mode = mode;
        const modal = document.getElementById('save-modal');
        const title = document.getElementById('modal-title');
        
        if (!modal) {
            console.error("HTML에 #save-modal 태그가 없습니다!");
            return;
        }

        modal.style.display = 'flex'; 
        title.innerText = (mode === 'SAVE') ? '💾 게임 저장' : '📂 게임 불러오기';

        this.renderSlots();
    },

    close() {
        const modal = document.getElementById('save-modal');
        if (modal) modal.style.display = 'none';
    },

    renderSlots() {
        const container = document.getElementById('slot-list-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // ✨ 전역 window.SaveSystem 혹은 import된 SaveSystem 사용
        const allSaves = window.SaveSystem ? window.SaveSystem.getAll() : {};

        for (let i = 1; i <= this.maxSlots; i++) {
            const slotId = 'slot_' + i;
            const data = allSaves[slotId];
            
            const btn = document.createElement('div');
            btn.className = 'save-slot-btn ' + (data ? 'slot-filled' : 'slot-empty');
            
            let htmlContent = `<div><span style="color:#aaa; font-size:12px;">No.${i}</span> `;
            
            if (data) {
                const dateObj = new Date(data.savedAt);
                const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                
                let displayName = data.name;
                htmlContent += `<span class="slot-info">${displayName}</span></div>`;
                htmlContent += `<div style="font-size:11px; color:#888;">${dateStr}</div>`;
            } else {
                htmlContent += `<span>(비어있음)</span></div>`;
            }

            btn.innerHTML = htmlContent;
            btn.onclick = () => this.handleSlotClick(slotId, !!data);
            
            container.appendChild(btn);
        }
    },

    handleSlotClick(slotId, hasData) {
        // ✨ 전역 window.TurnGame 사용
        const game = window.TurnGame ? window.TurnGame.getInstance() : null;

        if (this.mode === 'SAVE') {
            if (!game) {
                alert("게임을 먼저 시작해야 저장할 수 있습니다.");
                return;
            }

            if (hasData && !confirm(`[No.${slotId.replace('slot_','')}] 슬롯에 덮어쓰시겠습니까?`)) return;
            
            game.saveGame(slotId); 
            this.renderSlots(); 
        
        } else { 
            if (!hasData) {
                alert('비어있는 슬롯입니다.');
                return;
            }

            if (confirm('이 데이터를 불러오시겠습니까?')) {
                const loadedData = window.SaveSystem.load(slotId);
                
                // 게임 인스턴스가 없으면 생성 후 로드
                if (!window.TurnGame.getInstance(loadedData.state.hero.name)) {
                     // 초기화 로직
                }

                window.TurnGame.getInstance().loadState(loadedData.state);
                this.close();
            }
        }
    }
};

// ✨ 2. HTML의 onclick에서 SaveSlotUI를 찾을 수 있게 전역 등록
window.SaveSlotUI = SaveSlotUI;

// Vite 환경에서는 main.js에서 버튼 이벤트를 관리하는 것이 더 깔끔하지만, 
// 기존 방식을 유지하려면 아래 코드를 남겨두셔도 됩니다.
window.addEventListener('DOMContentLoaded', function() {
    const saveBtn = document.getElementById('saveGame');
    const loadBtn = document.getElementById('loadGame');

    if (saveBtn) {
        saveBtn.onclick = function() { 
            if(!window.TurnGame || !window.TurnGame.getInstance()) {
                alert("게임을 시작해주세요.");
                return;
            }
            SaveSlotUI.open('SAVE'); 
        };
    }

    if (loadBtn) {
        loadBtn.onclick = function() { 
            SaveSlotUI.open('LOAD'); 
        };
    }
});