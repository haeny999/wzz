// src/core/inventoryManager.js
import { gameState, ItemDB, Recipes, addItem } from './state.js';

export class InventoryManager {
    constructor(game) {
        this.game = game; // main.js의 self 객체 (UI 및 상태 조작용)
    }

    createInventoryMenu() {
        const gameArea = document.getElementById('game-area');
        if (document.getElementById('inventory-menu')) return;
        
        const div = document.createElement('div');
        div.id = 'inventory-menu';
        div.style.display = 'none';
        div.className = 'grid-menu';
        div.style.gridTemplateColumns = '1fr 1fr';
        div.style.gap = '8px';
        div.innerHTML = `
            <div class="command-link" onclick="window.TurnGame.getInstance().inventoryInput('1')">1. 🛠️ 제작하기</div>
            <div class="command-link" onclick="window.TurnGame.getInstance().inventoryInput('2')">2. 🗑️ 버리기</div>
            <div class="command-link" onclick="window.TurnGame.getInstance().inventoryInput('3')">3. ❌ 닫기</div>
            <div class="command-link" id="craft-confirm-btn" style="display:none; color:#f1c40f;" onclick="window.TurnGame.getInstance().inventoryInput('9')">9. ✨ 제작 확정!</div>
        `;
        gameArea.appendChild(div);
    }

    openInventory() {
        if (gameState.monster) return this.game.setMessage("⚠️전투 중엔 가방을 열 수 없습니다.");
        this.createInventoryMenu(); 
        this.game.uiMode = 'INVENTORY';
        this.game.selectedIndices = [];
        this.game.setMessage("가방을 열었습니다.");
        this.game.updateMenuUI();
    }

    inventoryInput(input) {
        if (input === '1') { 
            if (gameState.inventory.length === 0) return this.game.setMessage("가방이 비어있습니다.");
            this.game.uiMode = 'CRAFTING'; 
            this.game.selectedIndices = [];
            this.game.setMessage("제작할 재료를 선택하세요 (최대 3개).");
            this.renderInventory(); 
        } else if (input === '2') { 
            // ✨ 버리기 모드 추가
            if (gameState.inventory.length === 0) return this.game.setMessage("가방이 비어있습니다.");
            this.game.uiMode = 'DISCARDING'; 
            this.game.selectedIndices = [];
            this.game.setMessage("버릴 아이템을 선택하세요. (선택 후 실행버튼/9번)");
            this.renderInventory();
        } else if (input === '3') { 
            this.game.uiMode = 'NORMAL';
            this.game.selectedIndices = [];
            this.game.updateMenuUI();
            
            // 화면 청소 로직 유지
            if (gameState.location === 'base') {
                document.getElementById('map-area').innerHTML = '<div style="padding:20px; text-align:center;">⛺ 거점 메인</div>';
            } else {
                document.getElementById('map-area').innerHTML = '<span>🗺️ MAP AREA</span>';
            }
        } else if (input === '9') { 
            // ✨ 현재 uiMode에 따라 실행 함수 분기
            if (this.game.uiMode === 'CRAFTING') {
                this.tryCrafting();
            } else if (this.game.uiMode === 'DISCARDING') {
                this.tryDiscarding();
            }
        }
    }

