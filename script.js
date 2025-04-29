// === Biến toàn cục ===
let selectedTopic = null;
let quizData = [];
let currentQuestionIndex = 0;
let selectedAnswers = [];
let startTime = null;
let maxDuration = 120; // giây
let timerInterval = null;
let fiftyFiftyUsed = false;
let addTimeUsed = false;
let correctStreak = 0;
let remainingTime = 0;
// DOM elements
const topicDropdown = document.getElementById("topicDropdown");
const quizDiv = document.getElementById("quiz");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const resultDiv = document.getElementById("result");
const scoreText = document.getElementById("scoreText");
const explanationList = document.getElementById("explanationList");
const questionButtons = document.getElementById("questionButtons");
const img = document.getElementById("questionImage");

// === Khởi tạo Materialize dropdown ===
document.addEventListener("DOMContentLoaded", () => {
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);

    // Gán sự kiện onchange cho #modeSelector
    const modeSelector = document.getElementById("modeSelector");
    modeSelector.addEventListener("change", loadTopicsByMode);

    // Load lại trạng thái trước nếu có
    if (localStorage.getItem('currentQuizMode')) {
        loadSavedAnswers();
    }
});
// === Thêm xử lý cho nút 50/50  ===
document.getElementById("btn5050").addEventListener("click", () => {
    if (fiftyFiftyUsed) return;
    fiftyFiftyUsed = true;

    const question = quizData[currentQuestionIndex];
    const correctAnswer = Array.isArray(question.answer) ? question.answer[0] : question.answer;
    const correctIdx = question.options.indexOf(correctAnswer);

    let wrongIndexes = question.options.map((_, i) => i).filter(i => i !== correctIdx);
    wrongIndexes = shuffle(wrongIndexes).slice(0, 2);

    const labels = optionsContainer.querySelectorAll("label");
    wrongIndexes.forEach(idx => labels[idx].classList.add("faded-option"));
});

// === Thêm xử lý cho nút +5 giây  ===
document.getElementById("btnAddTime").addEventListener("click", () => {
    if (addTimeUsed) return;
    addTimeUsed = true;
    remainingTime += 5;
});

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// === Load đáp án đã lưu (nếu có) ===
function loadSavedAnswers() {
    const saved = JSON.parse(localStorage.getItem('currentQuizAnswers'));
    const savedTopic = localStorage.getItem('currentQuizTopic');
    const savedMode = localStorage.getItem('currentQuizMode');

    if (saved && savedTopic && savedMode) {
        selectedAnswers = saved;
        selectedTopic = savedTopic;

        // Khôi phục giao diện chọn chủ đề
        document.getElementById("modeSelector").value = savedMode;
        loadTopicsByMode();
        setTimeout(() => {
            document.getElementById("topicDropdown").value = savedTopic;
            M.FormSelect.init(topicDropdown);
        }, 100); // Delay nhỏ để đợi DOM render xong

        // Load lại quiz
        quizData = questionsByTopic[savedMode][savedTopic];
        currentQuestionIndex = 0;
        document.getElementById("topic-selector").classList.add("hidden");
        quizDiv.classList.remove("hidden");
        resultDiv.classList.add("hidden");

        startTime = new Date();
        showQuestion();
        renderQuestionButtons();
        startTimer();
    }
}

// === Lưu đáp án hiện tại ===
function saveAnswers() {
    localStorage.setItem('currentQuizAnswers', JSON.stringify(selectedAnswers));
    localStorage.setItem('currentQuizTopic', selectedTopic);
    localStorage.setItem('currentQuizMode', document.getElementById("modeSelector").value);
}

// === Load chủ đề theo chế độ ===
function loadTopicsByMode() {
    const mode = document.getElementById("modeSelector").value;
    topicDropdown.innerHTML = '<option value="" disabled selected>-- Chọn chủ đề --</option>';

    if (!questionsByTopic[mode]) return;

    for (let topic in questionsByTopic[mode]) {
        const option = document.createElement("option");
        option.value = topic;
        option.textContent = topic;
        topicDropdown.appendChild(option);
    }

    M.FormSelect.init(topicDropdown);
}

