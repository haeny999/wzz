
import { TimeManager } from './core/timeManager.js';
import { gameState, loadAllData, addItem, BuffDB, FacilityDB } from './core/state.js';
import { SaveSystem } from './system/saveSystem.js';
import { SaveSlotUI } from './ui/saveSlotUI.js';
import { BattleManager } from './core/battleManager.js'; 
import { InventoryManager } from './core/inventoryManager.js'; 
import { UIManager } from './core/uiManager.js'; 

class BaseManager {
    constructor(game, timeManager) {
        this.game = game;
        this.time = timeManager;
    }

    moveToBase() {
        if (gameState.monster) return this.game.setMessage("⚠️전투 중에는 거점으로 이동할 수 없습니다.");
        if (gameState.location === 'base') return this.game.setMessage("⚠️이미 거점에 있습니다.");
        if (gameState.canMoveToBase === false) return this.game.setMessage("⚠️오늘은 이미 거점을 방문했습니다.");

        if (confirm("거점으로 이동하시겠습니까?")) {
            gameState.location = 'base';
            gameState.canMoveToBase = false;
            this.game.uiMode = 'NORMAL';
            document.getElementById('map-area').innerHTML = '<div style="padding:20px; text-align:center;">⛺ 거점 메인</div>';
            this.game.setMessage("거점에 도착했습니다.");
            this.game.updateMenuUI();
        }
    }

   baseInput(input) {
        if (input === '1') { 
            this.time.advanceTime(1440); 
            gameState.hero.hp = gameState.hero.maxHp;
            gameState.hero.sp = gameState.hero.maxSp; 
            this.game.showHp().setMessage("거점에서 푹 쉬었습니다.");
            const buffDuration = 16 * 60; 
            const expireTime = gameState.worldTime + buffDuration;
            const existingBuff = gameState.hero.buffs.find(b => b.id === 'vitality');
            if (existingBuff) {
                existingBuff.expireTime = expireTime;
            } else {
                gameState.hero.buffs.push({ id: 'vitality', expireTime: expireTime });
            }
            this.game.updateHeroStats(); 
            gameState.hero.sp = gameState.hero.maxSp; 
            
            this.game.showHp().setMessage("거점에서 푹 쉬었다. 16시간 동안 [활력] 버프를 얻었다.");
        } else if (input === '2') {
            this.game.uiMode = 'FACILITY_USE';
             this.game.setMessage("시설을 이용한다.");
        } else if (input === '3') { 
            this.game.uiMode = 'BASE_MANAGE';
            this.game.setMessage("거점 관리가 필요하다.");
        } else if (input === '4') { 
            gameState.location = 'field';
            this.game.uiMode = 'NORMAL';
            document.getElementById('map-area').innerHTML = '<span>🗺️ MAP AREA</span>';
            this.game.setMessage("모험을 위해 필드로 나간다.");
        }
        this.game.updateTimeDisplay().updateMenuUI();
    }

    baseManageInput(input) {
        if (input === '1') {
            this.game.uiMode = 'CONSTRUCT';
        } else if (input === '3') {
            this.game.uiMode = 'NORMAL';
        }
        document.getElementById('map-area').innerHTML = '<div style="padding:20px; text-align:center;">⛺ 거점 메인</div>';
        this.game.updateMenuUI();
    }

    constructInput(input) {
        if (input === '3') {
            this.game.uiMode = 'BASE_MANAGE';
            this.game.updateMenuUI();
        }
    }
    facilityInput(input) {
        if (input === '3') {
            this.game.uiMode = 'NORMAL';
            // ✨ 시설 메뉴에서 돌아갈 때도 가운데 화면 비우기
            document.getElementById('map-area').innerHTML = '<div style="padding:20px; text-align:center;">⛺ 거점 메인</div>';
            this.game.updateMenuUI();
        }
    }

