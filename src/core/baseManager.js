// src/core/baseManager.js
import { gameState } from './state.js';

export class BaseManager {
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
            this.game.setMessage("거점에 도착했습니다.");
            this.game.updateMenuUI();
        }
    }

    baseInput(input) {
        if (input === '1') { 
            this.time.advanceTime(1440); 
            gameState.hero.hp = gameState.hero.maxHp;
            this.game.showHp().setMessage("거점에서 푹 쉬었습니다. 새로운 하루가 시작됩니다.");
        } else if (input === '3') { 
            this.game.uiMode = 'BASE_MANAGE';
            this.game.setMessage("거점 관리 메뉴입니다.");
        } else if (input === '4') { 
            gameState.location = 'field';
            this.game.uiMode = 'NORMAL';
            this.game.setMessage("모험을 위해 필드로 나갑니다.");
        }
        this.game.updateTimeDisplay().updateMenuUI();
    }

    baseManageInput(input) {
        if (input === '1') {
            this.game.uiMode = 'CONSTRUCT';
        } else if (input === '3') {
            this.game.uiMode = 'NORMAL';
        }
        this.game.updateMenuUI();
    }

    constructInput(input) {
        if (input === '3') {
            this.game.uiMode = 'BASE_MANAGE';
            this.game.updateMenuUI();
        }
    }

    tryConstruct(buildingId) {
        // 💡 나중에 state.js나 buildings.json으로 옮길 도면 데이터
        const BuildingDB = {
            "camp": { name: "캠프", icon: "⛺", time: 60, req: { "wood": 10 } },
            "workbench": { name: "작업대", icon: "🗜️", time: 120, req: { "wood": 5, "core": 1 } }
        };

        const bData = BuildingDB[buildingId];
        if (!bData) return;

        if (gameState.buildings && gameState.buildings.includes(buildingId)) {
            return this.game.setMessage("이미 건설된 시설입니다.");
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
            this.game.setMessage("건축하려면 재료가 더 필요해.");
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

        if(!gameState.buildings) gameState.buildings = [];
        gameState.buildings.push(buildingId);

        this.time.advanceTime(bData.time); 
        this.game.setMessage(`✨ ${bData.icon} ${bData.name} 건설 완료! (${bData.time / 60}시간 경과)`);
        this.game.updateTimeDisplay();
        this.game.ui.renderConstruct(); 
    }
}