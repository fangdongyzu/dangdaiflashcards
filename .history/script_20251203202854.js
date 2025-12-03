class VocabularyApp {

    constructor() {
        this.vocabulary = [];
        this.currentBook = '';
        this.currentLesson = '';

        // State
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        this.quizQuestions = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;

        // Language settings
        this.selectedLanguages = []; 

        this.bindEvents();
        this.setupLanguageSelection();
    }

    bindEvents() {
        // Book Selection -> Triggers Fetch
        document.getElementById('book-select').addEventListener('change', (e) => {
            this.currentBook = e.target.value;
            if (this.currentBook) {
                this.loadBookData(this.currentBook);
            } else {
                this.disableControls();
            }
        });

        // Lesson Selection
        document.getElementById('lesson-select').addEventListener('change', (e) => {
            this.currentLesson = e.target.value;
            this.updateButtonStates();
        });

        // Main Actions
        document.getElementById('view-list-btn').addEventListener('click', () => this.showVocabularyList());
        document.getElementById('start-flashcards-btn').addEventListener('click', () => this.startFlashcards());
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.startQuiz());

        // Exit / Back Buttons
        document.querySelectorAll('.exit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.exitStudyMode());
        });

        // Flashcard Interactions
        document.getElementById('flashcard').addEventListener('click', (e) => {
             // Allow text selection without flipping
             if(window.getSelection().toString().length === 0) {
                 this.flipFlashcard();
             }
        });
        document.getElementById('next-btn').addEventListener('click', (e) => { e.stopPropagation(); this.nextFlashcard(); });
        document.getElementById('prev-btn').addEventListener('click', (e) => { e.stopPropagation(); this.prevFlashcard(); });

        // Quiz Interactions
        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retry-quiz-btn').addEventListener('click', () => this.startQuiz());
    }

    setupLanguageSelection() {
        const languageCheckboxes = document.querySelectorAll('input[name="language"]');
        languageCheckboxes.forEach(checkbox => {
            checkbox.checked = false; 
            checkbox.addEventListener('change', () => {
                this.updateSelectedLanguages();
            });
        });
        this.updateSelectedLanguages();
    }

    updateSelectedLanguages() {
        this.selectedLanguages = [];
        document.querySelectorAll('input[name="language"]:checked').forEach(checkbox => {
            this.selectedLanguages.push(checkbox.value);
        });
    }

    // --- Data Loading ---

    async loadBookData(bookId) {
        const filename = `${bookId}.csv`;
        try {
            const response = await fetch(filename);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            this.parseCSV(text);
        } catch (error) {
            console.error('Error loading file:', error);
            alert(`Could not load ${filename}. Please make sure the file exists in the same directory.`);
        }
    }

    parseCSV(text) {
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return;

        const firstLine = lines[0];
        const separator = firstLine.includes('\t') ? '\t' : ',';
        const headers = this.parseCSVLine(lines[0], separator).map(h => h.trim());
        
        const keyMap = {
            '課-序號': 'lessonCode',
            '序號': 'sequence',
            '生詞': 'chinese',
            '漢拼': 'pinyin',
            '詞類': 'partOfSpeech',
            '英譯': 'english',
            '越譯': 'vietnamese',
            '泰譯': 'thai',
            '緬譯': 'burmese',
            '日譯': 'japanese',
            '韓譯': 'korean',
            '冊': 'volume'
        };

        const parsedData = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], separator);
            if (values.length < headers.length) continue;

            let entry = {};
            headers.forEach((header, index) => {
                const mappedKey = keyMap[header];
                if (mappedKey) {
                    let val = values[index] ? values[index].trim() : '';
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.slice(1, -1).replace(/""/g, '"');
                    }
                    entry[mappedKey] = val;
                }
            });

            if (entry.chinese && entry.lessonCode) {
                parsedData.push(entry);
            }
        }

        this.vocabulary = parsedData;
        this.populateLessonOptions();
    }

    parseCSVLine(text, separator) {
        const pattern = new RegExp(
            "(\\" + separator + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + separator + "\\r\\n]*))",
            "gi"
        );
        let result = [];
        let matches;
        while ((matches = pattern.exec(text))) {
            const matchKeys = matches[1];
            if (matchKeys.length && matchKeys !== separator) break;
            let value;
            if (matches[2]) {
                value = matches[2].replace(new RegExp("\"\"", "g"), "\"");
            } else {
                value = matches[3];
            }
            result.push(value);
        }
        if (result.length > 0 && result[0] === undefined) result.shift();
        return result;
    }

    populateLessonOptions() {
        const lessonSelect = document.getElementById('lesson-select');
        lessonSelect.innerHTML = '<option value="">Select Lesson</option>';
        lessonSelect.disabled = false;

        const lessons = [...new Set(this.vocabulary.map(w => w.lessonCode))];
        lessons.sort((a, b) => {
            const partsA = a.split('-').map(Number);
            const partsB = b.split('-').map(Number);
            if (partsA[0] !== partsB[0]) return partsA[0] - partsB[0];
            return partsA[1] - partsB[1];
        });

        lessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson;
            option.textContent = `Lesson ${lesson}`;
            lessonSelect.appendChild(option);
        });
    }

    updateButtonStates() {
        const hasLesson = !!this.currentLesson;
        document.getElementById('view-list-btn').disabled = !hasLesson;
        document.getElementById('start-flashcards-btn').disabled = !hasLesson;
        document.getElementById('start-quiz-btn').disabled = !hasLesson;
    }

    disableControls() {
        document.getElementById('lesson-select').innerHTML = '<option value="">Select book first</option>';
        document.getElementById('lesson-select').disabled = true;
        document.getElementById('view-list-btn').disabled = true;
        document.getElementById('start-flashcards-btn').disabled = true;
        document.getElementById('start-quiz-btn').disabled = true;
    }

    getLessonVocabulary() {
        return this.vocabulary.filter(w => w.lessonCode === this.currentLesson);
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
        document.getElementById('list-view').classList.add('hidden');
        document.getElementById('flashcard-view').classList.add('hidden');
        document.getElementById('quiz-view').classList.add('hidden');
    }

    showVocabularyList() {
        const vocab = this.getLessonVocabulary();
        if (vocab.length === 0) return;

        this.toggleControlPanel(false);
        document.getElementById('list-view').classList.remove('hidden');
        document.getElementById('current-lesson-display').textContent = this.currentLesson;

        const tbody = document.getElementById('vocab-table-body');
        tbody.innerHTML = '';

        vocab.forEach(w => {
            const tr = document.createElement('tr');
            let translationsHtml = '';
            if (this.selectedLanguages.includes('english')) {
                translationsHtml += `${w.english}<br>`;
            }
            let secondaryTranslations = [];
            const langMap = { 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
            Object.keys(langMap).forEach(lang => {
                if (this.selectedLanguages.includes(lang) && w[lang]) {
                    secondaryTranslations.push(`${langMap[lang]}: ${w[lang]}`);
                }
            });
            if (secondaryTranslations.length > 0) {
                translationsHtml += `<small style="font-size:0.9rem;">${secondaryTranslations.join(' | ')}</small>`;
            }
            tr.innerHTML = `
            <td class="chinese-cell" style="font-size:1.4rem; font-weight:bold;">${w.chinese}</td>
            <td style="font-size:1.1rem;">${w.pinyin}</td>
            <td style="font-size:1rem;">${translationsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Flashcards ---

    startFlashcards() {
        let vocab = this.getLessonVocabulary();
        if (vocab.length === 0) return;

        // NEW: Shuffle Check
        const shouldShuffle = document.getElementById('shuffle-flashcards').checked;
        if (shouldShuffle) {
            // Create a copy and shuffle it
            vocab = [...vocab].sort(() => 0.5 - Math.random());
        }

        this.currentLessonVocabulary = vocab;
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;

        this.toggleControlPanel(false);
        document.getElementById('flashcard-view').classList.remove('hidden');
        document.getElementById('fc-lesson-display').textContent = this.currentLesson;
        document.getElementById('flashcard').classList.remove('flipped');

        this.renderFlashcard();
    }

    getMultilingualHtml(w) {
        const langMap = { 'english': 'EN', 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
        let html = '<div class="meaning-grid">';
        this.selectedLanguages.forEach(lang => {
            if (w[lang] && langMap[lang]) {
                html += `<div class="meaning-item"><span class="meaning-label">${langMap[lang]}:</span> ${w[lang]}</div>`;
            }
        });
        html += '</div>';
        return html;
    }

    renderFlashcard() {
        const word = this.currentLessonVocabulary[this.currentFlashcardIndex];
        const mode = document.getElementById('flashcard-mode').value;
        const frontEl = document.getElementById('card-front-content');
        const backEl = document.getElementById('card-back-content');

        this.updateFlashcardProgress();

        let frontHtml = '';
        let backHtml = '';

        if (mode === 'chinese-meaning') {
            frontHtml = `<div class="chinese-text">${word.chinese}</div>`;
            backHtml = `<div class="pinyin-text">${word.pinyin}</div>${this.getMultilingualHtml(word)}`;
        } else if (mode === 'meaning-chinese') {
            frontHtml = this.getMultilingualHtml(word);
            backHtml = `<div class="chinese-text">${word.chinese}</div><div class="pinyin-text">${word.pinyin}</div>`;
        } else if (mode === 'pinyin-chinese') {
            frontHtml = `<div class="pinyin-text" style="font-size: 4rem;">${word.pinyin}</div>`; // Increased font
            backHtml = `<div class="chinese-text">${word.chinese}</div>`;
        }

        frontEl.innerHTML = frontHtml;
        backEl.innerHTML = backHtml;

        document.getElementById('flashcard').classList.remove('flipped');
        this.isFlipped = false;
    }

    flipFlashcard() {
        const card = document.getElementById('flashcard');
        this.isFlipped = !this.isFlipped;
        card.classList.toggle('flipped', this.isFlipped);
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

    // --- Quiz ---

    startQuiz() {
        const vocab = this.getLessonVocabulary();
        if (vocab.length === 0) return;

        // Randomize questions
        this.quizQuestions = [...vocab].sort(() => 0.5 - Math.random());
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.quizMode = document.getElementById('quiz-mode').value;

        this.toggleControlPanel(false);
        document.getElementById('quiz-view').classList.remove('hidden');
        document.getElementById('quiz-lesson-display').textContent = this.currentLesson;
        document.getElementById('quiz-result').classList.add('hidden');
        document.getElementById('quiz-score').textContent = '0';
        document.getElementById('quiz-feedback').innerHTML = '';
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('next-question-btn').style.display = 'none';

        document.querySelector('.quiz-container > .question-area').style.display = 'block';
        document.querySelector('.quiz-container > .options-grid').style.display = 'grid';

        this.renderQuestion();
    }

    formatAllMeanings(w) {
        const langMap = { 'english': 'EN', 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
        let meanings = [];
        this.selectedLanguages.forEach(lang => {
            if (w[lang] && langMap[lang]) {
                meanings.push(`${langMap[lang]}: ${w[lang]}`);
            }
        });
        return `<div style="font-size:1.4rem; line-height:1.4;">${meanings.join(' | ')}</div>`;
    }

    renderQuestion() {
        const questionData = this.quizQuestions[this.currentQuizIndex];
        const questionEl = document.getElementById('quiz-question');
        const optionsEl = document.getElementById('quiz-options');
        const feedbackEl = document.getElementById('quiz-feedback');

        feedbackEl.innerHTML = '';
        optionsEl.innerHTML = '';

        const nextBtn = document.getElementById('next-question-btn');
        nextBtn.classList.add('hidden');
        nextBtn.style.display = 'none';

        const progressPct = ((this.currentQuizIndex + 1) / this.quizQuestions.length) * 100;
        document.getElementById('quiz-progress').style.width = `${progressPct}%`;

        let questionText = '';
        let answerType = '';

        if (this.quizMode === 'chinese-meaning') {
            questionText = `<span class="chinese-text">${questionData.chinese}</span>`;
            answerType = 'html_meanings';
        } else if (this.quizMode === 'meaning-chinese') {
            questionText = this.formatAllMeanings(questionData);
            answerType = 'chinese';
        } else if (this.quizMode === 'chinese-pinyin') {
            questionText = `<span class="chinese-text">${questionData.chinese}</span>`;
            answerType = 'pinyin';
        } else if (this.quizMode === 'pinyin-chinese') {
            questionText = `<span class="pinyin-text" style="font-size:4rem">${questionData.pinyin}</span>`;
            answerType = 'chinese';
        }

        questionEl.innerHTML = questionText;

        let options = [questionData];
        const pool = this.quizQuestions.filter(w => w !== questionData);
        while (options.length < 4 && pool.length > 0) {
            const randomIdx = Math.floor(Math.random() * pool.length);
            options.push(pool[randomIdx]);
            pool.splice(randomIdx, 1);
        }
        options.sort(() => 0.5 - Math.random());

        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'quiz-option';

            if (answerType === 'html_meanings') {
                btn.innerHTML = this.formatAllMeanings(opt);
            } else if (answerType === 'chinese') {
                btn.textContent = opt.chinese;
                btn.style.fontSize = "3rem"; // Bigger
                btn.style.fontWeight = "bold";
            } else if (answerType === 'pinyin') {
                btn.textContent = opt.pinyin;
                btn.style.fontSize = "2rem"; // Bigger
            }

            btn.onclick = () => this.handleAnswer(opt === questionData, btn);
            optionsEl.appendChild(btn);
        });
    }

    handleAnswer(isCorrect, btnElement) {
        if (!document.getElementById('next-question-btn').classList.contains('hidden')) {
            return;
        }

        const allOptions = document.querySelectorAll('.quiz-option');
        allOptions.forEach(opt => {
            opt.style.pointerEvents = 'none';
        });

        if (isCorrect) {
            this.quizScore++;
            btnElement.classList.add('correct');
            document.getElementById('quiz-score').textContent = this.quizScore;
        } else {
            btnElement.classList.add('incorrect');
            const questionData = this.quizQuestions[this.currentQuizIndex];
            allOptions.forEach(opt => {
                if (opt !== btnElement) {
                    const optionText = opt.textContent || opt.innerHTML;
                    let correctText = '';
                    if (this.quizMode === 'chinese-meaning') {
                        correctText = this.formatAllMeaningsForComparison(questionData);
                        if (opt.innerHTML.includes(correctText)) {
                            opt.classList.add('correct');
                        }
                    } else if (this.quizMode === 'meaning-chinese' || this.quizMode === 'pinyin-chinese') {
                        correctText = questionData.chinese;
                        if (optionText.includes(correctText)) {
                            opt.classList.add('correct');
                        }
                    } else if (this.quizMode === 'chinese-pinyin') {
                        correctText = questionData.pinyin;
                        if (optionText.includes(correctText)) {
                            opt.classList.add('correct');
                        }
                    }
                }
            });
        }

        const nextBtn = document.getElementById('next-question-btn');
        if (this.currentQuizIndex < this.quizQuestions.length - 1) {
            nextBtn.classList.remove('hidden');
            nextBtn.style.display = 'block';
        } else {
            setTimeout(() => {
                this.showQuizResults();
            }, 1000);
        }
    }

    nextQuestion() {
        const allOptions = document.querySelectorAll('.quiz-option');
        allOptions.forEach(opt => {
            opt.style.pointerEvents = 'auto';
        });

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

        const nextBtn = document.getElementById('next-question-btn');
        nextBtn.classList.add('hidden');
        nextBtn.style.display = 'none';

        document.getElementById('quiz-feedback').innerHTML = '';
        document.getElementById('quiz-result').classList.remove('hidden');

        const percentage = Math.round((this.quizScore / this.quizQuestions.length) * 100);
        document.getElementById('final-score').innerHTML = `
            ${this.quizScore} / ${this.quizQuestions.length}<br>
            <small>${percentage}% Correct</small>
        `;
    }

    formatAllMeaningsForComparison(w) {
        const langMap = { 'english': 'EN', 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
        let meanings = [];
        this.selectedLanguages.forEach(lang => {
            if (w[lang] && langMap[lang]) {
                meanings.push(`${langMap[lang]}: ${w[lang]}`);
            }
        });
        return meanings.join(' | ');
    }

    updateFlashcardProgress() {
        const progressEl = document.getElementById('fc-progress');
        const progressBar = document.getElementById('flashcard-progress');
        if (progressBar) {
            const progressPct = ((this.currentFlashcardIndex + 1) / this.currentLessonVocabulary.length) * 100;
            progressBar.style.width = `${progressPct}%`;
        }
        if (progressEl) {
            progressEl.textContent = `${this.currentFlashcardIndex + 1} / ${this.currentLessonVocabulary.length}`;
        }
    }
}

const app = new VocabularyApp();