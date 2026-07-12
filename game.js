let currentPlayer = "";
let currentWord = {};
let isBossMode = false;
let bossWordList = [];

// 初始化語音 API (用來唸英文發音)
const synth = window.speechSynthesis;

// 1. 開始遊戲與登入
function startGame() {
    currentPlayer = document.getElementById("playerName").value.trim() || "小勇士";
    document.getElementById("gameArea").style.display = "block";
    updateScoreBoard();
    checkBossAvailable();
    nextQuestion();
}

// 2. 產出下一題
function nextQuestion() {
    document.getElementById("englishInput").value = "";
    document.getElementById("feedbackMsg").innerText = "";
    document.getElementById("englishInput").focus();

    if (isBossMode) {
        if (bossWordList.length === 0) {
            alert("🎉 太棒了！魔王被打敗了！你把常錯單字都學會了！");
            isBossMode = false;
            checkBossAvailable();
            nextQuestion();
            return;
        }
        // 魔王模式：從錯題本中隨機抽題
        const randomIndex = Math.floor(Math.random() * bossWordList.length);
        currentWord = bossWordList[randomIndex];
    } else {
        // 一般模式：從全部 510 個單字中隨機抽題
        const randomIndex = Math.floor(Math.random() * wordList.length);
        currentWord = wordList[randomIndex];
    }

    document.getElementById("chineseHint").innerText = currentWord.chinese;
    speakWord(); // 出題時自動唸一次發音
}

// 3. 播放英文發音
function speakWord() {
    if (synth.speaking) {
        console.error('語音正在播放中');
        return;
    }
    
    // 過濾掉 a, an, the 以及括號內的內容，讓發音更準確
    let textToSpeak = currentWord.english.replace(/^(a |an |the )/i, '').replace(/\([^)]*\)/g, '').trim();
    
    const utterThis = new SpeechSynthesisUtterance(textToSpeak);
    utterThis.lang = 'en-US'; // 美式發音
    utterThis.rate = 0.8;     // 語速稍微放慢，適合小朋友聽
    synth.speak(utterThis);
}

// 4. 檢查答案與錯題本邏輯
function checkAnswer() {
    const userInput = document.getElementById("englishInput").value.trim().toLowerCase();
    
    // 將正確答案轉小寫
    const correctAnswer = currentWord.english.toLowerCase();
    
    // 建立「乾淨版」解答：過濾掉 a, an, the 跟括號，例如 "a schoolmate" 變成 "schoolmate"
    const correctClean = correctAnswer.replace(/^(a |an |the )/i, '').replace(/\([^)]*\)/g, '').trim();

    const feedback = document.getElementById("feedbackMsg");
    let playerRecord = getPlayerRecord();

    // 只要輸入完全符合，或是符合「乾淨版」解答都算對！
    if (userInput === correctAnswer || userInput === correctClean) {
        feedback.innerText = "✨ 答對了！太厲害了！";
        feedback.className = "feedback correct";
        playerRecord.score += 10;
        
        // 如果是在打魔王，答對一次就扣除錯誤次數
        if (playerRecord.mistakes[correctAnswer]) {
            playerRecord.mistakes[correctAnswer].count -= 1;
            if (playerRecord.mistakes[correctAnswer].count <= 0) {
                delete playerRecord.mistakes[correctAnswer]; // 完全學會，從錯題本移除
            }
        }
    } else {
        feedback.innerText = `❌ 哎呀！正確拼法是: ${currentWord.english}`;
        feedback.className = "feedback wrong";
        
        // 紀錄錯題，寫入 LocalStorage
        if (!playerRecord.mistakes[correctAnswer]) {
            playerRecord.mistakes[correctAnswer] = { ...currentWord, count: 1 };
        } else {
            playerRecord.mistakes[correctAnswer].count += 1;
        }
    }

    savePlayerRecord(playerRecord);
    updateScoreBoard();
    checkBossAvailable();

    // 延遲 1.5 秒後換下一題，讓小朋友看清楚正確答案
    setTimeout(() => {
        if(isBossMode) {
             // 隨時更新魔王題庫（把剛剛答對移除的單字排除）
             bossWordList = Object.values(getPlayerRecord().mistakes);
        }
        nextQuestion();
    }, 1500);
}

// 支援按下 Enter 鍵送出答案
function handleEnter(event) {
    if (event.key === "Enter") {
        checkAnswer();
    }
}

// ==========================================
// 資料庫管理 (使用瀏覽器 LocalStorage)
// ==========================================
function getPlayerRecord() {
    let data = localStorage.getItem(`SpellingHero_${currentPlayer}`);
    return data ? JSON.parse(data) : { score: 0, mistakes: {} };
}

function savePlayerRecord(data) {
    localStorage.setItem(`SpellingHero_${currentPlayer}`, JSON.stringify(data));
}

function updateScoreBoard() {
    document.getElementById("score").innerText = getPlayerRecord().score;
}

// 檢查是否要顯示魔王按鈕
function checkBossAvailable() {
    let mistakes = Object.keys(getPlayerRecord().mistakes).length;
    const bossBtn = document.getElementById("bossBtn");
    
    // 如果錯題累積超過 3 題，且目前不在魔王模式，就出現魔王按鈕
    if (mistakes >= 3 && !isBossMode) {
        bossBtn.style.display = "inline-block";
        bossBtn.innerText = `👿 挑戰魔王 (${mistakes}題)`;
    } else {
        bossBtn.style.display = "none";
    }
}

// 啟動魔王模式
function startBossBattle() {
    isBossMode = true;
    bossWordList = Object.values(getPlayerRecord().mistakes);
    alert("⚔️ 魔王戰開始！這都是你之前不小心拼錯的單字喔，準備接招！");
    nextQuestion();
}
