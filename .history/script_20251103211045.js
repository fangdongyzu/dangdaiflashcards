class VocabularyApp {
    constructor() {
        this.vocabulary = [];
        this.currentLesson = '';
        this.currentBook = 'B1';
        this.flashcardMode = 'chinese-front';
        this.currentFlashcardIndex = 0;
        this.quizQuestions = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.quizType = 'english';
        this.difficultWords = JSON.parse(localStorage.getItem('difficultWords')) || [];
        this.masteredWords = JSON.parse(localStorage.getItem('masteredWords')) || [];

        this.initializeApp();
        this.bindEvents();
    }

    initializeApp() {
        this.populateLessonOptions();
        this.updateStats();
        this.loadBookData(this.currentBook);
    }

    bindEvents() {
        document.getElementById('book-select').addEventListener('change', (e) => {
            this.currentBook = e.target.value;
            this.loadBookData(this.currentBook);
        });

        document.getElementById('lesson-select').addEventListener('change', (e) => {
            this.currentLesson = e.target.value;
            this.currentFlashcardIndex = 0;
            if (document.getElementById('flashcards-content').classList.contains('active')) {
                this.displayFlashcard();
            }
        });

        document.getElementById('mode-select').addEventListener('change', (e) => {
            this.flashcardMode = e.target.value;
            if (document.getElementById('flashcards-content').classList.contains('active')) {
                this.displayFlashcard();
            }
        });

        document.getElementById('load-vocab-btn').addEventListener('click', () => this.loadVocabulary());
        document.getElementById('start-flashcards-btn').addEventListener('click', () => this.startFlashcards());
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.startQuiz());

        document.getElementById('prev-card-btn').addEventListener('click', () => this.previousCard());
        document.getElementById('next-card-btn').addEventListener('click', () => this.nextCard());
        document.getElementById('flip-card-btn').addEventListener('click', () => this.flipCard());
        document.getElementById('mark-difficult-btn').addEventListener('click', () => this.markAsDifficult());
        document.getElementById('mark-mastered-btn').addEventListener('click', () => this.markAsMastered());

        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());

        document.getElementById('practice-difficult-btn').addEventListener('click', () => this.practiceDifficultWords());
        document.getElementById('clear-difficult-btn').addEventListener('click', () => this.clearDifficultWords());

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('flashcard').addEventListener('click', (e) => {
            if (!e.target.closest('.flashcard-controls')) this.flipCard();
        });
    }

    // ---- Core functionality ----
    populateLessonOptions() {
        const lessonSelect = document.getElementById('lesson-select');
        lessonSelect.innerHTML = '';
        for (let lesson = 1; lesson <= 15; lesson++) {
            ['1', '2'].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = `${lesson}-${sub}`;
                opt.textContent = `Lesson ${lesson}-${sub}`;
                lessonSelect.appendChild(opt);
            });
        }
        this.currentLesson = '1-1';
    }

    async loadBookData(book) {
        this.showLoading(true);
        try {
            const csvData = await this.fetchCSVData(book);
            this.vocabulary = this.parseCSVData(csvData);
            this.updateStats();
            this.showMessage(`Loaded ${this.vocabulary.length} words from ${book}`, 'success');
        } catch (e) {
            this.showMessage(`Error loading ${book}: ${e.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchCSVData(book) {
        const csvFile = `${book}.csv`;
        const res = await fetch(csvFile);
        if (!res.ok) throw new Error(`File not found: ${csvFile}`);
        return new TextDecoder('utf-8').decode(await res.arrayBuffer());
    }

    parseCSVData(csvText) {
        const lines = csvText.trim().split('\n');
        const vocab = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 7) {
                vocab.push({
                    lesson: cols[0].trim(),
                    index: parseInt(cols[1]) || i,
                    chinese: cols[2].trim(),
                    pinyin: cols[3].trim(),
                    pos: cols[4].trim(),
                    english: cols[5].trim(),
                    vietnamese: cols[6].trim(),
                    book: cols[7] ? cols[7].trim() : '1'
                });
            }
        }
        return vocab;
    }

    loadVocabulary() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        const tbody = document.getElementById('vocabulary-table-body');
        if (words.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No words found.</td></tr>';
            this.showMessage(`No words found for ${this.currentLesson}`, 'warning');
            return;
        }
        tbody.innerHTML = words.map(w => `
            <tr>
                <td>${w.chinese}</td>
                <td>${w.pinyin}</td>
                <td>${w.english}</td>
                <td>${w.vietnamese}</td>
                <td>${w.pos}</td>
            </tr>`).join('');
        this.switchTab('vocabulary');
        this.updateStats();
    }

    startFlashcards() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        if (words.length === 0) return this.showMessage('No vocabulary loaded', 'error');
        this.currentFlashcardIndex = 0;
        this.displayFlashcard();
        this.switchTab('flashcards');
    }

    displayFlashcard() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        const card = document.getElementById('flashcard');
        const front = document.getElementById('flashcard-front-content');
        const back = document.getElementById('flashcard-back-content');
        if (words.length === 0) {
            front.textContent = 'No words loaded';
            back.textContent = '';
            return;
        }
        const w = words[this.currentFlashcardIndex];
        card.classList.remove('flipped');
        if (this.flashcardMode === 'chinese-front') {
            front.innerHTML = `<div>${w.chinese}</div>`;
            back.innerHTML = `<div>${w.pinyin}</div><div>${w.english}</div><div>${w.vietnamese}</div>`;
        } else if (this.flashcardMode === 'pinyin-front') {
            front.innerHTML = `<div>${w.pinyin}</div>`;
            back.innerHTML = `<div>${w.chinese}</div><div>${w.english}</div><div>${w.vietnamese}</div>`;
        } else if (this.flashcardMode === 'english-front') {
            front.innerHTML = `<div>${w.english}</div>`;
            back.innerHTML = `<div>${w.chinese}</div><div>${w.pinyin}</div><div>${w.vietnamese}</div>`;
        } else {
            front.innerHTML = `<div>${w.vietnamese}</div>`;
            back.innerHTML = `<div>${w.chinese}</div><div>${w.pinyin}</div><div>${w.english}</div>`;
        }
        this.updateFlashcardProgress();
    }

    flipCard() {
        document.getElementById('flashcard').classList.toggle('flipped');
    }

    nextCard() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        if (words.length === 0) return;
        this.currentFlashcardIndex = (this.currentFlashcardIndex + 1) % words.length;
        this.displayFlashcard();
    }

    previousCard() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        if (words.length === 0) return;
        this.currentFlashcardIndex = (this.currentFlashcardIndex - 1 + words.length) % words.length;
        this.displayFlashcard();
    }

    updateFlashcardProgress() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        const text = document.getElementById('progress-text');
        const bar = document.getElementById('flashcard-progress');
        if (words.length === 0) {
            text.textContent = 'Card 0 of 0';
            bar.style.width = '0%';
        } else {
            text.textContent = `Card ${this.currentFlashcardIndex + 1} of ${words.length}`;
            bar.style.width = `${((this.currentFlashcardIndex + 1) / words.length) * 100}%`;
        }
    }

    markAsDifficult() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        if (words.length === 0) return;
        const w = words[this.currentFlashcardIndex];
        const key = `${w.chinese}-${w.pinyin}-${w.lesson}`;
        if (!this.difficultWords.includes(key)) {
            this.difficultWords.push(key);
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            this.updateStats();
            this.showMessage('Added to difficult words', 'success');
        }
    }

    markAsMastered() {
        const words = this.vocabulary.filter(w => w.lesson === this.currentLesson);
        if (words.length === 0) return;
        const w = words[this.currentFlashcardIndex];
        const key = `${w.chinese}-${w.pinyin}-${w.lesson}`;
        if (!this.masteredWords.includes(key)) {
            this.masteredWords.push(key);
            localStorage.setItem('masteredWords', JSON.stringify(this.masteredWords));
            this.difficultWords = this.difficultWords.filter(x => x !== key);
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            this.updateStats();
            this.showMessage('Marked as mastered', 'success');
        }
    }

    markWordAsMastered(key) {
        if (!this.masteredWords.includes(key)) this.masteredWords.push(key);
        this.difficultWords = this.difficultWords.filter(k => k !== key);
        localStorage.setItem('masteredWords', JSON.stringify(this.masteredWords));
        localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
        this.displayDifficultWords();
        this.updateStats();
        this.showMessage('Word mastered!', 'success');
    }

    removeFromDifficult(key) {
        this.difficultWords = this.difficultWords.filter(k => k !== key);
        localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
        this.displayDifficultWords();
        this.updateStats();
        this.showMessage('Removed from difficult words', 'warning');
    }

    practiceDifficultWords() {
        const details = this.getDifficultWordsDetails();
        if (details.length === 0) return this.showMessage('No difficult words to practice', 'warning');
        this.currentLesson = 'difficult';
        this.vocabulary = details;
        this.currentFlashcardIndex = 0;
        this.displayFlashcard();
        this.switchTab('flashcards');
    }

    clearDifficultWords() {
        this.difficultWords = [];
        localStorage.removeItem('difficultWords');
        this.displayDifficultWords();
        this.updateStats();
        this.showMessage('Cleared difficult words', 'warning');
    }

    getDifficultWordsDetails() {
        return this.difficultWords.map(key => {
            const [ch, py, lesson] = key.split('-');
            const w = this.vocabulary.find(v => v.chinese === ch && v.pinyin === py && v.lesson === lesson);
            return w || { chinese: ch, pinyin: py, english: 'N/A', vietnamese: 'N/A', lesson, key };
        });
    }

    // ---- Utility methods ----
    updateStats() {
        document.getElementById('total-words').textContent = this.vocabulary.length;
        document.getElementById('difficult-count').textContent = this.difficultWords.length;
        document.getElementById('mastered-count').textContent = this.masteredWords.length;
    }

    showLoading(show) {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.style.display = show ? 'block' : 'none';
    }

    showMessage(msg, type) {
        const box = document.getElementById('message-box');
        if (!box) return alert(msg);
        box.textContent = msg;
        box.className = `message ${type}`;
        setTimeout(() => box.textContent = '', 3000);
    }

    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    escapeHtml(str) {
        return str.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
    }
}

    checkAnswer(selectedOption) {
        const question = this.quizQuestions[this.currentQuizIndex];
        const isCorrect = selectedOption.dataset.answer === question.correctAnswer;
        const quizOptions = document.getElementById('quiz-options');
        const quizFeedback = document.getElementById('quiz-feedback');
        const nextButton = document.getElementById('next-question-btn');

        quizOptions.querySelectorAll('.quiz-option').forEach(option => {
            option.style.pointerEvents = 'none';
            if (option.dataset.answer === question.correctAnswer) {
                option.classList.add('correct');
            } else if (option === selectedOption && !isCorrect) {
                option.classList.add('incorrect');
            }
        });

        if (isCorrect) {
            this.quizScore++;
            quizFeedback.textContent = 'Correct! 🎉';
            quizFeedback.className = 'quiz-feedback success-message';
        } else {
            quizFeedback.innerHTML = `
                Incorrect 😔<br>
                <small>The correct answer is: <strong>${question.correctAnswer}</strong></small>
            `;
            quizFeedback.className = 'quiz-feedback error-message';
        }

        nextButton.classList.remove('hidden');
    }

    nextQuestion() {
        this.currentQuizIndex++;
        this.displayQuizQuestion();
    }

    showQuizResults() {
        const quizTypeNames = {
            'english': 'Chinese → English',
            'vietnamese': 'Chinese → Vietnamese',
            'pinyin': 'Chinese → Pinyin'
        };
        
        const quizContent = document.getElementById('quiz-content');
        const percentage = Math.round((this.quizScore / this.quizQuestions.length) * 100);
        const scoreClass = percentage >= 70 ? 'success-message' : percentage >= 50 ? 'warning-message' : 'error-message';
        
        quizContent.innerHTML = `
            <div class="text-center">
                <h2>Quiz Complete! 🎓</h2>
                <div class="quiz-type-info">
                    <small>Quiz Type: ${quizTypeNames[this.quizType]}</small>
                </div>
                <div class="${scoreClass}" style="margin: 20px 0; padding: 20px;">
                    <div style="font-size: 2rem; font-weight: bold; margin-bottom: 10px;">${percentage}%</div>
                    <div>Your score: ${this.quizScore} out of ${this.quizQuestions.length}</div>
                </div>
                <button id="restart-quiz-btn" class="btn primary mt-10">Restart Same Quiz</button>
                <button id="new-quiz-type-btn" class="btn secondary mt-10">New Quiz Type</button>
            </div>
        `;

        document.getElementById('restart-quiz-btn').addEventListener('click', () => {
            const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
            this.quizQuestions = this.generateQuizQuestions(filteredVocab, this.quizType);
            this.currentQuizIndex = 0;
            this.quizScore = 0;
            this.displayQuizQuestion();
        });

        document.getElementById('new-quiz-type-btn').addEventListener('click', () => {
            this.showQuizTypeSelection();
        });
    }

    updateQuizProgress() {
        const progressText = document.getElementById('quiz-progress-text');
        const progressBar = document.getElementById('quiz-progress');

        if (this.quizQuestions.length === 0) {
            progressText.textContent = 'Question 0 of 0';
            progressBar.style.width = '0%';
        } else {
            progressText.textContent = `Question ${this.currentQuizIndex + 1} of ${this.quizQuestions.length}`;
            progressBar.style.width = `${((this.currentQuizIndex + 1) / this.quizQuestions.length) * 100}%`;
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });

        if (tabName === 'flashcards') {
            this.displayFlashcard();
        } else if (tabName === 'quiz') {
            // Show quiz instructions if no quiz is active
            if (this.quizQuestions.length === 0) {
                this.displayQuizInstructions();
            } else {
                // If quiz is active, show current question
                this.displayQuizQuestion();
            }
        } else if (tabName === 'difficult') {
            this.displayDifficultWords();
        }
    }

    displayQuizInstructions() {
        const quizContent = document.getElementById('quiz-content');
        quizContent.innerHTML = `
            <div class="text-center">
                <h3>Ready for a Quiz?</h3>
                <p>Test your knowledge with multiple-choice questions.</p>
                <p>You can choose to test:</p>
                <ul style="text-align: left; display: inline-block; margin: 10px 0;">
                    <li>Chinese → English translation</li>
                    <li>Chinese → Vietnamese translation</li>
                    <li>Chinese → Pinyin reading</li>
                </ul>
                <p>Click "Start Quiz" to begin!</p>
                <button id="start-quiz-from-tab" class="btn primary mt-10">Start Quiz</button>
            </div>
        `;

        document.getElementById('start-quiz-from-tab').addEventListener('click', () => {
            this.startQuiz();
        });
    }

    displayDifficultWords() {
        const difficultList = document.getElementById('difficult-words-list');
        const difficultWords = this.getDifficultWordsDetails();

        if (difficultWords.length === 0) {
            difficultList.innerHTML = '<li class="difficult-word text-center">No difficult words yet. Keep studying!</li>';
            return;
        }

        difficultList.innerHTML = difficultWords.map(word => `
            <li class="difficult-word">
                <div class="word-info">
                    <strong>${word.chinese}</strong> (${word.pinyin})<br>
                    <small>${word.english} | ${word.vietnamese}</small>
                    ${word.lesson ? `<br><small class="lesson-tag">Lesson: ${word.lesson}</small>` : ''}
                </div>
                <div class="word-actions">
                    <button class="btn success mark-mastered" data-word="${word.key}">Mastered</button>
                    <button class="btn warning remove-difficult" data-word="${word.key}">Remove</button>
                </div>
            </li>
        `).join('');

        difficultList.querySelectorAll('.mark-mastered').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wordKey = e.target.dataset.word;
                this.markWordAsMastered(wordKey);
            });
        });

        difficultList.querySelectorAll('.remove-difficult').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wordKey = e.target.dataset.word;
                this.removeFromDifficult(wordKey);
            });
        });
    }

    getDifficultWordsDetails() {
        return this.difficultWords.map(wordKey => {
            const parts = wordKey.split('-');
            const chinese = parts[0];
            const pinyin = parts[1];
            const lesson = parts.slice(2).join('-');
            
            const word = this.vocabulary.find(w => 
                w.chinese === chinese && w.pinyin === pinyin && w.lesson === lesson
            );
            
            return word ? { ...word, key: wordKey } : { 
                chinese, 
                pinyin, 
                lesson,
                english: 'Word not in current vocabulary',
                vietnamese: 'Word not in current vocabulary',
                key: wordKey
            };
        });
    }

    markWordAsMastered(wordKey) {
        this.masteredWords.push(wordKey);
        localStorage.setItem('masteredWords', JSON.stringify(this.masteredWords));
        
        this.difficultWords = this.difficultWords.filter(w => w !== wordKey);
        localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
        
        this.displayDifficultWords();
        this.updateStats();
        this.showMessage('Word marked as mastered!', 'success');
    }

    removeFromDifficult(wordKey) {
        this.difficultWords = this.difficultWords.filter(w => w !== wordKey);
        localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
        
        this.displayDifficultWords();
        this.updateStats();
        this.showMessage('Word removed from difficult list', 'success');
    }

    practiceDifficultWords() {
        const difficultWords = this.getDifficultWordsDetails();
        if (difficultWords.length === 0) {
            this.showMessage('No difficult words to practice!', 'warning');
            return;
        }

        const validWords = difficultWords.filter(word => word.english !== 'Word not in current vocabulary');
        if (validWords.length === 0) {
            this.showMessage('No valid words to practice. Please load the correct book first.', 'error');
            return;
        }

        this.vocabulary = validWords;
        this.currentLesson = 'difficult-words';
        this.currentFlashcardIndex = 0;
        this.displayFlashcard();
        this.switchTab('flashcards');
        this.showMessage(`Practicing ${validWords.length} difficult words`, 'success');
    }

    clearDifficultWords() {
        if (confirm('Are you sure you want to clear all difficult words? This cannot be undone.')) {
            this.difficultWords = [];
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            this.displayDifficultWords();
            this.updateStats();
            this.showMessage('All difficult words cleared', 'success');
        }
    }

    updateStats() {
        const totalWords = this.vocabulary.filter(word => word.lesson === this.currentLesson).length;
        const masteredCount = this.masteredWords.length;
        const difficultCount = this.difficultWords.length;

        document.getElementById('total-words').textContent = totalWords;
        document.getElementById('mastered-words').textContent = masteredCount;
        document.getElementById('difficult-words').textContent = difficultCount;
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            if (show) {
                loadingIndicator.classList.remove('hidden');
            } else {
                loadingIndicator.classList.add('hidden');
            }
        }
    }

    showMessage(message, type = 'info') {
        const existingMessages = document.querySelectorAll('.message-container');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-container ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-text">${message}</span>
                <button class="message-close">&times;</button>
            </div>
        `;

        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            controlPanel.appendChild(messageDiv);

            setTimeout(() => {
                if (messageDiv.parentElement) {
                    messageDiv.remove();
                }
            }, 5000);

            messageDiv.querySelector('.message-close').addEventListener('click', () => {
                messageDiv.remove();
            });
        }
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add CSS for quiz type selection
const quizTypeStyles = `
.quiz-type-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 20px 0;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
}

.quiz-type-options .btn {
    padding: 15px;
    font-size: 1.1em;
}

.quiz-type-info {
    margin-bottom: 10px;
    color: var(--dark-color);
    font-style: italic;
}
`;

const messageStyles = `
.message-container {
    position: relative;
    margin: 10px 0;
    border-radius: var(--border-radius);
    overflow: hidden;
    animation: slideIn 0.3s ease-out;
}

.message-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
}

.message-text {
    flex: 1;
    margin-right: 10px;
}

.message-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.success-message {
    background-color: #e8f5e8;
    color: #2e7d32;
    border-left: 4px solid #2e7d32;
}

.error-message {
    background-color: #ffebee;
    color: #c62828;
    border-left: 4px solid #c62828;
}

.warning-message {
    background-color: #fff3e0;
    color: #ef6c00;
    border-left: 4px solid #ef6c00;
}

@keyframes slideIn {
    from {
        transform: translateY(-10px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.lesson-tag {
    background-color: var(--light-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    color: var(--dark-color);
}

.chinese-cell {
    font-family: "Microsoft YaHei", "SimHei", sans-serif;
    font-size: 1.1em;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = messageStyles + quizTypeStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', () => {
    new VocabularyApp();
});