class VocabularyApp {
    constructor() {
        this.vocabulary = [];
        this.currentLessonVocabulary = [];
        this.currentBook = 'All';
        this.currentLesson = '';
        
        // State
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        this.quizQuestions = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.quizMode = 'chinese-meaning';
        
        this.difficultWords = JSON.parse(localStorage.getItem('difficultWords')) || [];

        this.bindEvents();
    }

    bindEvents() {
        // File Upload
        document.getElementById('csv-file').addEventListener('change', (e) => this.handleFileUpload(e));

        // Navigation / Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Dropdowns
        document.getElementById('book-select').addEventListener('change', (e) => {
            this.currentBook = e.target.value;
            this.populateLessonOptions();
        });
        document.getElementById('lesson-select').addEventListener('change', (e) => {
            this.currentLesson = e.target.value;
        });

        // Flashcard Controls
        document.getElementById('start-flashcards-btn').addEventListener('click', () => this.startFlashcards());
        document.getElementById('flashcard').addEventListener('click', () => this.flipFlashcard());
        document.getElementById('next-btn').addEventListener('click', (e) => { e.stopPropagation(); this.nextFlashcard(); });
        document.getElementById('prev-btn').addEventListener('click', (e) => { e.stopPropagation(); this.prevFlashcard(); });
        document.getElementById('exit-flashcard-btn').addEventListener('click', () => this.exitStudyMode());
        document.getElementById('mark-difficult-btn').addEventListener('click', (e) => { e.stopPropagation(); this.markCurrentAsDifficult(); });

        // Quiz Controls
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.startQuiz());
        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retry-quiz-btn').addEventListener('click', () => this.startQuiz());
        document.getElementById('exit-quiz-btn').addEventListener('click', () => this.exitStudyMode());
        