// === Bắt đầu Quiz ===
function startQuiz() {
    const mode = document.getElementById("modeSelector").value;
    selectedTopic = topicDropdown.value;

    if (!mode || !selectedTopic) {
        Swal.fire('Lỗi', 'Vui lòng chọn loại và chủ đề.', 'warning');
        return;
    }

    quizData = questionsByTopic[mode][selectedTopic];
    currentQuestionIndex = 0;
    selectedAnswers = [];
    startTime = new Date();

    document.getElementById("topic-selector").classList.add("hidden");
    quizDiv.classList.remove("hidden");
    resultDiv.classList.add("hidden");

    fiftyFiftyUsed = false;
    addTimeUsed = false;
    correctStreak = 0;

    showQuestion();
    renderQuestionButtons();
    startTimer();
}

// === Hiển thị câu hỏi hiện tại ===
// function showQuestion() {
//     const q = quizData[currentQuestionIndex];
//     questionText.textContent = `Câu ${currentQuestionIndex + 1}: ${q.question}`;
//
//     if (q.image) {
//         img.src = q.image;
//         img.classList.remove("hidden");
//     } else {
//         img.src = "";
//         img.classList.add("hidden");
//     }
//
//     optionsContainer.innerHTML = '';
//     const savedAnswer = selectedAnswers[currentQuestionIndex];
//
//     q.options.forEach((opt, idx) => {
//         const label = document.createElement("label");
//         label.className = "answer-box";
//
//         const inputType = q.type === "multiple" ? "checkbox" : "radio";
//         const checked = savedAnswer?.selected?.includes(idx) || savedAnswer?.selected === idx ? 'checked' : '';
//
//         label.innerHTML = `
//             <input name="answer" type="${inputType}" value="${idx}" ${checked}/>
//             <span>${opt}</span>
//         `;
//         optionsContainer.appendChild(label);
//     });
//
//     renderQuestionButtons();
// }

function showQuestion() {
    quizDiv.classList.add("fade-out");

    quizDiv.addEventListener("animationend", function handler() {
        quizDiv.removeEventListener("animationend", handler);
        quizDiv.classList.remove("fade-out");

        const q = quizData[currentQuestionIndex];
        questionText.textContent = `Câu ${currentQuestionIndex + 1}: ${q.question}`;

        if (q.image) {
            img.src = q.image;
            img.classList.remove("hidden");
        } else {
            img.src = "";
            img.classList.add("hidden");
        }

        optionsContainer.innerHTML = '';
        const savedAnswer = selectedAnswers[currentQuestionIndex];

        q.options.forEach((opt, idx) => {
            const label = document.createElement("label");
            label.className = "answer-box";

            const inputType = q.type === "multiple" ? "checkbox" : "radio";
            const checked = savedAnswer?.selected?.includes(idx) || savedAnswer?.selected === idx ? 'checked' : '';

            label.innerHTML = `
                <input name="answer" type="${inputType}" value="${idx}" ${checked}/>
                <span>${opt}</span>
            `;
            optionsContainer.appendChild(label);
        });

        renderQuestionButtons();
        quizDiv.classList.add("fade-in");

        setTimeout(() => quizDiv.classList.remove("fade-in"), 300);
    });
}


// === Chuyển câu hỏi ===
function nextQuestion() {
    if (currentQuestionIndex < quizData.length - 1) {
        currentQuestionIndex++;
        saveAnswers();
        showQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        saveAnswers();
        showQuestion();
    }
}

