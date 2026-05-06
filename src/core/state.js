export let LocationDB = {};
export let BuffDB = {};
export let FacilityDB = {};

export let gameState = {
    hero: { 
        name: '', lev: 1, xp: 0,
        maxHp: 100, hp: 100, baseMaxHp: 100,
        att: 10, baseMaxAtt: 10,
        def: 1, baseMaxDef: 1,
        maxMp: 100, mp: 100, baseMaxMp: 100,
        maxSp: 10, sp: 10, baseMaxSp: 10,
        buffs: []
    },
    monster: null,
    turn: true,
    day: 1,
    canMoveToBase: true,
    location: 'tutorialField',
    monsters: [],
    worldTime: 0,
    lastDay: 0,
    baseEntryChance: 1,
    inventory: [ { id: 'potion', count: 3 } ],
    messageLog: [],
    isGameOver: false
};

export let ItemDB = {};
export let Recipes = [];

// src/core/state.js

export async function loadAllData() {
    try {
        console.log("⏳ 데이터 로딩 시작...");

        // 몬스터 데이터 로드
        const monsterRes = await fetch('/data/enemies.json');
        if (!monsterRes.ok) throw new Error("몬스터 파일을 찾을 수 없습니다.");
        const monsterData = await monsterRes.json();
        
        // ✨ 수정 1: 배열 체크 로직을 없애고, 받아온 객체 데이터를 그대로 연결합니다.
        gameState.monsters = monsterData;

        // 레시피 데이터 로드
        const recipeRes = await fetch('/data/recipes.json');
        const recipeData = await recipeRes.json();
        Recipes.length = 0; // 기존 배열 비우기
        // 레시피도 데이터 구조에 따라 유연하게 대응하도록 안전장치 보강
        Recipes.push(...(Array.isArray(recipeData) ? recipeData : (recipeData.recipes || [])));

        // 아이템 데이터 로드
        const [consumables, materials, equips] = await Promise.all([
            fetch('/data/items_consumable.json').then(res => res.json()),
            fetch('/data/items_material.json').then(res => res.json()),
            fetch('/data/items_equip.json').then(res => res.json())
        ]);

        // ItemDB는 객체이므로 Object.assign 유지
        Object.assign(ItemDB, { ...consumables, ...materials, ...equips });
        
        // ✨ 수정 2: 배열의 .length 대신 Object.keys()를 이용해 객체의 개수를 셉니다.
        console.log("✅ 모든 데이터 로드 완료", { 
            monsterCount: Object.keys(gameState.monsters || {}).length, 
            itemCount: Object.keys(ItemDB).length 
        });

        const locResponse = await fetch('/data/locations.json'); 
        if (locResponse.ok) {
            const locData = await locResponse.json();
            Object.assign(LocationDB, locData); 
        } else {
            console.error('locations.json 파일을 찾을 수 없습니다.');
        }

        // 경로의 일관성을 위해 앞에 '/'를 추가했습니다.
        const buffResponse = await fetch('/data/buffs.json');
        if (buffResponse.ok) Object.assign(BuffDB, await buffResponse.json());

        const facResponse = await fetch('/data/facilities.json');
        if (facResponse.ok) Object.assign(FacilityDB, await facResponse.json());

    } catch (error) {
        console.error("❌ 데이터 로드 중 에러 발생:", error);
    }
}

export function addItem(id, count) {
    if (!ItemDB[id]) return;
    const existing = gameState.inventory.find(slot => slot.id === id);
    if (existing) {
        existing.count += count;
    } else {
        gameState.inventory.push({ id: id, count: count });
    }
}