        // Difficult Words
        document.getElementById('clear-difficult-btn').addEventListener('click', () => {
            this.difficultWords = [];
            localStorage.setItem('difficultWords', JSON.stringify([]));
            this.renderDifficultList();
        });
        document.getElementById('back-difficult-btn').addEventListener('click', () => this.switchTab('flashcards'));
    }

    // --- Data Loading ---

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCSV(text);
        };
        reader.readAsText(file);
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return;

        // Detect delimiter (Tab or Comma)
        const firstLine = lines[0];
        const separator = firstLine.includes('\t') ? '\t' : ',';

        const headers = lines[0].split(separator).map(h => h.trim());
        
        // Map headers to internal keys based on the prompt
        // Format: 課-序號	序號	生詞	漢拼	詞類	英譯	越譯	泰譯	緬譯	日譯	韓譯	冊
        const keyMap = {
            '生詞': 'chinese',
            '漢拼': 'pinyin',
            '英譯': 'english',
            '越譯': 'vietnamese',
            '泰譯': 'thai',
            '緬譯': 'burmese',
            '日譯': 'japanese',
            '韓譯': 'korean',
            '冊': 'book',
            '課-序號': 'lessonFull'
        };

        const parsedData = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(separator);
            if (values.length < headers.length) continue;

            let entry = {};
            headers.forEach((header, index) => {
                const mappedKey = keyMap[header];
                if (mappedKey) {
                    entry[mappedKey] = values[index] ? values[index].trim() : '';
                }
            });

            // Extract generic lesson number from '1-1' -> '1' or keep as '1-1'
            // Prompt implies user selects "Lesson". Usually '1-1' means Lesson 1, word 1.
            // Let's assume the part before the dash is the lesson number for grouping.
            if (entry.lessonFull) {
                const parts = entry.lessonFull.split('-');
                entry.lesson = parts[0]; 
            }

            if (entry.chinese) {
                parsedData.push(entry);
            }
        }

        this.vocabulary = parsedData;
        alert(`Loaded ${this.vocabulary.length} words successfully!`);
        this.populateLessonOptions();
    }

    populateLessonOptions() {
        const lessonSelect = document.getElementById('lesson-select');
        lessonSelect.innerHTML = '<option value="">Select Lesson</option>';

        // Filter by book if selected
        let availableVocab = this.vocabulary;
        if (this.currentBook !== 'All') {
            availableVocab = this.vocabulary.filter(w => w.book === this.currentBook);
        }

        // Get unique lessons
        const lessons = [...new Set(availableVocab.map(w => w.lesson))].sort((a, b) => {
            return parseInt(a) - parseInt(b);
        });

        lessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson;
            option.textContent = `Lesson ${lesson}`;
            lessonSelect.appendChild(option);
        });
    }

    filterVocabulary() {
        if (!this.currentLesson) {
            alert("Please select a lesson first.");
            return [];
        }
        
        let filtered = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        if (this.currentBook !== 'All') {
            filtered = filtered.filter(w => w.book === this.currentBook);
        }
        return filtered;
    }

    // --- UI Logic ---

    switchTab(tabName) {
        // Toggle Buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');

        // Toggle Content inside Control Panel
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === `${tabName}-controls` || content.id === `${tabName}-content`) {
                content.classList.add('active');
                if (tabName === 'difficult') this.renderDifficultList();
            } else {
                content.classList.remove('active');
            }
        });
    }

    toggleControlPanel(show) {
        const panel = document.getElementById('control-panel');
        const studyArea = document.getElementById('study-area');
        
        if (show) {
            panel.classList.remove('hidden');
            studyArea.classList.add('hidden');
        } else {
            panel.classList.add('hidden');
            studyArea.classList.remove('hidden');
        }
    }

    exitStudyMode() {
        this.toggleControlPanel(true);
        document.getElementById('flashcard-view').classList.add('hidden');
        document.getElementById('quiz-view').classList.add('hidden');
    }

    // --- Flashcards ---

    startFlashcards() {
        this.currentLessonVocabulary = this.filterVocabulary();
        if (this.currentLessonVocabulary.length === 0) return;

        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        
        // UI Setup
        this.toggleControlPanel(false);
        document.getElementById('flashcard-view').classList.remove('hidden');
        document.getElementById('flashcard').classList.remove('flipped');
        
        this.renderFlashcard();
    }

    renderFlashcard() {
        const word = this.currentLessonVocabulary[this.currentFlashcardIndex];
        const mode = document.getElementById('flashcard-mode').value;
        const frontEl = document.getElementById('card-front-content');
        const backEl = document.getElementById('card-back-content');
        const progressEl = document.getElementById('fc-progress');

        progressEl.textContent = `${this.currentFlashcardIndex + 1} / ${this.currentLessonVocabulary.length}`;

        // Helper to generate multilingual HTML
        const getMultilingualHtml = (w) => `
            <div class="meaning-grid">
                <div class="meaning-item"><span class="meaning-label">Eng:</span> ${w.english}</div>
                <div class="meaning-item"><span class="meaning-label">VN:</span> ${w.vietnamese}</div>
                <div class="meaning-item"><span class="meaning-label">Thai:</span> ${w.thai}</div>
                <div class="meaning-item"><span class="meaning-label">MM:</span> ${w.burmese}</div>
                <div class="meaning-item"><span class="meaning-label">JP:</span> ${w.japanese}</div>
                <div class="meaning-item"><span class="meaning-label">KR:</span> ${w.korean}</div>
            </div>
        `;

        let frontHtml = '';
        let backHtml = '';

        /* A. Chinese - Meaning
           Front: Chinese
           Back: Pinyin + All Langs 
        */
        if (mode === 'chinese-meaning') {
            frontHtml = `<div class="chinese-text">${word.chinese}</div>`;
            backHtml = `
                <div class="pinyin-text">${word.pinyin}</div>
                ${getMultilingualHtml(word)}
            `;
        }
        /* Meaning - Chinese
           Front: All Langs
           Back: Chinese + Pinyin
        */
        else if (mode === 'meaning-chinese') {
            frontHtml = getMultilingualHtml(word);
            backHtml = `
                <div class="chinese-text">${word.chinese}</div>
                <div class="pinyin-text">${word.pinyin}</div>
            `;
        }
        /* Pinyin - Chinese
           Front: Pinyin
           Back: Chinese
        */
        else if (mode === 'pinyin-chinese') {
            frontHtml = `<div class="pinyin-text" style="font-size: 2rem;">${word.pinyin}</div>`;
            backHtml = `<div class="chinese-text">${word.chinese}</div>`;
        }

        frontEl.innerHTML = frontHtml;
        backEl.innerHTML = backHtml;
        
        // Reset flip state
        const card = document.getElementById('flashcard');
        card.classList.remove('flipped');
        this.isFlipped = false;
    }

    flipFlashcard() {
        const card = document.getElementById('flashcard');
        this.isFlipped = !this.isFlipped;
        if (this.isFlipped) {
            card.classList.add('flipped');
        } else {
            card.classList.remove('flipped');
        }
    }

    nextFlashcard() {
        if (this.currentFlashcardIndex < this.currentLessonVocabulary.length - 1) {
            this.currentFlashcardIndex++;
            this.renderFlashcard();
        }
    }

    prevFlashcard() {
        if (this.currentFlashcardIndex > 0) {
            this.currentFlashcardIndex--;
            this.renderFlashcard();
        }
    }

    markCurrentAsDifficult() {
        const word = this.currentLessonVocabulary[this.currentFlashcardIndex];
        // Avoid duplicates
        if (!this.difficultWords.some(w => w.chinese === word.chinese)) {
            this.difficultWords.push(word);
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            alert(`Marked "${word.chinese}" as difficult.`);
        }
    }

    // --- Quiz ---

    startQuiz() {
        this.currentLessonVocabulary = this.filterVocabulary();
        if (this.currentLessonVocabulary.length === 0) return;
        
        // Shuffle vocabulary for questions
        this.quizQuestions = [...this.currentLessonVocabulary].sort(() => 0.5 - Math.random());
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.quizMode = document.getElementById('quiz-mode').value;

        // UI Setup
        this.toggleControlPanel(false);
        document.getElementById('quiz-view').classList.remove('hidden');
        document.getElementById('quiz-result').classList.add('hidden');
        document.querySelector('.quiz-container > .question-area').style.display = 'block';
        document.querySelector('.quiz-container > .options-grid').style.display = 'grid';
        document.getElementById('next-question-btn').classList.add('hidden');
        
        this.renderQuestion();
    }

    renderQuestion() {
        const questionData = this.quizQuestions[this.currentQuizIndex];
        const questionEl = document.getElementById('quiz-question');
        const optionsEl = document.getElementById('quiz-options');
        const feedbackEl = document.getElementById('quiz-feedback');
        
        feedbackEl.innerHTML = ''; // Clear feedback
        optionsEl.innerHTML = ''; // Clear options
        document.getElementById('next-question-btn').classList.add('hidden');

        // Update Progress
        const progressPct = ((this.currentQuizIndex) / this.quizQuestions.length) * 100;
        document.getElementById('quiz-progress').style.width = `${progressPct}%`;

        // Determine Question and Correct Answer based on Mode
        let questionText = '';
        let correctAnswerText = '';
        let answerKey = ''; // Key to grab from word object for options

        const formatMeanings = (w) => {
            // Helper for compact meaning display in buttons
            return `
                <small><b>Eng:</b> ${w.english}</small><br>
                <small><b>VN:</b> ${w.vietnamese}</small>
            `; 
            // Note: Showing all 6 in a button is too big, defaulting to top 2 or formatting simply
        };

        const formatAllMeanings = (w) => {
             return `EN: ${w.english}, VN: ${w.vietnamese}, TH: ${w.thai}, MM: ${w.burmese}, JP: ${w.japanese}, KR: ${w.korean}`;
        };

        if (this.quizMode === 'chinese-meaning') {
            questionText = questionData.chinese;
            correctAnswerText = formatAllMeanings(questionData);
            answerKey = 'meanings_complex'; // Special flag
        } else if (this.quizMode === 'meaning-chinese') {
            questionText = formatAllMeanings(questionData); // Question is the meanings
            correctAnswerText = questionData.chinese;
            answerKey = 'chinese';
        } else if (this.quizMode === 'chinese-pinyin') {
            questionText = questionData.chinese;
            correctAnswerText = questionData.pinyin;
            answerKey = 'pinyin';
        } else if (this.quizMode === 'pinyin-chinese') {
            questionText = questionData.pinyin;
            correctAnswerText = questionData.chinese;
            answerKey = 'chinese';
        }

        questionEl.textContent = questionText;

        // Generate Options (1 Correct + 3 Wrong)
        let options = [questionData];
        // Get 3 random wrong answers
        const pool = this.currentLessonVocabulary.filter(w => w !== questionData);
        while (options.length < 4 && pool.length > 0) {
            const randomIdx = Math.floor(Math.random() * pool.length);
            options.push(pool[randomIdx]);
            pool.splice(randomIdx, 1);
        }
        
        // Shuffle options
        options.sort(() => 0.5 - Math.random());

        // Render Buttons
        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'quiz-option';
            
            // Set text based on mode
            if (answerKey === 'meanings_complex') {
                btn.innerHTML = `
                    <div style="font-size:0.85rem">
                        <div>🇺🇸 ${opt.english}</div>
                        <div>🇻🇳 ${opt.vietnamese}</div>
                        <div>🇹🇭 ${opt.thai}</div>
                    </div>`; 
                    // Showing first 3 for UI compactness, or you can dump all
            } else if (this.quizMode === 'meaning-chinese') {
                 // Answer is Chinese
                 btn.textContent = opt.chinese;
                 btn.style.fontSize = "1.5rem";
            } else {
                 btn.textContent = opt[answerKey];
            }

            btn.onclick = () => this.handleAnswer(opt === questionData, btn, optionsEl);
            optionsEl.appendChild(btn);
        });
    }

    handleAnswer(isCorrect, btnElement, container) {
        if (document.getElementById('next-question-btn').classList.contains('hidden') === false) return; // Prevent multiple clicks

        if (isCorrect) {
            this.quizScore++;
            btnElement.classList.add('correct');
            document.getElementById('quiz-score').textContent = this.quizScore;
        } else {
            btnElement.classList.add('incorrect');
            // Highlight correct one
            // Ideally we find the correct DOM element, but simplified:
            const feedback = document.getElementById('quiz-feedback');
            feedback.innerHTML = `<p style="color:red">Incorrect.</p>`;
        }

        // Show Next Button
        document.getElementById('next-question-btn').classList.remove('hidden');
    }

    nextQuestion() {
        this.currentQuizIndex++;
        if (this.currentQuizIndex < this.quizQuestions.length) {
            this.renderQuestion();
        } else {
            this.showQuizResults();
        }
    }

    showQuizResults() {
        document.querySelector('.quiz-container > .question-area').style.display = 'none';
        document.querySelector('.quiz-container > .options-grid').style.display = 'none';
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('quiz-result').classList.remove('hidden');
        document.getElementById('final-score').textContent = `${this.quizScore} / ${this.quizQuestions.length}`;
        document.getElementById('quiz-progress').style.width = '100%';
    }

    // --- Difficult Words ---
    renderDifficultList() {
        const listEl = document.getElementById('difficult-words-list');
        listEl.innerHTML = '';

        if (this.difficultWords.length === 0) {
            listEl.innerHTML = '<li class="difficult-word text-center">No difficult words yet.</li>';
            return;
        }

        this.difficultWords.forEach(w => {
            const li = document.createElement('li');
            li.style.background = 'white';
            li.style.margin = '5px 0';
            li.style.padding = '10px';
            li.style.borderRadius = '5px';
            li.style.listStyle = 'none';
            li.innerHTML = `<strong>${w.chinese}</strong> (${w.pinyin}) - ${w.english}`;
            listEl.appendChild(li);
        });
    }
}

// Initialize
const app = new VocabularyApp();