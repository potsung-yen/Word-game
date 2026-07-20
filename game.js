let currentPlayer = "";
let currentWord = {};
let isBossMode = false;
let bossWordList = [];

const synth = window.speechSynthesis;

function startGame() {
    currentPlayer = document.getElementById("playerName").value.trim() || "小勇士";
    document.getElementById("gameArea").style.display = "block";
    document.getElementById("uploadArea").style.display = "block"; 
    updateScoreBoard();
    checkBossAvailable();
    nextQuestion();
}

// 取得「指定範圍」的合併題庫
function getCombinedWordList() {
    let customWords = JSON.parse(localStorage.getItem(`SpellingHero_CustomWords_${currentPlayer}`)) || [];
    let fullList = wordList.concat(customWords);

    // 讀取使用者設定的範圍
    let start = parseInt(document.getElementById("startIdx").value) || 1;
    let end = parseInt(document.getElementById("endIdx").value) || fullList.length;

    // 防呆處理：確保範圍在合理區間
    if (start < 1) start = 1;
    if (end > fullList.length) end = fullList.length;
    if (start > end) start = end;

    // 回傳擷取後的範圍陣列
    return fullList.slice(start - 1, end);
}

function nextQuestion() {
    // 恢復介面狀態：顯示送出按鈕，隱藏下一題按鈕
    document.getElementById("submitBtn").style.display = "inline-block";
    document.getElementById("nextBtn").style.display = "none";
    document.getElementById("englishInput").disabled = false;
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
        // 從過濾後的指定範圍內抽題
        const combinedList = getCombinedWordList();
        const randomIndex = Math.floor(Math.random() * combinedList.length);
        currentWord = combinedList[randomIndex];
    }

    document.getElementById("chineseHint").innerText = currentWord.chinese;
    speakWord(); 
}

function speakWord() {
    if (synth.speaking) { return; }
    let textToSpeak = currentWord.english.replace(/^(a |an |the )/i, '').replace(/\([^)]*\)/g, '').trim();
    const utterThis = new SpeechSynthesisUtterance(textToSpeak);
    utterThis.lang = 'en-US'; 
    utterThis.rate = 0.8;     
    synth.speak(utterThis);
}

function checkAnswer() {
    const userInput = document.getElementById("englishInput").value.trim().toLowerCase();
    if (!userInput) return; // 沒輸入不反應

    const correctAnswer = currentWord.english.toLowerCase();
    const correctClean = correctAnswer.replace(/^(a |an |the )/i, '').replace(/\([^)]*\)/g, '').trim();

    const feedback = document.getElementById("feedbackMsg");
    let playerRecord = getPlayerRecord();
    let isCorrect = (userInput === correctAnswer || userInput === correctClean);

    if (isCorrect) {
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
        feedback.innerText = `❌ 正確拼法: ${currentWord.english}`;
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

    // 答題後鎖定輸入框並隱藏送出按鈕
    document.getElementById("englishInput").disabled = true;
    document.getElementById("submitBtn").style.display = "none";

    let autoNext = document.getElementById("autoNext").checked;

    if (autoNext) {
        // 如果自動切換：答對給 1.5 秒看，答錯延長到 3.5 秒讓他背誦
        let delay = isCorrect ? 1500 : 3500;
        setTimeout(() => {
            if(isBossMode) bossWordList = Object.values(getPlayerRecord().mistakes);
            nextQuestion();
        }, delay);
    } else {
        // 如果取消自動切換：顯示「下一題」按鈕，讓小朋友背完自己按
        document.getElementById("nextBtn").style.display = "inline-block";
        if(isBossMode) bossWordList = Object.values(getPlayerRecord().mistakes);
    }
}

// 根據目前顯示的按鈕，決定 Enter 鍵的功能
function handleEnter(event) {
    if (event.key === "Enter") {
        if (document.getElementById("nextBtn").style.display === "inline-block") {
            nextQuestion();
        } else if (document.getElementById("submitBtn").style.display === "inline-block") {
            checkAnswer();
        }
    }
}

// ==========================================
// 資料庫與其他功能保持不變
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
function exportMistakes() {
    let playerRecord = getPlayerRecord();
    let mistakes = Object.values(playerRecord.mistakes);
    if (mistakes.length === 0) { alert("🎉 太棒了！目前沒有常錯單字喔！"); return; }
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
            
            // 上傳後自動把「測驗範圍」的最大值更新到最新單字量
            document.getElementById("endIdx").value = wordList.length + existingCustomWords.length;

            document.getElementById("uploadStatus").innerText = `✅ 成功為 ${currentPlayer} 擴充 ${newWords.length} 個生字！`;
            event.target.value = ''; 
        } else {
            alert("找不到單字，請確保 CSV 格式第一欄是英文、第二欄是中文喔！");
        }
    };
    reader.readAsText(file, "UTF-8");
}