// === Kiểm tra đáp án ===
function checkAnswer() {
    const inputs = document.querySelectorAll('input[name="answer"]');
    let selectedIndices = [];

    inputs.forEach(input => {
        if (input.checked) {
            selectedIndices.push(parseInt(input.value));
        }
    });

    if (selectedIndices.length === 0) {
        Swal.fire('Thông báo', 'Vui lòng chọn ít nhất 1 đáp án.', 'info');
        return;
    }

    const question = quizData[currentQuestionIndex];
    const correctIndices = Array.isArray(question.answer)
        ? question.answer.map(ans => question.options.indexOf(ans))
        : [question.options.indexOf(question.answer)];

    let isCorrect;

    if (question.type === "multiple") {
        // so sánh 2 mảng
        isCorrect = arraysEqual(selectedIndices.sort(), correctIndices.sort());
    } else {
        isCorrect = selectedIndices[0] === correctIndices[0];
    }

    selectedAnswers[currentQuestionIndex] = {
        selected: selectedIndices,
        correct: correctIndices,
        explanation: question.explanation,
        isCorrect
    };

    saveAnswers();
    showQuestion();

    Swal.fire({
        title: isCorrect ? 'Chính xác!' : 'Sai rồi!',
        html: `<p><b>Đáp án đúng:</b> ${correctIndices.map(idx => question.options[idx]).join(', ')}</p><p><b>Giải thích:</b> ${question.explanation}</p>`,
        icon: isCorrect ? 'success' : 'error'
    });

    if (selectedAnswers.filter(a => a !== undefined).length === quizData.length) {
        setTimeout(showResult, 1000);
    }


}

// Helper function: So sánh 2 mảng
function arraysEqual(a1, a2) {
    return JSON.stringify(a1) === JSON.stringify(a2);
}

// === Hiển thị kết quả ===
function showResult() {
    clearInterval(timerInterval);
    quizDiv.classList.add("hidden");
    resultDiv.classList.remove("hidden");

    let score = selectedAnswers.filter(a => a?.isCorrect).length;
    let duration = Math.round((new Date() - startTime) / 1000);

    scoreText.innerHTML = `Bạn đúng ${score}/${quizData.length} câu trong ${duration} giây.`;
    explanationList.innerHTML = '';

    selectedAnswers.forEach((ans, idx) => {
        const item = document.createElement('div');
        item.className = ans.isCorrect ? 'correct' : 'incorrect';
        item.innerHTML = `<b>Câu ${idx + 1}:</b> ${quizData[idx].question}<br/><i>Giải thích:</i> ${ans.explanation}`;
        explanationList.appendChild(item);
    });

    saveHistory(score, quizData.length, duration);
}

// === Lưu lịch sử làm bài ===
function saveHistory(score, total, time) {
    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    history.push({
        topic: selectedTopic,
        score,
        total,
        time,
        date: new Date().toLocaleString()
    });
    localStorage.setItem('quizHistory', JSON.stringify(history));
    localStorage.removeItem('currentQuizAnswers');
}

// === Render các nút chuyển nhanh câu hỏi ===
function renderQuestionButtons() {
    questionButtons.innerHTML = '';
    for (let i = 0; i < quizData.length; i++) {
        const btn = document.createElement('button');
        btn.className = `btn-small ${selectedAnswers[i] ? 'blue' : 'grey'} lighten-1`;
        btn.textContent = i + 1;
        btn.onclick = () => {
            currentQuestionIndex = i;
            showQuestion();
        };
        questionButtons.appendChild(btn);
    }
}

// === Timer đếm ngược ===
function startTimer() {
    remainingTime = maxDuration;
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        remainingTime--;
        document.getElementById("timerDisplay").textContent = `🕑 ${Math.floor(remainingTime / 60)}:${('0' + (remainingTime % 60)).slice(-2)}`;
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            Swal.fire('Hết giờ!', 'Kết thúc bài thi.', 'warning').then(showResult);
        }
    }, 1000);
}

// === Reset Quiz ===
function resetQuiz() {
    localStorage.removeItem('currentQuizAnswers');
    localStorage.removeItem('currentQuizTopic');
    localStorage.removeItem('currentQuizMode');
    document.getElementById("topic-selector").classList.remove("hidden");
    quizDiv.classList.add("hidden");
    resultDiv.classList.add("hidden");
}