        renderInventory() {
        const mapArea = document.getElementById('map-area');
        mapArea.innerHTML = ''; 
        
        let displayItems = gameState.inventory.map((slot, index) => ({
            ...slot,
            realIndex: index
        }));

        if (!gameState.inventoryColumns) gameState.inventoryColumns = 4;
        const cols = gameState.inventoryColumns;

        // 1. 우측 상단에 '배열 변경 버튼' 만들기
        const topBar = document.createElement('div');
        topBar.style.cssText = "display: flex; justify-content: flex-end; padding: 5px 10px 0 0; width: 100%; box-sizing: border-box;";
        
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = `🔲 ${cols}열 보기`;
        toggleBtn.style.cssText = "background: #314735; border: 1px solid #4a705b; color: #eee; padding: 6px 12px; border-radius: 5px; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.5);";
        
        // 버튼 클릭 시 열 개수를 2개씩 늘리고, 8이 넘으면 4로 되돌림
        toggleBtn.onclick = () => {
            gameState.inventoryColumns += 2;
            if (gameState.inventoryColumns > 8) gameState.inventoryColumns = 4;
            this.renderInventory(); 
        };
        
        topBar.appendChild(toggleBtn);
        mapArea.appendChild(topBar); 

        // 2. 가방 그리드 생성 (중복 선언된 에러 해결!)
        const grid = document.createElement('div');
        grid.className = 'inventory-grid';
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // 3. 열 개수에 비례해서 아이콘과 숫자 크기 설정
        const iconSize = cols === 4 ? '50px' : (cols === 6 ? '30px' : '22px');
        const countSize = cols === 4 ? '24px' : (cols === 6 ? '16px' : '12px');

        // 전투 중에는 소모품만 보이기
        if (this.game.uiMode === 'BATTLE_ITEM' || this.game.uiMode === 'BATTLE_ITEM_CONFIRM') {
            displayItems = displayItems.filter(slot => ItemDB[slot.id] && ItemDB[slot.id].type === 'consumable');
        }

        // 아이템이 없을 때의 처리 (버튼이 사라지지 않게 수정)
        if (displayItems.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = "color:#aaa; text-align:center; padding-top:50px; width:100%;";
            emptyMsg.innerHTML = "아이템이 없습니다.";
            mapArea.appendChild(emptyMsg);
            return;
        }

        // 4. 아이템 렌더링
        displayItems.forEach((slot) => {
            const item = ItemDB[slot.id];
            if (!item) return;

            const div = document.createElement('div');
            div.className = 'item-slot';
            // ✨ 상자의 기본 글씨(아이콘) 크기를 적용!
            div.style.fontSize = iconSize;
            
            // 아이콘과 카운트 공통 HTML (숫자 크기 적용)
            const iconHtml = `<span>${item.icon || '📦'}</span>`;
            const countHtml = `<span class="item-count" style="font-size: ${countSize};">${slot.count}</span>`;

            if (this.game.uiMode === 'CRAFTING') {
                const countInSelection = this.game.selectedIndices.filter(i => i === slot.realIndex).length;
                if (countInSelection > 0) {
                    div.style.border = '2px solid #3498db'; 
                    div.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
                    div.innerHTML = `${iconHtml}${countHtml}<span style="position:absolute; top:-5px; left:-5px; background:#3498db; color:white; font-size:12px; font-weight:bold; padding:2px 6px; border-radius:10px;">${countInSelection}</span>`;
                } else {
                    div.innerHTML = `${iconHtml}${countHtml}`;
                }
            } else if (this.game.uiMode === 'BATTLE_ITEM_CONFIRM' && this.game.tempItemIndex === slot.realIndex) {
                div.style.border = '2px solid #f1c40f'; 
                div.style.backgroundColor = 'rgba(241, 196, 15, 0.2)';
                div.innerHTML = `${iconHtml}${countHtml}`;
            } else {
                div.innerHTML = `${iconHtml}${countHtml}`;
            }
            
            div.onclick = () => {
                if (this.game.uiMode === 'BATTLE_ITEM' || this.game.uiMode === 'BATTLE_ITEM_CONFIRM') {
                    this.game.tempItemIndex = slot.realIndex; 
                    this.game.uiMode = 'BATTLE_ITEM_CONFIRM';
                    this.game.updateMenuUI();
                    this.game.setMessage(`[${item.name}]을(를) 사용하시겠습니까?`);
                } else {
                    this.handleItemClick(slot.realIndex);
                }
            };
            grid.appendChild(div);
        });
        
        mapArea.appendChild(grid);
    }


