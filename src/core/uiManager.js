// src/core/uiManager.js
import { gameState, ItemDB, LocationDB, BuffDB, FacilityDB } from './state.js';

export class UIManager {
    constructor(game) {
        this.game = game; 
    }

    updateTimeDisplay() {
        const timeElement = document.getElementById('day');
        if (timeElement) {
            const currentWorldTime = gameState.worldTime || 0;
            const startMinutes = 720; 
            const totalMinutes = currentWorldTime + startMinutes;
            const displayMin = String(totalMinutes % 60).padStart(2, '0');
            const totalHours = Math.floor(totalMinutes / 60);
            const displayHour = String(totalHours % 24).padStart(2, '0');
            const totalDays = Math.floor(totalHours / 24);
            const displayYear = 333 + Math.floor(totalDays / 360);
            const displayMonth = 1 + Math.floor((totalDays % 360) / 30);
            const displayDay = 1 + (totalDays % 30);
            timeElement.innerHTML = `${displayYear}년 ${displayMonth}월 ${displayDay}일 ${displayHour}시 ${displayMin}분`;
        }
    }

    showXp() {
        while (gameState.hero.xp >= 15 * gameState.hero.lev) {
            gameState.hero.xp -= 15 * gameState.hero.lev;
            gameState.hero.maxHp += 10;
            gameState.hero.hp = gameState.hero.maxHp;
            gameState.hero.att += gameState.hero.lev;
            gameState.hero.lev++;
            window.setTimeout(() => this.setMessage('✨ 레벨업! 능력치 상승!'), 500);
        }
        const xpEl = document.getElementById('hero-xp');
        if(xpEl) xpEl.innerHTML = gameState.hero.xp + '/' + (15 * gameState.hero.lev);
        this.showLevel();
        this.showHp();
    }

    showName() {
        const el = document.getElementById('hero-name');
        if (el) el.innerHTML = gameState.hero.name;
    }

    showLevel() {
        const el = document.getElementById('hero-level');
        if (el) el.innerHTML = gameState.hero.lev;
    }

    showHp() {
        if (gameState.hero.hp <= 0) {
            this.game.gameOver();
            return;
        }
        const el = document.getElementById('hero-hp');
        if (el) el.innerHTML = gameState.hero.hp + '/' + gameState.hero.maxHp;
    }