    useFacility(buildingId) {
        const fData = FacilityDB[buildingId];
        if (!fData) return;

        if (fData.useEffect) {
            const effect = fData.useEffect;
            const confirmMsg = effect.desc ? `\n(${effect.desc})` : '';
            
            const isConfirmed = confirm(`[${fData.name}] 시설을 이용하시겠습니까?${confirmMsg}`);
            if (!isConfirmed) return;

            if (effect.costTime) {
                this.time.advanceTime(effect.costTime); 
            }
            
            if (effect.restoreHp === 'max') gameState.hero.hp = gameState.hero.maxHp;
            if (effect.restoreSp === 'max') gameState.hero.sp = gameState.hero.maxSp; 
            
            if (effect.buffs && effect.buffs.length > 0) {
                if (!gameState.hero.buffs) gameState.hero.buffs = [];
                
                effect.buffs.forEach(buffInfo => {
                    const expireTime = gameState.worldTime + buffInfo.duration;
                    const existingBuff = gameState.hero.buffs.find(b => b.id === buffInfo.id);
                    
                    if (existingBuff) {
                        existingBuff.expireTime = expireTime;
                    } else {
                        gameState.hero.buffs.push({ id: buffInfo.id, expireTime: expireTime });
                    }
                });
            }
            
            this.game.updateHeroStats(); 
            if (effect.restoreSp === 'max') gameState.hero.sp = gameState.hero.maxSp; 
            
            const msg = effect.useMsg ? effect.useMsg : "시설을 이용했습니다.";
            this.game.setMessage(`[${fData.name}] ${msg}`);
            this.game.uiMode = 'NORMAL'; 
            this.game.updateTimeDisplay().updateMenuUI();

        } else {
            this.game.setMessage(`[${fData.name}] 시설은 아직 이용할 수 없습니다.`);
        }
    }

    // ✨ 건설 시간 체크 (시간이 지날 때마다 자동으로 실행됨)
    checkConstructions() {
        if (!gameState.constructionQueue || gameState.constructionQueue.length === 0) return;

        const BuildingDB = {
            "camp": { name: "캠프", icon: "⛺", time: 60, req: { "wood": 10 } },
            "workbench": { name: "작업대", icon: "🗜️", time: 120, req: { "wood": 5, "core": 1 } }
        };

        let newlyBuilt = false;
        gameState.constructionQueue = gameState.constructionQueue.filter(task => {
            if (gameState.worldTime >= task.finishTime) {
                if (!gameState.buildings) gameState.buildings = [];
                gameState.buildings.push(task.id);
                
                const bData = BuildingDB[task.id];
                this.game.setMessage(`✨ ${bData.icon} [${bData.name}] 시설 건설이 완료되었습니다!`);
                newlyBuilt = true;
                return false; 
            }
            return true; 
        });

        if (newlyBuilt && this.game.uiMode === 'CONSTRUCT') {
            this.game.ui.renderConstruct();
        }
    }

    tryConstruct(buildingId) {
        const BuildingDB = {
            "camp": { name: "캠프", icon: "⛺", time: 60, req: { "wood": 10 } },
            "workbench": { name: "작업대", icon: "🗜️", time: 120, req: { "wood": 5, "core": 1 } }
        };

        const bData = BuildingDB[buildingId];
        if (!bData) return;

        if (gameState.buildings && gameState.buildings.includes(buildingId)) {
            return this.game.setMessage(`[${bData.name}] 이미 건설된 시설입니다.`);
        }

        if (!gameState.constructionQueue) gameState.constructionQueue = [];
        if (gameState.constructionQueue.some(c => c.id === buildingId)) {
            return this.game.setMessage(`[${bData.name}] 이미 건설이 진행 중입니다.`);
        }

        const invCount = {};
        gameState.inventory.forEach(slot => {
            invCount[slot.id] = (invCount[slot.id] || 0) + slot.count;
        });

        let canBuild = true;
        Object.keys(bData.req).forEach(reqId => {
            if ((invCount[reqId] || 0) < bData.req[reqId]) canBuild = false;
        });

        if (!canBuild) {
            this.game.setMessage(`[${bData.name}] 건축하려면 재료가 더 필요합니다.`);
            return;
        }

        const isConfirmed = confirm(`[${bData.name}] 시설 건설을 시작하시겠습니까?\n(소요 시간: ${bData.time / 60}시간, 진행 중에 다른 행동 가능)`);
        if (!isConfirmed) {
            this.game.setMessage("건설을 취소했습니다.");
            return;
        }

        Object.keys(bData.req).forEach(reqId => {
            let need = bData.req[reqId];
            gameState.inventory.forEach(slot => {
                if (slot.id === reqId && need > 0) {
                    if (slot.count >= need) {
                        slot.count -= need;
                        need = 0;
                    } else {
                        need -= slot.count;
                        slot.count = 0;
                    }
                }
            });
        });
        
        gameState.inventory = gameState.inventory.filter(slot => slot.count > 0);

        // ✨ 시간을 바로 경과시키지 않고 큐에 등록
        gameState.constructionQueue.push({
            id: buildingId,
            finishTime: gameState.worldTime + bData.time
        });

        this.game.setMessage(`🔨 [${bData.name}] 건설 작업에 착수했습니다! (${bData.time / 60}시간 뒤 완성)`);
        this.game.ui.renderConstruct(); 
    }