    handleItemClick(index) {
        const slot = gameState.inventory[index];
        if (!slot) return;
        const itemData = ItemDB[slot.id];
        if (!itemData) return;

        if (this.game.uiMode === 'CRAFTING' || this.game.uiMode === 'DISCARDING') {
            const countInSelection = this.game.selectedIndices.filter(i => i === index).length;
            if (countInSelection < slot.count && this.game.selectedIndices.length < 3) {
                this.game.selectedIndices.push(index);
            } else {
                this.game.selectedIndices = this.game.selectedIndices.filter(i => i !== index);
            }
            this.renderInventory();
            
            const counts = {};
            this.game.selectedIndices.forEach(i => {
                const name = ItemDB[gameState.inventory[i].id].name;
                counts[name] = (counts[name] || 0) + 1;
            });
            const names = Object.entries(counts)
                .map(([name, count]) => `${name}${count > 1 ? ' x' + count : ''}`)
                .join(', ');
            
            this.game.setMessage(names ? `선택된 재료: [ ${names} ]` : "제작할 재료를 선택하세요.");
            
            const confirmBtn = document.getElementById('craft-confirm-btn');
            if(confirmBtn) confirmBtn.style.display = this.game.selectedIndices.length > 0 ? 'block' : 'none';
            
        } else {
            this.game.setMessage(`[${itemData.name}] ${itemData.desc} (보유: ${slot.count}개)`);
        }
    }

    tryCrafting() {
        if (this.game.selectedIndices.length === 0) return;
        
        // ✨ 유저가 선택한 순서대로 재료 ID 배열을 만듭니다. (.sort() 제거)
        const ingredients = this.game.selectedIndices.map(idx => gameState.inventory[idx].id);
        
        let foundRecipe = null;
        if (Recipes && Recipes.length > 0) {
            for (let r of Recipes) {
                // ✨ 레시피의 재료 배열도 정렬하지 않고 그대로 사용합니다.
                // join(',')을 이용해 "wood,stone" === "wood,stone" 형태로 순서까지 엄격하게 비교합니다.
                if (r.ingredients.join(',') === ingredients.join(',')) { 
                    foundRecipe = r; 
                    break; 
                }
            }
        }
        
        if (foundRecipe) {
            const resultItem = ItemDB[foundRecipe.result];
            
            // 재료 차감
            this.game.selectedIndices.forEach(idx => { 
                if (gameState.inventory[idx].count > 0) gameState.inventory[idx].count--; 
            });
            gameState.inventory = gameState.inventory.filter(slot => slot.count > 0);
            
            // 결과물 지급 및 메세지
            if (typeof addItem === 'function') addItem(foundRecipe.result, 1);
            this.game.setMessage(`✨ 제작 성공! [${resultItem.icon || ''}${resultItem.name}] 획득!`);
            
            // UI 초기화
            this.game.selectedIndices = []; 
            this.game.uiMode = 'INVENTORY';
            this.game.updateMenuUI(); 
        } else {
            // 실패 처리
            this.game.setMessage("💩 실패! 알 수 없는 조합입니다.");
            this.game.selectedIndices = []; 
            this.renderInventory();
        }
    }

    tryDiscarding() {
        if (this.game.selectedIndices.length === 0) {
            return this.game.setMessage("버릴 아이템을 먼저 선택해주세요.");
        }

        // 선택된 아이템들의 이름을 모아서 문자열로 만듦
        const selectedNames = this.game.selectedIndices.map(idx => {
            const itemId = gameState.inventory[idx].id;
            return ItemDB[itemId] ? ItemDB[itemId].name : "알 수 없는 아이템";
        });

        // ⚠️ 확인창(Confirm) 띄우기
        const confirmMsg = `다음 아이템을 전부 버리시겠습니까?\n\n[ ${selectedNames.join(', ')} ]\n\n※ 이 작업은 되돌릴 수 없습니다!`;
        
        if (confirm(confirmMsg)) {
            // '확인'을 누른 경우: 선택된 슬롯의 아이템 개수를 0으로 만듦
            this.game.selectedIndices.forEach(idx => {
                if (gameState.inventory[idx]) {
                    gameState.inventory[idx].count = 0; 
                }
            });

            // 개수가 0이 된 빈 슬롯을 인벤토리 배열에서 완전히 제거
            gameState.inventory = gameState.inventory.filter(slot => slot.count > 0);

            this.game.setMessage("🗑️ 선택한 아이템을 버렸습니다.");
            this.game.selectedIndices = [];
            this.game.uiMode = 'INVENTORY';
            this.game.updateMenuUI(); // 메뉴를 다시 기본 가방 상태로 갱신
        } else {
            // '취소'를 누른 경우
            this.game.setMessage("버리기를 취소했습니다.");
            this.game.selectedIndices = []; // 선택 취소
            this.renderInventory(); // 가방 다시 그리기
        }
    }
}