    toggleMenu() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        this.showName();
        this.updateMenuUI();
        this.updateTimeDisplay();
    }

    setMessage(msg) {
        document.getElementById('message').innerHTML = msg;
        const ignoreList = [
            "가방을 열었습니다", "가방이 비어있습니다", "제작할 재료를 선택",
            "버리기 기능", "선택된 재료:", "(보유:", "사용할 아이템을 선택", 
            "사용하시겠습니까", "상태창", "개발자 모드", "⚠️", 
            "거점 관리 메뉴", "건설할 시설을 선택", "이용할 시설을 선택"
        ];
        if (ignoreList.some(keyword => msg.includes(keyword))) return; 

        if (!gameState.messageLog) gameState.messageLog = [];
        gameState.messageLog.push(msg);
    }

    showLog() {
        const modal = document.getElementById('log-modal');
        const container = document.getElementById('log-container');
        if(!gameState.messageLog) gameState.messageLog = [];
        container.innerHTML = gameState.messageLog.map(m => `<div class="log-entry">${m}</div>`).join('');
        modal.style.display = 'flex';
        setTimeout(() => container.scrollTop = container.scrollHeight, 0);
    }

    updateMenuUI() {
        let baseMenu = document.getElementById('base-menu');
        if (baseMenu) {
            baseMenu.innerHTML = `
                <div class="command-link" onclick="window.TurnGame.getInstance().baseInput('1')">1. 🛏️ 휴식 (24H)</div>
                <div class="command-link" onclick="window.TurnGame.getInstance().baseInput('2')">2. ⛺ 거점시설이용</div>
                <div class="command-link" onclick="window.TurnGame.getInstance().baseInput('3')">3. 🛠️ 거점관리</div>
                <div class="command-link" onclick="window.TurnGame.getInstance().baseInput('4')">4. 🚶 필드로 나가기</div>
            `;
        }

        let facilityMenu = document.getElementById('facility-menu');
        if (!facilityMenu) {
            facilityMenu = document.createElement('div');
            facilityMenu.id = 'facility-menu';
            facilityMenu.className = 'grid-menu';
            facilityMenu.style.gridTemplateColumns = '1fr';
            document.getElementById('game-area').appendChild(facilityMenu);
        }
        facilityMenu.innerHTML = `
            <div class="command-link" onclick="window.TurnGame.getInstance().facilityInput('3')">3. 🔙 돌아가기</div>
        `;

        let baseManageMenu = document.getElementById('base-manage-menu');
        if (!baseManageMenu) {
            baseManageMenu = document.createElement('div');
            baseManageMenu.id = 'base-manage-menu';
            baseManageMenu.className = 'grid-menu';
            baseManageMenu.style.gridTemplateColumns = '1fr 1fr';
            document.getElementById('game-area').appendChild(baseManageMenu);
        }
        baseManageMenu.innerHTML = `
            <div class="command-link" onclick="window.TurnGame.getInstance().baseManageInput('1')">1. 🔨 건설</div>
            <div class="command-link" onclick="window.TurnGame.getInstance().baseManageInput('3')">3. 🔙 돌아가기</div>
        `;

        let constructMenu = document.getElementById('construct-menu');
        if (!constructMenu) {
            constructMenu = document.createElement('div');
            constructMenu.id = 'construct-menu';
            constructMenu.className = 'grid-menu';
            constructMenu.style.gridTemplateColumns = '1fr';
            document.getElementById('game-area').appendChild(constructMenu);
        }
        constructMenu.innerHTML = `
            <div class="command-link" onclick="window.TurnGame.getInstance().constructInput('3')">3. ❌ 닫기</div>
        `;

        let confirmMenu = document.getElementById('battle-confirm-menu');
        if (!confirmMenu) { 
            confirmMenu = document.createElement('div');
            confirmMenu.id = 'battle-confirm-menu';
            confirmMenu.className = 'grid-menu';
            confirmMenu.style.gridTemplateColumns = '1fr 1fr';
            confirmMenu.style.gap = '8px';
            document.getElementById('game-area').appendChild(confirmMenu);
        }

        let statusMenu = document.getElementById('status-menu');
        if (!statusMenu) {
            statusMenu = document.createElement('div');
            statusMenu.id = 'status-menu';
            statusMenu.className = 'grid-menu';
            statusMenu.style.gridTemplateColumns = '1fr 1fr';
            document.getElementById('game-area').appendChild(statusMenu);
        }
        statusMenu.innerHTML = `
            <div class="command-link" onclick="window.TurnGame.getInstance().statusInput('1')">1. ✏️ 이름 변경</div>
            <div class="command-link" onclick="window.TurnGame.getInstance().statusInput('3')">3. ❌ 닫기</div>
        `;

        const menuIds = [
            'game-menu', 'battle-menu', 'base-menu', 'inventory-menu',
            'battle-confirm-menu', 'status-menu', 'base-manage-menu',
            'construct-menu', 'facility-menu'
        ];

        menuIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
        
        if (this.game.uiMode === 'STATUS') {
            document.getElementById('status-menu').style.display = 'grid';
        } else if (this.game.uiMode === 'BASE_MANAGE') {
            document.getElementById('base-manage-menu').style.display = 'grid';
            document.getElementById('map-area').innerHTML = '<div style="padding:20px; text-align:center;">⛺ 거점 관리 모드</div>';
        } else if (this.game.uiMode === 'CONSTRUCT') {
            document.getElementById('construct-menu').style.display = 'grid';
            this.renderConstruct();
        } else if (this.game.uiMode === 'FACILITY_USE') {
            const facMenu = document.getElementById('facility-menu');
            if (facMenu) facMenu.style.display = 'grid';
            this.renderFacility();
        } else if (this.game.uiMode === 'BATTLE_ITEM') {
            document.getElementById('battle-menu').style.display = 'grid';
            this.game.renderInventory(); 
        } else if (this.game.uiMode === 'BATTLE_ITEM_CONFIRM') {
            const item = gameState.inventory[this.game.tempItemIndex];
            if (item && ItemDB[item.id]) {
                confirmMenu.innerHTML = `
                    <div class="command-link" onclick="window.TurnGame.getInstance().battleInput('1')">1. ✅ 사용: ${ItemDB[item.id].name}</div>
                    <div class="command-link" onclick="window.TurnGame.getInstance().battleInput('2')">2. 🔙 취소</div>
                    <div class="command-link" style="grid-column: span 2" onclick="window.TurnGame.getInstance().battleInput('3')">3. ❌ 가방 닫기</div>
                `;
                confirmMenu.style.display = 'grid';
                this.game.renderInventory();
            }
        } else if (this.game.uiMode === 'INVENTORY' || this.game.uiMode === 'CRAFTING') {
            document.getElementById('inventory-menu').style.display = 'grid';
            this.game.renderInventory();
        } else if (gameState.monster) {
            document.getElementById('battle-menu').style.display = 'grid';
            document.getElementById('map-area').innerHTML = '<span>🗺️ MAP AREA</span>';
        } else if (gameState.location === 'base') {
            document.getElementById('base-menu').style.display = 'grid';
            if (this.game.uiMode === 'NORMAL') {
                document.getElementById('map-area').innerHTML = '<div style="padding:20px; text-align:center;">⛺ 거점 메인</div>';
            }
        } else {
            document.getElementById('game-menu').style.display = 'grid';
        }
    }

    renderStatus() {
        const locInfo = LocationDB[gameState.location];
        const locationName = locInfo ? locInfo.name : gameState.location;

        // ✨ 버프 목록 HTML 생성 로직
        let buffsHtml = '';
        if (gameState.hero.buffs && gameState.hero.buffs.length > 0) {
            buffsHtml += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444;">`;
            buffsHtml += `<h4 style="color:#2ecc71; margin-bottom: 10px;">✨상태</h4>`;
            
            gameState.hero.buffs.forEach(buff => {
                const bData = BuffDB[buff.id];
                if (bData) {
                    // 남은 시간 계산 (분 단위 -> 시간/분 변환)
                    const remain = Math.max(0, buff.expireTime - (gameState.worldTime || 0));
                    const remainHours = Math.floor(remain / 60);
                    const remainMins = remain % 60;
                    
                    let timeStr = '';
                    if (remainHours > 0) timeStr += `${remainHours}시간 `;
                    timeStr += `${remainMins}분`;

                    buffsHtml += `
                        <div style="margin-bottom: 10px; border-left: 3px solid #f1c40f; padding-left: 10px;">
                            <span style="font-weight: bold; color: #fff;">[${bData.name}]</span> 
                            <span style="color: #e67e22; font-size: 0.9em; margin-left: 5px;">⏳ 남은 시간: ${timeStr}</span><br>
                            <span style="font-size: 0.8em; color: #aaaaaa; display: inline-block; margin-top: 3px;">${bData.desc}</span>
                        </div>
                    `;
                }
            });
            buffsHtml += `</div>`;
        } else {
            buffsHtml += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444;">
                            <span style="color: #777; font-size: 0.9em;">현재 적용 중인 효과가 없습니다.</span>
                          </div>`;
        }
            
        document.getElementById('map-area').innerHTML = `
            <div style="padding:20px;">
                <h3 style="color:#f1c40f;">📊 ${gameState.hero.name}의 정보</h3>
                <p><span style="color:#5dade2;">체력</span>: ${gameState.hero.hp} / ${gameState.hero.maxHp}</p>
                <p><span style="color:#5dade2;">기력</span>: ${gameState.hero.sp} / ${gameState.hero.maxSp}</p>
                <p><span style="color:#5dade2;">공격력</span>: ${gameState.hero.att}</p>
                <p><span style="color:#5dade2;">방어력</span>: ${gameState.hero.def}</p>
                <p><span style="color:#5dade2;">경험치</span>: ${gameState.hero.xp} / ${15 * gameState.hero.lev}</p>
                <p>현재 위치: <span style="color:#5dade2;">${locationName}</span></p>
                ${buffsHtml} </div> 
            </div>
            </div>
        `;
    }

    renderFacility() {
        const mapArea = document.getElementById('map-area');
        mapArea.innerHTML = ''; 
        const grid = document.createElement('div');
        grid.className = 'inventory-grid';

        const buildings = gameState.buildings || [];
        
        if (buildings.length === 0) {
            mapArea.innerHTML = '<div style="padding:20px; text-align:center; color:#777;">이용할 수 있는 거점 시설이 없습니다.</div>';
            return;
        }

        buildings.forEach(id => {
            const fData = FacilityDB[id];
            if (!fData) return;
            
            const div = document.createElement('div');
            div.className = 'item-slot';
            div.style.position = 'relative';
            
            div.innerHTML = `<span>${fData.icon}</span><span style="position:absolute; bottom:5px; right:5px; font-size:10px; color:white;">${fData.name}</span>`;
            div.onclick = () => this.game.useFacility(id);
            
            grid.appendChild(div);
        });
        
        mapArea.appendChild(grid);
        this.game.setMessage("이용할 시설을 선택하세요.");
    }

    renderConstruct() {
        const mapArea = document.getElementById('map-area');
        mapArea.innerHTML = ''; 
        const grid = document.createElement('div');
        grid.className = 'inventory-grid';

        const invCount = {};
        if (gameState.inventory) {
            gameState.inventory.forEach(slot => {
                invCount[slot.id] = (invCount[slot.id] || 0) + slot.count;
            });
        }

        const buildings = gameState.buildings || [];
        const queue = gameState.constructionQueue || [];

        // ✨ 하드코딩된 도면 대신 FacilityDB 사용
        Object.keys(FacilityDB).forEach(id => {
            const bData = FacilityDB[id];
            const hasBuilt = buildings.includes(id);
            const isBuilding = queue.find(c => c.id === id);
            
            const div = document.createElement('div');
            div.className = 'item-slot';
            div.style.position = 'relative';
            
            if (hasBuilt) {
                div.innerHTML = `<span>${bData.icon}</span><span class="item-count">완료</span>`;
                div.style.opacity = '0.5'; 
                div.onclick = () => this.game.setMessage(`[${bData.name}] 이미 건설된 시설입니다.`);
            } else if (isBuilding) {
                const remain = Math.max(0, isBuilding.finishTime - (gameState.worldTime || 0));
                const remainHours = Math.ceil(remain / 60);
                div.innerHTML = `<span>🚧</span><span style="position:absolute; bottom:5px; right:5px; font-size:10px; color:#f1c40f;">약 ${remainHours}시간 후</span>`;
                div.onclick = () => this.game.setMessage(`[${bData.name}] 현재 건설 진행 중입니다.`);
            } else {
                let reqText = [];
                let canBuild = true;
                
                Object.keys(bData.req).forEach(reqId => {
                    const need = bData.req[reqId];
                    const have = invCount[reqId] || 0;
                    if (have < need) canBuild = false;
                    
                    const itemName = ItemDB[reqId] ? ItemDB[reqId].name : reqId;
                    reqText.push(`${itemName} ${have}/${need}`);
                });
                
                const color = canBuild ? 'white' : '#ff6b6b'; 
                div.innerHTML = `<span>${bData.icon}</span><span style="position:absolute; bottom:5px; right:5px; font-size:10px; color:${color}; text-align:right; line-height:1.2;">${reqText.join('<br>')}</span>`;
                div.onclick = () => this.game.tryConstruct(id);
            }
            grid.appendChild(div);
        });
        
        mapArea.appendChild(grid);
        this.game.setMessage("건설할 시설을 선택하세요.");
    }
}