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
        
        this.difficultWords = JSON.parse(localStorage.getItem('difficultWords')) || [];

        this.bindEvents();
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

        // Navigation / Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
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
        document.getElementById('flashcard').addEventListener('click', () => this.flipFlashcard());
        document.getElementById('next-btn').addEventListener('click', (e) => { e.stopPropagation(); this.nextFlashcard(); });
        document.getElementById('prev-btn').addEventListener('click', (e) => { e.stopPropagation(); this.prevFlashcard(); });
        document.getElementById('mark-difficult-btn').addEventListener('click', (e) => { e.stopPropagation(); this.markCurrentAsDifficult(); });

        // Quiz Interactions
        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retry-quiz-btn').addEventListener('click', () => this.startQuiz());
        
        // Difficult Words
        document.getElementById('clear-difficult-btn').addEventListener('click', () => {
            this.difficultWords = [];
            localStorage.setItem('difficultWords', JSON.stringify([]));
            this.renderDifficultList();
        });
        document.getElementById('back-difficult-btn').addEventListener('click', () => this.switchTab('flashcards'));
    }

    // --- Data Loading ---

    async loadBookData(bookId) {
        // Assumes files are named B1.csv, B2.csv etc in the same directory
        const filename = `${bookId}.csv`;
        try {
            const response = await fetch(filename);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            this.parseCSV(text);
        } catch (error) {
            console.error('Error loading file:', error);
            alert(`Could not load ${filename}. Ensure you are running this on a web server (not directly opening index.html).`);
        }
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return;

        // Detect delimiter (Tab or Comma)
        const firstLine = lines[0];
        const separator = firstLine.includes('\t') ? '\t' : ',';
        const headers = lines[0].split(separator).map(h => h.trim());
        
        // Mappings based on prompt
        const keyMap = {
            '課-序號': 'lessonCode', // This is 1-1, 1-2 etc.
            '生詞': 'chinese',
            '漢拼': 'pinyin',
            '英譯': 'english',
            '越譯': 'vietnamese',
            '泰譯': 'thai',
            '緬譯': 'burmese',
            '日譯': 'japanese',
            '韓譯': 'korean'
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

            if (entry.chinese && entry.lessonCode) {
                parsedData.push(entry);
            }
        }

        this.vocabulary = parsedData;
        this.populateLessonOptions();
    }

    populateLessonOptions() {
        const lessonSelect = document.getElementById('lesson-select');
        lessonSelect.innerHTML = '<option value="">Select Lesson</option>';
        lessonSelect.disabled = false;

        // Get unique lesson codes (1-1, 1-2, etc.)
        const lessons = [...new Set(this.vocabulary.map(w => w.lessonCode))];
        
        // Sort specifically to handle 1-1, 1-2, 2-1, 10-1 logic
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

    // --- UI State Management ---

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');

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
        // Hide all views
        document.getElementById('list-view').classList.add('hidden');
        document.getElementById('flashcard-view').classList.add('hidden');
        document.getElementById('quiz-view').classList.add('hidden');
    }

    // --- Vocabulary List View ---
    
    showVocabularyList() {
        const vocab = this.getLessonVocabulary();
        if (vocab.length === 0) return;

        this.toggleControlPanel(false);
        document.getElementById('list-view').classList.remove('hidden');
        
        const tbody = document.getElementById('vocab-table-body');
        tbody.innerHTML = '';
        
        vocab.forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="chinese-cell" style="font-size:1.2rem; font-weight:bold;">${w.chinese}</td>
                <td>${w.pinyin}</td>
                <td>${w.english}</td>
                <td style="font-size:0.85rem">
                    VN: ${w.vietnamese}<br>
                    TH: ${w.thai} | MM: ${w.burmese}<br>
                    JP: ${w.japanese} | KR: ${w.korean}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Flashcards ---

    startFlashcards() {
        this.currentLessonVocabulary = this.getLessonVocabulary();
        if (this.currentLessonVocabulary.length === 0) return;

        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        
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

        const getMultilingualHtml = (w) => `
            <div class="meaning-grid">
                <div class="meaning-item"><span class="meaning-label">VN:</span> ${w.vietnamese}</div>
                <div class="meaning-item"><span class="meaning-label">TH:</span> ${w.thai}</div>
                <div class="meaning-item"><span class="meaning-label">MM:</span> ${w.burmese}</div>
                <div class="meaning-item"><span class="meaning-label">JP:</span> ${w.japanese}</div>
                <div class="meaning-item"><span class="meaning-label">KR:</span> ${w.korean}</div>
                <div class="meaning-item"><span class="meaning-label">EN:</span> ${w.english}</div>
            </div>
        `;

        let frontHtml = '';
        let backHtml = '';

        if (mode === 'chinese-meaning') {
            frontHtml = `<div class="chinese-text">${word.chinese}</div>`;
            backHtml = `<div class="pinyin-text">${word.pinyin}</div>${getMultilingualHtml(word)}`;
        } else if (mode === 'meaning-chinese') {
            frontHtml = getMultilingualHtml(word);
            backHtml = `<div class="chinese-text">${word.chinese}</div><div class="pinyin-text">${word.pinyin}</div>`;
        } else if (mode === 'pinyin-chinese') {
            frontHtml = `<div class="pinyin-text" style="font-size: 2rem;">${word.pinyin}</div>`;
            backHtml = `<div class="chinese-text">${word.chinese}</div>`;
        }

        frontEl.innerHTML = frontHtml;
        backEl.innerHTML = backHtml;
        
        document.getElementById('flashcard').classList.remove('flipped');
        this.isFlipped = false;