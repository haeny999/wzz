// src/core/battleManager.js
import { gameState, ItemDB, addItem, loadAllData } from './state.js';

export class BattleManager {
    constructor(game, timeManager) {
        this.game = game; // main.js의 self 객체 (UI 조작용)
        this.time = timeManager;
    }

    generateMonster() {
        // ✨ 1. 배열이 아닌 객체에 맞춰 데이터가 비어있는지 확인하는 로직으로 변경
        if (!gameState.monsters || Object.keys(gameState.monsters).length === 0) {
            this.game.setMessage("⚠️ 몬스터 데이터를 불러오는 중입니다. 한 번 더 눌러주세요!");
            if (typeof loadAllData === 'function') loadAllData(); 
            return; 
        }

        // ✨ 2. 객체(Dictionary) 데이터를 배열(Array)로 변환한 뒤 랜덤으로 뽑기
        const monsterArray = Object.values(gameState.monsters);
        let base = monsterArray[Math.floor(Math.random() * monsterArray.length)];

        gameState.monster = {
            name: base.name, 
            hp: base.hp + (gameState.hero.lev * 5),
            att: base.att + gameState.hero.lev, 
            xp: base.xp + gameState.hero.lev,
            drops: base.drops || [] 
        };

        document.getElementById('monster-name').innerHTML = gameState.monster.name;
        document.getElementById('monster-hp').innerHTML = 'HP: ' + gameState.monster.hp;
        document.getElementById('monster-att').innerHTML = 'ATT: ' + gameState.monster.att;
        
        // 주의: menuInput에서 메세지를 출력하고 있다면 아래 줄은 지우거나 주석 처리해도 좋습니다.
        // this.game.setMessage(gameState.monster.name + ' 출현!');
    }

    battleInput(input) {
        if (gameState.turn === false) return;
        
        // 아이템 사용 모드
        if (this.game.uiMode === 'BATTLE_ITEM_CONFIRM') {
            if (input === '1') return this.useItemInBattle();
            if (input === '2' || input === '3') {
                this.game.uiMode = 'NORMAL';
                this.game.tempItemIndex = null;
                this.game.updateMenuUI();
                return;
            }
            return;
        }
        if (this.game.uiMode === 'BATTLE_ITEM') {
            if (input === '3') {
                this.game.uiMode = 'NORMAL';
                this.game.updateMenuUI();
                return;
            }
            return;
        }

        // 기본 전투 모드
        if (input === '1') this.attackMonster();
        else if (input === '2') {
            this.game.uiMode = 'BATTLE_ITEM';
            this.game.updateMenuUI();
            this.game.setMessage("사용할 아이템을 선택하세요.");
        }
        else if (input === '4') {
            this.time.advanceTime(10); 
            this.game.updateTimeDisplay();
            this.clearMonster();
            this.game.setMessage('도망쳤습니다... (10분 경과)');
        }
    }

    attackMonster() {
        if (!gameState.monster) return;
        this.time.advanceTime(2);
        this.game.updateTimeDisplay();

        let weaponAtt = 0;
        gameState.inventory.forEach(slot => {
            let item = ItemDB[slot.id];
            if (item && item.type === 'equip' && item.att > weaponAtt) weaponAtt = item.att;
        });

        let totalAtt = gameState.hero.att + weaponAtt;
        gameState.monster.hp -= totalAtt;
        document.getElementById('monster-hp').innerHTML = 'HP: ' + Math.max(0, gameState.monster.hp);
        
        // ✨ 플레이어가 입힌 데미지 포맷 변경 & 빨간색 적용
        let msg = `<span style="color:#ff6b6b;">[${gameState.hero.name}]의 공격. ${totalAtt}의 피해를 입혔다.</span>`;
        // 무기 추가 데미지 정보는 살짝 회색으로 뒤에 붙여줍니다
        if(weaponAtt > 0) msg += ` <span style="font-size:0.8em; color:#ccc;">(무기 +${weaponAtt})</span>`;

        if (gameState.monster.hp <= 0) {
            gameState.turn = false;
            this.game.setMessage(msg);
            this.win();
            return;
        }
        this.game.setMessage(msg);
        this.nextTurn();
    }

    attackHero() {
        // ✨ 몬스터가 입힌 데미지도 계산 후 로그에 빨간색으로 출력!
        let damage = gameState.monster.att;
        gameState.hero.hp -= damage;
        this.game.showHp();
        
        let msg = `<span style="color:#ff6b6b;">[${gameState.monster.name}]의 일반 공격. ${damage}의 피해를 입었다.</span>`;
        this.game.setMessage(msg);

        return gameState.hero.hp <= 0;
    }

    nextTurn() {
        let selfObj = this;
        gameState.turn = false;

        // 1. 플레이어 공격 후 1초 대기 -> 몬스터가 반격!
        window.setTimeout(() => {
            
            // attackHero()가 실행되면서 몬스터의 데미지 메시지가 알림창에 뜹니다.
            if (selfObj.attackHero()) {
                selfObj.game.gameOver();
                return;
            }
            
            // 2. ✨ 핵심! 몬스터가 때린 메시지를 유저가 읽을 수 있게 1초 더 기다려줍니다.
            window.setTimeout(() => {
                gameState.turn = true;
                selfObj.game.setMessage(`${gameState.hero.name}의 턴입니다.`);
            }, 1000); // 여기서 1초(1000ms) 뜸을 들입니다!

        }, 1000);
    }

    win() {
        let msg = `${gameState.monster.name} 처치! Exp +${gameState.monster.xp}`;
        gameState.hero.xp += gameState.monster.xp;
        
        if (gameState.monster.drops) {
            gameState.monster.drops.forEach(drop => {
                if (ItemDB[drop.id]) { 
                    if (Math.random() * 100 <= drop.rate) {
                        // ✨ 2. 무조건 1개가 아니라, 데이터에 적힌 개수(drop.count)만큼 지급합니다.
                        if (typeof addItem === 'function') addItem(drop.id, drop.count);
                        msg += `, [${ItemDB[drop.id].name}] ${drop.count}개 획득`;
                    }
                } else {
                    console.warn(`경고: 몬스터가 '${drop.id}'를 드랍했지만 ItemDB에 없습니다!`);
                }
            });
        }
        this.game.setMessage(msg);
        window.setTimeout(() => {
            this.clearMonster();
            this.game.showXp();
        }, 1000);
    }

    clearMonster() {
        gameState.monster = null;
        gameState.turn = true;
        document.getElementById('monster-name').innerHTML = '';
        document.getElementById('monster-hp').innerHTML = '';
        document.getElementById('monster-att').innerHTML = '';
        this.game.updateMenuUI();
    }

    useItemInBattle() {
        const slot = gameState.inventory[this.game.tempItemIndex];
        if (!slot) return;
        const itemData = ItemDB[slot.id];
        if (!itemData) return;

        this.time.advanceTime(2);
        this.game.updateTimeDisplay();

        if (itemData.effect === 'heal') {
            const healAmount = itemData.val || 0;
            gameState.hero.hp = Math.min(gameState.hero.maxHp, gameState.hero.hp + healAmount);
            this.game.setMessage(`${itemData.name} 사용! 체력을 ${healAmount} 회복했습니다.`);
        } 

        slot.count--;
        if (slot.count <= 0) {
            gameState.inventory.splice(this.game.tempItemIndex, 1);
        }

        this.game.uiMode = 'NORMAL';
        this.game.tempItemIndex = null;
        this.game.showHp();
        this.game.updateMenuUI();
        this.nextTurn();
    }
}