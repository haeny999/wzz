// src/ui/LogRenderer.js

export class LogRenderer {
    // 게임 화면에 있는 로그 창(HTML 태그)을 가져옴
    static logContainer = document.getElementById("game-log-box");

    static addLog(message) {
        // 1. 새로운 p 태그(문단)를 만듦
        const newLine = document.createElement("p");
        
        // 2. 내용을 채움
        newLine.innerText = message;
        
        // 3. 로그 창에 자식으로 갖다 붙임 (화면에 표시됨)
        this.logContainer.appendChild(newLine);
        
        // 4. 스크롤을 맨 아래로 내려서 최신 글을 보여줌
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
}