    useFacility(buildingId) {
        const fData = FacilityDB[buildingId];
        if (!fData) return;

        // 시설에 useEffect 속성이 정의되어 있는지 확인
        if (fData.useEffect) {
            const effect = fData.useEffect;
            const confirmMsg = effect.desc ? `\n(${effect.desc})` : '';
            
            const isConfirmed = confirm(`[${fData.name}] 시설을 이용하시겠습니까?${confirmMsg}`);
            if (!isConfirmed) return;

            // 1. 시간 경과 적용
            if (effect.costTime) {
                this.time.advanceTime(effect.costTime); 
            }
            
            // 2. 스탯 회복 적용
            if (effect.restoreHp === 'max') gameState.hero.hp = gameState.hero.maxHp;
            if (effect.restoreSp === 'max') gameState.hero.sp = gameState.hero.maxSp; 
            
            // 3. 버프 부여 적용
            if (effect.buffs && effect.buffs.length > 0) {
                if (!gameState.hero.buffs) gameState.hero.buffs = [];
                
                effect.buffs.forEach(buffInfo => {
                    const expireTime = gameState.worldTime + buffInfo.duration;
                    const existingBuff = gameState.hero.buffs.find(b => b.id === buffInfo.id);
                    
                    if (existingBuff) {
                        existingBuff.expireTime = expireTime; // 기존 버프 시간 연장
                    } else {
                        gameState.hero.buffs.push({ id: buffInfo.id, expireTime: expireTime }); // 새 버프 추가
                    }
                });
            }
            
            this.game.updateHeroStats(); 
            if (effect.restoreSp === 'max') gameState.hero.sp = gameState.hero.maxSp; 
            
            const msg = effect.useMsg ? effect.useMsg : "시설을 이용했습니다.";
            this.game.setMessage(`[${fData.name}] ${msg}`);
            this.game.uiMode = 'NORMAL'; 
            this.game.updateTimeDisplay().updateMenuUI();

        } else {
            this.game.setMessage(`[${fData.name}] 시설은 아직 이용할 수 없습니다.`);
        }
    }
}

window.SaveSystem = SaveSystem;
window.SaveSlotUI = SaveSlotUI;

