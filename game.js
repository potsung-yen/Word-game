let currentPlayer = "";
let currentWord = {};
let isBossMode = false;
let bossWordList = [];

// 初始化語音 API
const synth = window.speechSynthesis;

// 1. 開始遊戲與登入
function startGame() {
    currentPlayer = document.getElementById("playerName").value.trim() || "小勇士";
    document.getElementById("gameArea").style.display = "block";
    document.getElementById("uploadArea").style.display = "block"; // 顯示上傳按鈕
    updateScoreBoard();
    checkBossAvailable();
    nextQuestion();
}

// 取得「預設單字 + 玩家自訂擴充生字」的合併題庫
function getCombinedWordList() {
    let customWords = JSON.parse(localStorage.getItem(`SpellingHero_CustomWords_${currentPlayer}`)) || [];
    return wordList.concat(customWords);
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
        const randomIndex = Math.floor(Math.random() * bossWordList.length);
        currentWord = bossWordList[randomIndex];
    } else {
        // 從合併後的題庫抽題
        const combinedList = getCombinedWordList();
        const randomIndex = Math.floor(Math.random() * combinedList.length);
        currentWord = combinedList[randomIndex];
    }

    document.getElementById("chineseHint").innerText = currentWord.chinese;
    speakWord(); 
}

// 3. 播放英文發音
function speakWord() {
    if (synth.speaking) { return; }
    let textToSpeak = currentWord.english.replace(/^(a |an |the )/i, '').replace(/\([^)]*\)/g, '').trim();
    const utterThis = new SpeechSynthesisUtterance(textToSpeak);
    utterThis.lang = 'en-US'; 
    utterThis.rate = 0.8;     
    synth.speak(utterThis);
}

// 4. 檢查答案與錯題邏輯
function checkAnswer() {
    const userInput = document.getElementById("englishInput").value.trim().toLowerCase();
    const correctAnswer = currentWord.english.toLowerCase();
    const correctClean = correctAnswer.replace(/^(a |an |the )/i, '').replace(/\([^)]*\)/g, '').trim();

    const feedback = document.getElementById("feedbackMsg");
    let playerRecord = getPlayerRecord();

    if (userInput === correctAnswer || userInput === correctClean) {
        feedback.innerText = "✨ 答對了！太厲害了！";
        feedback.className = "feedback correct";
        playerRecord.score += 10;
        
        if (playerRecord.mistakes[correctAnswer]) {
            playerRecord.mistakes[correctAnswer].count -= 1;
            if (playerRecord.mistakes[correctAnswer].count <= 0) {
                delete playerRecord.mistakes[correctAnswer]; 
            }
        }
    } else {
        feedback.innerText = `❌ 哎呀！正確拼法是: ${currentWord.english}`;
        feedback.className = "feedback wrong";
        
        if (!playerRecord.mistakes[correctAnswer]) {
            playerRecord.mistakes[correctAnswer] = { ...currentWord, count: 1 };
        } else {
            playerRecord.mistakes[correctAnswer].count += 1;
        }
    }

    savePlayerRecord(playerRecord);
    updateScoreBoard();
    checkBossAvailable();

    setTimeout(() => {
        if(isBossMode) {
             bossWordList = Object.values(getPlayerRecord().mistakes);
        }
        nextQuestion();
    }, 1500);
}

function handleEnter(event) {
    if (event.key === "Enter") {
        checkAnswer();
    }
}

// ==========================================
// 資料庫管理 (LocalStorage)
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

function checkBossAvailable() {
    let mistakes = Object.keys(getPlayerRecord().mistakes).length;
    const bossBtn = document.getElementById("bossBtn");
    
    if (mistakes >= 3 && !isBossMode) {
        bossBtn.style.display = "inline-block";
        bossBtn.innerText = `👿 挑戰魔王 (${mistakes}題)`;
    } else {
        bossBtn.style.display = "none";
    }
}

function startBossBattle() {
    isBossMode = true;
    bossWordList = Object.values(getPlayerRecord().mistakes);
    alert("⚔️ 魔王戰開始！這都是你之前不小心拼錯的單字喔，準備接招！");
    nextQuestion();
}

// ==========================================
// 匯出錯題本功能 (下載成 CSV 檔案)
// ==========================================
function exportMistakes() {
    let playerRecord = getPlayerRecord();
    let mistakes = Object.values(playerRecord.mistakes);

    if (mistakes.length === 0) {
        alert("🎉 太棒了！目前沒有常錯單字喔！");
        return;
    }

    let csvContent = "\uFEFF英文單字,中文意思,錯誤次數\n";
    mistakes.sort((a, b) => b.count - a.count);

    mistakes.forEach(word => {
        let safeEnglish = `"${word.english}"`;
        let safeChinese = `"${word.chinese}"`;
        csvContent += `${safeEnglish},${safeChinese},${word.count}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentPlayer}_錯題本.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// 上傳新進度 (讀取 CSV 並擴充單字庫)
// ==========================================
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        let newWords = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue;
            
            const cols = row.split(',');
            if (cols.length >= 2) {
                let eng = cols[0].replace(/['"]/g, '').trim();
                let chi = cols[1].replace(/['"]/g, '').trim();
                
                if (eng && chi && eng !== "英文單字" && eng !== "english") {
                    newWords.push({ english: eng, chinese: chi });
                }
            }
        }

        if (newWords.length > 0) {
            let existingCustomWords = JSON.parse(localStorage.getItem(`SpellingHero_CustomWords_${currentPlayer}`)) || [];
            existingCustomWords = existingCustomWords.concat(newWords);
            
            localStorage.setItem(`SpellingHero_CustomWords_${currentPlayer}`, JSON.stringify(existingCustomWords));
            
            document.getElementById("uploadStatus").innerText = `✅ 成功為 ${currentPlayer} 擴充 ${newWords.length} 個生字！`;
            event.target.value = ''; 
        } else {
            alert("找不到單字，請確保 CSV 格式第一欄是英文、第二欄是中文喔！");
        }
    };
    reader.readAsText(file, "UTF-8");
}
