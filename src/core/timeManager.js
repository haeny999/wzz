// src/core/timeManager.js

export class TimeManager {
    constructor(gameState) {
        this.state = gameState;
    }

    advanceTime(minutes) {
        // 1. 시간 누적
        this.state.worldTime = (this.state.worldTime || 0) + minutes;
        
        // 2. ✨ 생존 수치 감소 (에러 해결 지점!)
        this.triggerSurvivalTick(minutes);

        // 3. 날짜 변경 체크
        this.checkDailyEvents();
    }

    // 🚨 새로 추가된 함수: 시간이 흐름에 따라 허기짐 등을 계산
    triggerSurvivalTick(minutes) {
        // 예: 10분당 배고픔(hunger)이 1씩 감소하는 로직을 나중에 넣을 수 있습니다.
        // 현재는 에러 방지를 위해 로그만 남기거나 비워둡니다.
        if (this.state.hero.hunger !== undefined) {
            // 60분당 허기 5 감소 같은 로직 예시
            // this.state.hero.hunger -= (minutes / 12); 
        }
        
        // console.log(`${minutes}분 경과: 생존 수치 계산 완료`);
    }

    checkDailyEvents() {
        const currentDay = Math.floor(this.state.worldTime / 1440); // 1440분 = 24시간
        if (currentDay > (this.state.lastDay || 0)) {
            this.state.baseEntryChance = 1; // 하루 지났으니 거점 입장 횟수 초기화
            this.state.lastDay = currentDay;
            console.log("☀️ 새로운 하루가 시작되었습니다.");
        }
    }
}