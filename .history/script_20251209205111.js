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
        this.selectedLanguages = [];

        this.bindEvents();
        this.setupLanguageSelection();
    }

    bindEvents() {
        // Book Selection
        document.getElementById('book-select').addEventListener('change', (e) => {
            this.currentBook = e.target.value;
            if (this.currentBook) this.loadBookData(this.currentBook);
            else this.disableControls();
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

        // Shuffle Buttons
        document.getElementById('fc-shuffle-btn').addEventListener('click', () => this.shuffleFlashcards());
        document.getElementById('quiz-shuffle-btn').addEventListener('click', () => this.shuffleQuiz());

        // Flashcard Interactions
        const card = document.getElementById('flashcard');
        card.addEventListener('click', (e) => {
            if (window.getSelection().toString().length === 0) {
                this.flipFlashcard();
            }
        });

        document.getElementById('next-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.nextFlashcard();
        });
        document.getElementById('prev-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.prevFlashcard();
        });

        // Quiz Interactions
        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retry-quiz-btn').addEventListener('click', () => this.startQuiz());
        // --- KEYBOARD NAVIGATION ---
        document.addEventListener('keydown', (e) => {
            // Only run if Flashcard View is active
            if (document.getElementById('flashcard-view').classList.contains('hidden')) return;

            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                    e.preventDefault(); // Stop page scrolling
                    this.flipFlashcard();
                    break;
                case 'ArrowLeft':
                    this.prevFlashcard();
                    break;
                case 'ArrowRight':
                    this.nextFlashcard();
                    break;
            }
        });

        // --- SWIPE NAVIGATION (MOBILE) ---
        const flashcardContainer = document.querySelector('.flashcard-container');
        let touchStartX = 0;
        let touchEndX = 0;

        flashcardContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        flashcardContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipeGesture();
        }, { passive: true });

        const handleSwipeGesture = () => {
            const swipeThreshold = 50; // Minimum distance to register swipe

            // Swipe Left (drag finger left) -> Next Card
            if (touchEndX < touchStartX - swipeThreshold) {
                this.nextFlashcard();
            }

            // Swipe Right (drag finger right) -> Previous Card
            if (touchEndX > touchStartX + swipeThreshold) {
                this.prevFlashcard();
            }
        };

    }

    setupLanguageSelection() {
        const languageCheckboxes = document.querySelectorAll('input[name="language"]');
        languageCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.addEventListener('change', () => this.updateSelectedLanguages());
        });
        this.updateSelectedLanguages();
    }

    updateSelectedLanguages() {
        this.selectedLanguages = [];
        document.querySelectorAll('input[name="language"]:checked').forEach(checkbox => {
            this.selectedLanguages.push(checkbox.value);
        });
    }

    async loadBookData(bookId) {
        const filename = `${bookId}.csv`;
        try {
            const response = await fetch(filename);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            this.parseCSV(text);
        } catch (error) {
            console.error('Error loading file:', error);
            alert(`Could not load ${filename}.`);
        }
    }

    parseCSV(text) {
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return;

        const separator = lines[0].includes('\t') ? '\t' : ',';
        const headers = this.parseCSVLine(lines[0], separator).map(h => h.trim());

        const keyMap = {
            '課-序號': 'lessonCode', '序號': 'sequence', '生詞': 'chinese', '漢拼': 'pinyin',
            '詞類': 'partOfSpeech', '英譯': 'english', '越譯': 'vietnamese', '泰譯': 'thai',
            '緬譯': 'burmese', '日譯': 'japanese', '韓譯': 'korean', '冊': 'volume'
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
                    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/""/g, '"');
                    entry[mappedKey] = val;
                }
            });
            if (entry.chinese && entry.lessonCode) parsedData.push(entry);
        }
        this.vocabulary = parsedData;
        this.populateLessonOptions();
    }

    parseCSVLine(text, separator) {
        const pattern = new RegExp(
            "(\\" + separator + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + separator + "\\r\\n]*))",
            "gi"
        );
        let result = [];
        let matches;
        while ((matches = pattern.exec(text))) {
            const matchKeys = matches[1];
            if (matchKeys.length && matchKeys !== separator) break;
            let value = matches[2] ? matches[2].replace(new RegExp("\"\"", "g"), "\"") : matches[3];
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
            document.body.classList.remove('study-mode');
            panel.classList.remove('hidden');
            studyArea.classList.add('hidden');
        } else {
            document.body.classList.add('study-mode');
            panel.classList.add('hidden');
            studyArea.classList.remove('hidden');
        }
    }

    exitStudyMode() {
        this.toggleControlPanel(true);
        document.body.classList.remove('scrolling-mode');
        document.getElementById('list-view').classList.add('hidden');
        document.getElementById('flashcard-view').classList.add('hidden');
        document.getElementById('quiz-view').classList.add('hidden');
    }

    showVocabularyList() {
        const vocab = this.getLessonVocabulary();
        if (vocab.length === 0) return;

        this.toggleControlPanel(false);
        document.body.classList.add('scrolling-mode');
        document.getElementById('list-view').classList.remove('hidden');
        document.getElementById('current-lesson-display').textContent = this.currentLesson;

        const tbody = document.getElementById('vocab-table-body');
        tbody.innerHTML = '';

        vocab.forEach(w => {
            const tr = document.createElement('tr');
            let translationsHtml = '';
            if (this.selectedLanguages.includes('english')) translationsHtml += `${w.english}<br>`;

            let secondaryTranslations = [];
            const langMap = { 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
            Object.keys(langMap).forEach(lang => {
                if (this.selectedLanguages.includes(lang) && w[lang]) secondaryTranslations.push(`${langMap[lang]}: ${w[lang]}`);
            });
            if (secondaryTranslations.length > 0) translationsHtml += `<small style="font-size:0.9rem;">${secondaryTranslations.join(' | ')}</small>`;

            tr.innerHTML = `
                <td class="chinese-cell" style="font-size:1.4rem; font-weight:bold;">${w.chinese}</td>
                <td style="font-size:1.1rem;">${w.pinyin}</td>
                <td style="font-size:1rem;">${translationsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- FLASHCARDS ---

    startFlashcards() {
        let vocab = this.getLessonVocabulary();
        if (vocab.length === 0) return;

        this.currentLessonVocabulary = vocab;
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;

        this.toggleControlPanel(false);
        document.getElementById('flashcard-view').classList.remove('hidden');
        document.getElementById('fc-lesson-display').textContent = this.currentLesson;
        document.getElementById('flashcard').classList.remove('flipped');
        this.renderFlashcard();
    }

    shuffleFlashcards() {
        if (!this.currentLessonVocabulary || this.currentLessonVocabulary.length === 0) return;
        this.currentLessonVocabulary = [...this.currentLessonVocabulary].sort(() => 0.5 - Math.random());
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        document.getElementById('flashcard').classList.remove('flipped');
        this.renderFlashcard();
    }

    // UPDATED: Removed the prefix label span
    getMultilingualHtml(w) {
        const langMap = { 'english': 'EN', 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
        let html = '<div class="meaning-grid">';
        this.selectedLanguages.forEach(lang => {
            if (w[lang] && langMap[lang]) html += `<div class="meaning-item">${w[lang]}</div>`;
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

        let frontHtml = '', backHtml = '';

        if (mode === 'chinese-meaning') {
            frontHtml = `<div class="chinese-text">${word.chinese}</div>`;
            backHtml = `<div class="pinyin-text">${word.pinyin}</div>${this.getMultilingualHtml(word)}`;
        } else if (mode === 'meaning-chinese') {
            frontHtml = this.getMultilingualHtml(word);
            backHtml = `<div class="chinese-text">${word.chinese}</div><div class="pinyin-text">${word.pinyin}</div>`;
        } else if (mode === 'pinyin-chinese') {
            frontHtml = `<div class="pinyin-text" style="font-size: 3.5rem;">${word.pinyin}</div>`;
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

    updateFlashcardProgress() {
        const progressBar = document.getElementById('flashcard-progress');
        if (progressBar) {
            const progressPct = ((this.currentFlashcardIndex + 1) / this.currentLessonVocabulary.length) * 100;
            progressBar.style.width = `${progressPct}%`;
        }
        document.getElementById('fc-progress').textContent = `${this.currentFlashcardIndex + 1} / ${this.currentLessonVocabulary.length}`;
    }

    // --- QUIZ ---

    startQuiz() {
        const vocab = this.getLessonVocabulary();
        if (vocab.length === 0) return;

        this.quizQuestions = [...vocab];
        this.incorrectWords = []; 
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

    shuffleQuiz() {
        if (!this.quizQuestions || this.quizQuestions.length === 0) return;
        this.quizQuestions = this.quizQuestions.sort(() => 0.5 - Math.random());
        this.incorrectWords = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        document.getElementById('quiz-score').textContent = '0';
        document.getElementById('quiz-feedback').innerHTML = '';

        document.getElementById('quiz-result').classList.add('hidden');
        document.querySelector('.quiz-container > .question-area').style.display = 'block';
        document.querySelector('.quiz-container > .options-grid').style.display = 'grid';
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('next-question-btn').style.display = 'none';

        this.renderQuestion();
    }

    // UPDATED: Removed the prefix string
    formatAllMeanings(w) {
        const langMap = { 'english': 'EN', 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
        let meanings = [];
        this.selectedLanguages.forEach(lang => {
            if (w[lang] && langMap[lang]) meanings.push(w[lang]); // Just the meaning
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
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('next-question-btn').style.display = 'none';

        const progressPct = ((this.currentQuizIndex + 1) / this.quizQuestions.length) * 100;
        document.getElementById('quiz-progress').style.width = `${progressPct}%`;

        let questionText = '', answerType = '';

        if (this.quizMode === 'chinese-meaning') {
            questionText = `<span class="chinese-text" style="font-size: 3rem;">${questionData.chinese}</span>`;
            answerType = 'html_meanings';
        } else if (this.quizMode === 'meaning-chinese') {
            questionText = this.formatAllMeanings(questionData);
            answerType = 'chinese';
        } else if (this.quizMode === 'chinese-pinyin') {
            questionText = `<span class="chinese-text" style="font-size: 3rem;">${questionData.chinese}</span>`;
            answerType = 'pinyin';
        } else if (this.quizMode === 'pinyin-chinese') {
            questionText = `<span class="pinyin-text" style="font-size:3rem">${questionData.pinyin}</span>`;
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
                btn.style.fontSize = "2.5rem";
                btn.style.fontWeight = "bold";
            } else if (answerType === 'pinyin') {
                btn.textContent = opt.pinyin;
                btn.style.fontSize = "1.8rem";
            }

            btn.onclick = () => this.handleAnswer(opt === questionData, btn);
            optionsEl.appendChild(btn);
        });
    }

    handleAnswer(isCorrect, btnElement) {
        if (!document.getElementById('next-question-btn').classList.contains('hidden')) return;

        const allOptions = document.querySelectorAll('.quiz-option');
        allOptions.forEach(opt => opt.style.pointerEvents = 'none');

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
                    if (this.quizMode === 'chinese-meaning') correctText = this.formatAllMeaningsForComparison(questionData);
                    else if (this.quizMode === 'meaning-chinese' || this.quizMode === 'pinyin-chinese') correctText = questionData.chinese;
                    else if (this.quizMode === 'chinese-pinyin') correctText = questionData.pinyin;

                    if (this.quizMode === 'chinese-meaning') {
                        if (opt.innerHTML.includes(correctText)) opt.classList.add('correct');
                    } else {
                        if (optionText.includes(correctText)) opt.classList.add('correct');
                    }
                }
            });
        }

        const nextBtn = document.getElementById('next-question-btn');
        if (this.currentQuizIndex < this.quizQuestions.length - 1) {
            nextBtn.classList.remove('hidden');
            nextBtn.style.display = 'block';
        } else {
            setTimeout(() => this.showQuizResults(), 1000);
        }
    }

    nextQuestion() {
        const allOptions = document.querySelectorAll('.quiz-option');
        allOptions.forEach(opt => opt.style.pointerEvents = 'auto');
        this.currentQuizIndex++;
        if (this.currentQuizIndex < this.quizQuestions.length) this.renderQuestion();
        else this.showQuizResults();
    }

    showQuizResults() {
        document.querySelector('.quiz-container > .question-area').style.display = 'none';
        document.querySelector('.quiz-container > .options-grid').style.display = 'none';
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('next-question-btn').style.display = 'none';
        document.getElementById('quiz-feedback').innerHTML = '';
        document.getElementById('quiz-result').classList.remove('hidden');

        const percentage = Math.round((this.quizScore / this.quizQuestions.length) * 100);
        document.getElementById('final-score').innerHTML = `${this.quizScore} / ${this.quizQuestions.length}<br><small>${percentage}% Correct</small>`;
    }

    // UPDATED: Removed the prefix string
    formatAllMeaningsForComparison(w) {
        const langMap = { 'english': 'EN', 'vietnamese': 'VN', 'thai': 'TH', 'burmese': 'MM', 'japanese': 'JP', 'korean': 'KR' };
        let meanings = [];
        this.selectedLanguages.forEach(lang => {
            if (w[lang] && langMap[lang]) meanings.push(w[lang]); // Just the meaning
        });
        return meanings.join(' | ');
    }
}

const app = new VocabularyApp();