window.TurnGame = (function () {
    let instance;
    let timeManager;

    let initiate = function (heroName, loadedState) {
        if (loadedState) {
            Object.assign(gameState, loadedState); 
        }
        if (typeof gameState.worldTime !== 'number') gameState.worldTime = 0;
        if (heroName) gameState.hero.name = heroName;

        timeManager = new TimeManager(gameState);

        const self = {
            uiMode: 'NORMAL',
            selectedIndices: [],
            tempItemIndex: null,

            updateTimeDisplay: function() { this.ui.updateTimeDisplay(); return this; },
            showXp: function() { this.ui.showXp(); return this; },
            showName: function() { this.ui.showName(); return this; },
            showLevel: function() { this.ui.showLevel(); return this; },
            showHp: function() { this.ui.showHp(); return this; },
            toggleMenu: function() { this.ui.toggleMenu(); return this; },
            setMessage: function(msg) { this.ui.setMessage(msg); return this; },
            showLog: function() { this.ui.showLog(); },
            updateMenuUI: function() { this.ui.updateMenuUI(); return this; },
            renderStatus: function() { this.ui.renderStatus(); return this; },

            moveToBase: function() { this.base.moveToBase(); },
            baseInput: function(input) { this.base.baseInput(input); },
            baseManageInput: function(input) { this.base.baseManageInput(input); },
            constructInput: function(input) { this.base.constructInput(input); },
            tryConstruct: function(id) { this.base.tryConstruct(id); },
            facilityInput: function(input) { this.base.facilityInput(input); }, // 키보드 3번(돌아가기) 연결
            useFacility: function(id) { this.base.useFacility(id); },
            menuInput: function(input) {
                if (input === '1') {
                    const exploreTime = Math.floor(Math.random() * 6) * 10 + 10;
                    
                    this.generateMonster(); // 몬스터 생성 (gameState.monster 세팅)
                    timeManager.advanceTime(exploreTime); // 뽑힌 시간만큼 경과
                    
                    // ✨ 몬스터가 정상적으로 스폰되었다면 시간과 이름을 포함해 메세지 출력
                    if (gameState.monster) {
                        this.setMessage(`${exploreTime}분의 모험 끝에 [${gameState.monster.name}]을(를) 마주쳤다.`);
                    } else {
                        // 혹시 몬스터 스폰에 실패하거나 없는 지역일 경우의 예외 처리
                        this.setMessage(`${exploreTime}분의 모험 끝에 아무것도 발견하지 못했다.`);
                    }
                } else if (input === '2') {
                    const healAmount = 30;
                    gameState.hero.hp = Math.min(gameState.hero.maxHp, gameState.hero.hp + healAmount);
                    timeManager.advanceTime(30); 
                    this.setMessage(`짧은 휴식을 취했습니다. 체력이 ${healAmount} 회복되었습니다.`);
                } else if (input === '3') {
                    timeManager.advanceTime(480); 
                    gameState.hero.hp = gameState.hero.maxHp;
                    gameState.canMoveToBase = true;
                    this.setMessage(`8시간 동안 깊은 잠을 잤습니다. 체력이 모두 회복되었습니다.`);
                }
                return this.showHp().updateTimeDisplay().updateMenuUI();
            },

            generateMonster: function () { this.battle.generateMonster(); return this; },
            battleInput: function(input) { this.battle.battleInput(input); },
            gameOver: function() {
                gameState.turn = false;
                document.getElementById('map-area').innerHTML = '<h1 style="color:red; text-align:center; margin-top:50px;">YOU DIED</h1>';
                this.setMessage("💀 치명상을 입고 쓰러졌습니다... (F5로 재시작)");
                return false;
            },

            openInventory: function() { this.inventory.openInventory(); },
            inventoryInput: function(input) { 
                this.inventory.inventoryInput(input); 
                
                // ✨ 가방을 닫아 게임 모드가 'NORMAL(기본)'로 돌아왔을 때 화면의 아이템 찌꺼기를 싹 지워줍니다.
                if (this.uiMode === 'NORMAL') {
                    if (gameState.location === 'base') {
                        document.getElementById('map-area').innerHTML = '<div style="padding:20px; text-align:center;">⛺ 거점 메인</div>';
                    } else {
                        document.getElementById('map-area').innerHTML = '<span>🗺️ MAP AREA</span>';
                    }
                }
            },            renderInventory: function() { this.inventory.renderInventory(); },
            updateHeroStats: function() {
                // 1. 시간 지난 버프 솎아내기
                gameState.hero.buffs = gameState.hero.buffs.filter(b => b.expireTime > gameState.worldTime);

                // 2. 기력 최대치를 기본 스탯으로 일단 초기화
                gameState.hero.maxSp = gameState.hero.baseMaxSp;

                // 3. 현재 유지 중인 버프들을 순회하며 효과 적용
                gameState.hero.buffs.forEach(buff => {
                    const bData = BuffDB[buff.id];
                    if (bData && bData.effects) {
                        bData.effects.forEach(effect => {
                            // target이 maxSp이고 type이 percent인 경우 연산
                            if (effect.target === 'maxSp' && effect.type === 'percent') {
                                gameState.hero.maxSp += Math.floor(gameState.hero.baseMaxSp * (effect.value / 100));
                            }
                        });
                    }
                });

                // 4. 최대 기력이 줄어들었을 경우 현재 기력이 오버되지 않게 깎기
                if (gameState.hero.sp > gameState.hero.maxSp) {
                    gameState.hero.sp = gameState.hero.maxSp;
                }
            },

            openStatus: function() {
                if (gameState.monster) return this.setMessage("⚠️전투 중엔 상태창을 볼 수 없습니다.");
                this.uiMode = 'STATUS';
                this.updateMenuUI();
                this.renderStatus();
            },
            statusInput: function(input) {
                if (input === '1') {
                    let newName = prompt("새로운 이름을 입력하세요:", gameState.hero.name);
                    if (newName && newName.trim() !== "") {
                        gameState.hero.name = newName.trim();
                        this.showName();    
                        this.renderStatus(); 
                        this.setMessage(`이름이 [${gameState.hero.name}](으)로 변경되었습니다!`);
                    }
                } else if (input === '3') {
                    this.uiMode = 'NORMAL';
                    document.getElementById('map-area').innerHTML = '<span>🗺️ MAP AREA</span>';
                    this.updateMenuUI();
                }
            },

            devModeActive: false,
            toggleDevMode: function() {
                this.devModeActive = !this.devModeActive;
                this.setMessage(`🛠️ 개발자 모드: <span style="color:#f1c40f;">${this.devModeActive ? 'ON' : 'OFF'}</span>`);
                return this;
            },
            devInput: function(key) {
                if (!this.devModeActive) return;
                if (key === 'q') {
                    gameState.hero.xp = 15 * gameState.hero.lev; 
                    this.showXp(); 
                    this.setMessage(`<span style="color:#f1c40f;">🛠️ [DEV] 강제 레벨업!</span>`);
                } else if (key === 'w') {
                    timeManager.advanceTime(1440);
                    this.updateTimeDisplay().setMessage(`<span style="color:#f1c40f;">🛠️ [DEV] 24시간 스킵</span>`);
                } else if (key === 'e') {
                    let itemId = prompt("추가할 아이템 ID:");
                    if (!itemId) return; 
                    let count = parseInt(prompt(`[${itemId}] 수량:`, "1"), 10);
                    if (isNaN(count) || count <= 0) return;
                    if (typeof addItem === 'function') addItem(itemId, count);
                    this.setMessage(`<span style="color:#f1c40f;">🛠️ 아이템 주입: ${itemId} x${count}</span>`);
                    if (['INVENTORY', 'BATTLE_ITEM', 'CRAFTING', 'CONSTRUCT'].includes(this.uiMode)) {
                        this.updateMenuUI(); 
                    }
                } else if (key === 'r') {
                    gameState.hero.hp = gameState.hero.maxHp;
                    this.showHp().setMessage(`<span style="color:#f1c40f;">🛠️ 체력 회복!</span>`);
                }
            },
            getState: function() { return JSON.parse(JSON.stringify(gameState)); },
            loadState: function(state) {
                const savedMonsters = gameState.monsters; 
                Object.assign(gameState, JSON.parse(JSON.stringify(state)));
                if(savedMonsters) gameState.monsters = savedMonsters; 
                gameState.monster = null; 
                gameState.turn = true;
                this.uiMode = 'NORMAL';
                this.toggleMenu();
                this.showXp(); 
            },
            saveGame: function (slotId) {
                if (!slotId) return alert("슬롯 선택 필요");
                const currentDay = Math.floor((gameState.worldTime || 0) / 1440) + 1;
                let slotName = `Day.${currentDay} | ${gameState.hero.name}`;
                if (SaveSystem.save(slotId, slotName, this.getState())) {
                    alert('저장 완료!');
                    if (typeof SaveSlotUI !== 'undefined') SaveSlotUI.renderSlots();
                }
            },
            loadGame: function (slotId) {
                const loaded = SaveSystem.load(slotId);
                if (loaded) {
                    this.loadState(loaded.state);
                    this.setMessage("게임을 성공적으로 불러왔습니다.");
                }
            },

            
        };

        self.ui = new UIManager(self);
        self.battle = new BattleManager(self, timeManager);
        self.inventory = new InventoryManager(self);
        self.base = new BaseManager(self, timeManager); 

        // ✨ 핵심: TimeManager가 시간을 올릴 때마다 건설 큐를 자동으로 확인하도록 연결
        const originalAdvanceTime = timeManager.advanceTime.bind(timeManager);
        timeManager.advanceTime = function(minutes) {
            originalAdvanceTime(minutes);
            if (self.base && self.base.checkConstructions) {
                self.base.checkConstructions();
            }
            if (self.updateHeroStats) {
                self.updateHeroStats();
            }
        };

        if (typeof loadAllData === 'function') {
            loadAllData().then(() => {
                self.updateTimeDisplay();
            });
        }

        return self;
    };

    return {
        getInstance: function (name) {
            if (!instance) {
                if (!name) return null; 
                instance = initiate(name);
            }
            return instance;
        }
    };
})();

document.querySelector('.message-box').onclick = function() {
    if(TurnGame.getInstance()) TurnGame.getInstance().showLog();
};
document.getElementById('start-screen').onsubmit = function (e) {
    e.preventDefault();
    let name = document.getElementById('name-input').value;
    if (name && name.trim()) TurnGame.getInstance(name).showXp().toggleMenu();
    else alert('이름을 입력해주세요');
};

document.addEventListener('keydown', function(event) {
    if (!window.TurnGame.getInstance()) return; 
    const key = event.key;
    const gameMenu = document.getElementById('game-menu');
    const battleMenu = document.getElementById('battle-menu');
    const baseMenu = document.getElementById('base-menu');
    const statusMenu = document.getElementById('status-menu');
    const inventoryMenu = document.getElementById('inventory-menu');
    const baseManageMenu = document.getElementById('base-manage-menu');
    const constructMenu = document.getElementById('construct-menu');
    const facilityMenu = document.getElementById('facility-menu');

    if (statusMenu && statusMenu.style.display === 'grid') {
        if (key === '1' || key === '3') window.TurnGame.getInstance().statusInput(key);
        return;
    }
    if (facilityMenu && facilityMenu.style.display === 'grid') { // ✨ 단축키 3번 처리
        if (key === '3') window.TurnGame.getInstance().facilityInput(key);
        return;
    }
    if (constructMenu && constructMenu.style.display === 'grid') {
        if (key === '3') window.TurnGame.getInstance().constructInput(key);
        return;
    }
    if (baseManageMenu && baseManageMenu.style.display === 'grid') {
        if (key === '1' || key === '3') window.TurnGame.getInstance().baseManageInput(key);
        return;
    }
    if (facilityMenu && facilityMenu.style.display === 'grid') { 
        if (key === '3') window.TurnGame.getInstance().facilityInput(key);
        return;
    }
    


    if (document.getElementById('save-modal') && document.getElementById('save-modal').style.display !== 'none') return;
    if (document.getElementById('log-modal') && document.getElementById('log-modal').style.display !== 'none') return;
    if (document.getElementById('start-screen') && document.getElementById('start-screen').style.display !== 'none') return;

    if (key === '`') { window.TurnGame.getInstance().toggleDevMode(); return; }
    if (window.TurnGame.getInstance().devModeActive && ['q', 'w', 'e', 'r'].includes(key.toLowerCase())) {
        window.TurnGame.getInstance().devInput(key.toLowerCase()); return;
    }

    if (inventoryMenu && inventoryMenu.style.display === 'grid') {
        if (['1', '2', '3', '9'].includes(key)) window.TurnGame.getInstance().inventoryInput(key);
        return;
    }

    if (['1', '2', '3', '4'].includes(key)) {
        if (baseMenu && baseMenu.style.display === 'grid') window.TurnGame.getInstance().baseInput(key);
        else if (battleMenu && battleMenu.style.display === 'grid') window.TurnGame.getInstance().battleInput(key);
        else if (gameMenu && gameMenu.style.display === 'grid') window.TurnGame.getInstance().menuInput(key);
    }
});

function checkGameStarted() { return !!TurnGame.getInstance(); }
document.getElementById('btn-inventory').onclick = function() { if (checkGameStarted()) TurnGame.getInstance().openInventory(); };
document.getElementById('btn-base').onclick = function() { if (checkGameStarted()) TurnGame.getInstance().moveToBase(); };
document.getElementById('saveGame').onclick = function() { if (checkGameStarted()) SaveSlotUI.open('SAVE'); };
document.getElementById('loadGame').onclick = function() { SaveSlotUI.open('LOAD'); };
document.getElementById('btn-status').onclick = function() { if (checkGameStarted()) TurnGame.getInstance().openStatus(); };