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
        this.quizType = 'chinese-english'; // Default quiz type
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

        // Quiz type selection
        document.getElementById('quiz-type-select').addEventListener('change', (e) => {
            this.quizType = e.target.value;
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
            if (e.target.closest('.flashcard-controls')) return;
            this.flipCard();
        });
    }

    // Add this method to update the HTML for quiz type selection
    updateQuizUI() {
        const quizControls = document.querySelector('.quiz-controls');
        if (!quizControls.querySelector('#quiz-type-select')) {
            const quizTypeHTML = `
                <div class="form-group">
                    <label for="quiz-type-select">Quiz Type:</label>
                    <select id="quiz-type-select" class="form-control">
                        <option value="chinese-english">Chinese → English</option>
                        <option value="chinese-vietnamese">Chinese → Vietnamese</option>
                        <option value="chinese-pinyin">Chinese → Pinyin</option>
                        <option value="mixed">Mixed Questions</option>
                    </select>
                </div>
            `;
            quizControls.insertAdjacentHTML('afterbegin', quizTypeHTML);
            
            // Re-bind the event listener
            document.getElementById('quiz-type-select').addEventListener('change', (e) => {
                this.quizType = e.target.value;
            });
        }
    }

    startQuiz() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) {
            this.showMessage('No vocabulary found for this lesson. Please load vocabulary first.', 'error');
            return;
        }

        this.quizQuestions = this.generateQuizQuestions(filteredVocab);
        
        if (this.quizQuestions.length === 0) {
            this.showMessage('Not enough vocabulary to generate quiz questions.', 'warning');
            return;
        }

        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.displayQuizQuestion();
        this.switchTab('quiz');
    }

    generateQuizQuestions(vocabulary) {
        const questions = [];
        
        // Only generate questions if we have at least 2 words for options
        if (vocabulary.length < 2) {
            return questions;
        }
        
        vocabulary.forEach(word => {
            if (!word.chinese || word.chinese.trim() === '') return;

            switch (this.quizType) {
                case 'chinese-english':
                    if (word.english && word.english.trim() !== '') {
                        const englishOptions = this.generateOptions(vocabulary, word.english, 'english');
                        if (englishOptions.length >= 2) {
                            questions.push({
                                type: 'chinese-english',
                                question: `What does "${word.chinese}" mean in English?`,
                                correctAnswer: word.english,
                                options: englishOptions,
                                word: word
                            });
                        }
                    }
                    break;
                    
                case 'chinese-vietnamese':
                    if (word.vietnamese && word.vietnamese.trim() !== '') {
                        const vietnameseOptions = this.generateOptions(vocabulary, word.vietnamese, 'vietnamese');
                        if (vietnameseOptions.length >= 2) {
                            questions.push({
                                type: 'chinese-vietnamese',
                                question: `What does "${word.chinese}" mean in Vietnamese?`,
                                correctAnswer: word.vietnamese,
                                options: vietnameseOptions,
                                word: word
                            });
                        }
                    }
                    break;
                    
                case 'chinese-pinyin':
                    if (word.pinyin && word.pinyin.trim() !== '') {
                        const pinyinOptions = this.generateOptions(vocabulary, word.pinyin, 'pinyin');
                        if (pinyinOptions.length >= 2) {
                            questions.push({
                                type: 'chinese-pinyin',
                                question: `What is the pinyin for "${word.chinese}"?`,
                                correctAnswer: word.pinyin,
                                options: pinyinOptions,
                                word: word
                            });
                        }
                    }
                    break;
                    
                case 'mixed':
                    // Generate one random question type for each word
                    const questionTypes = [];
                    if (word.english && word.english.trim() !== '') questionTypes.push('english');
                    if (word.vietnamese && word.vietnamese.trim() !== '') questionTypes.push('vietnamese');
                    if (word.pinyin && word.pinyin.trim() !== '') questionTypes.push('pinyin');
                    
                    if (questionTypes.length > 0) {
                        const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
                        let questionData;
                        
                        switch (randomType) {
                            case 'english':
                                const englishOptions = this.generateOptions(vocabulary, word.english, 'english');
                                if (englishOptions.length >= 2) {
                                    questionData = {
                                        type: 'chinese-english',
                                        question: `What does "${word.chinese}" mean in English?`,
                                        correctAnswer: word.english,
                                        options: englishOptions,
                                        word: word
                                    };
                                }
                                break;
                            case 'vietnamese':
                                const vietnameseOptions = this.generateOptions(vocabulary, word.vietnamese, 'vietnamese');
                                if (vietnameseOptions.length >= 2) {
                                    questionData = {
                                        type: 'chinese-vietnamese',
                                        question: `What does "${word.chinese}" mean in Vietnamese?`,
                                        correctAnswer: word.vietnamese,
                                        options: vietnameseOptions,
                                        word: word
                                    };
                                }
                                break;
                            case 'pinyin':
                                const pinyinOptions = this.generateOptions(vocabulary, word.pinyin, 'pinyin');
                                if (pinyinOptions.length >= 2) {
                                    questionData = {
                                        type: 'chinese-pinyin',
                                        question: `What is the pinyin for "${word.chinese}"?`,
                                        correctAnswer: word.pinyin,
                                        options: pinyinOptions,
                                        word: word
                                    };
                                }
                                break;
                        }
                        
                        if (questionData) {
                            questions.push(questionData);
                        }
                    }
                    break;
            }
        });

        return this.shuffleArray(questions).slice(0, Math.min(10, questions.length));
    }

    generateOptions(vocabulary, correctAnswer, field) {
        const options = [correctAnswer];
        const otherWords = vocabulary.filter(w => w[field] !== correctAnswer && w[field] && w[field].trim() !== '');
        
        // Add unique options from other words
        while (options.length < 4 && otherWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherWords.length);
            const option = otherWords[randomIndex][field];
            if (!options.includes(option)) {
                options.push(option);
            }
            otherWords.splice(randomIndex, 1);
        }

        // If we still don't have enough options, add generic ones
        const genericOptions = {
            pinyin: ['nǐ hǎo', 'xiè xie', 'zài jiàn', 'qǐng wèn'],
            english: ['hello', 'thank you', 'goodbye', 'please'],
            vietnamese: ['xin chào', 'cảm ơn', 'tạm biệt', 'làm ơn']
        };

        while (options.length < 4) {
            const genericOption = genericOptions[field][options.length - 1];
            if (!options.includes(genericOption)) {
                options.push(genericOption);
            }
        }

        return this.shuffleArray(options);
    }

    displayQuizQuestion() {
        const quizContent = document.getElementById('quiz-content');
        
        if (this.quizQuestions.length === 0) {
            quizContent.innerHTML = `
                <div class="text-center">
                    <h3>No Quiz Available</h3>
                    <p>Not enough vocabulary to generate quiz questions.</p>
                    <p>Please load a lesson with at least 2 vocabulary words.</p>
                </div>
            `;
            return;
        }

        if (this.currentQuizIndex >= this.quizQuestions.length) {
            this.showQuizResults();
            return;
        }

        const question = this.quizQuestions[this.currentQuizIndex];
        const quizQuestion = document.getElementById('quiz-question');
        const quizOptions = document.getElementById('quiz-options');
        const quizFeedback = document.getElementById('quiz-feedback');
        const nextButton = document.getElementById('next-question-btn');

        // Show quiz type in the question display
        const typeIndicator = this.getQuizTypeIndicator(question.type);
        quizQuestion.innerHTML = `
            ${question.question}
            <div class="quiz-type-indicator">${typeIndicator}</div>
        `;
        
        quizFeedback.textContent = '';
        quizFeedback.className = 'quiz-feedback';
        nextButton.classList.add('hidden');

        quizOptions.innerHTML = question.options.map(option => `
            <div class="quiz-option" data-answer="${this.escapeHtml(option)}">${option}</div>
        `).join('');

        quizOptions.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', (e) => this.checkAnswer(e.target));
        });

        this.updateQuizProgress();
    }

    getQuizTypeIndicator(type) {
        const indicators = {
            'chinese-english': '🇨🇳 → 🇺🇸',
            'chinese-vietnamese': '🇨🇳 → 🇻🇳', 
            'chinese-pinyin': '🇨🇳 → 📝'
        };
        return indicators[type] || '❓';
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
            this.updateQuizUI(); // Add quiz type selector when switching to quiz tab
            // Show quiz instructions if no quiz is active
            if (this.quizQuestions.length === 0) {
                this.displayQuizInstructions();
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
                <p>Test your knowledge with multiple-choice questions. Choose your preferred quiz type:</p>
                <div class="quiz-types-info">
                    <div class="quiz-type-info">
                        <strong>Chinese → English</strong>: Test your English translation skills
                    </div>
                    <div class="quiz-type-info">
                        <strong>Chinese → Vietnamese</strong>: Test your Vietnamese translation skills
                    </div>
                    <div class="quiz-type-info">
                        <strong>Chinese → Pinyin</strong>: Test your pinyin knowledge
                    </div>
                    <div class="quiz-type-info">
                        <strong>Mixed</strong>: A combination of all question types
                    </div>
                </div>
                <p>Select your quiz type above and click "Start Quiz" to begin!</p>
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

    // ... rest of the existing methods remain the same ...


// Add CSS for quiz type indicators and info
const quizTypeStyles = `
.quiz-type-indicator {
    font-size: 0.8rem;
    margin-top: 5px;
    opacity: 0.7;
}

.quiz-types-info {
    text-align: left;
    max-width: 400px;
    margin: 0 auto;
}

.quiz-type-info {
    margin: 8px 0;
    padding: 8px;
    background-color: var(--light-color);
    border-radius: var(--border-radius);
}

.quiz-controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: end;
}

.quiz-controls .form-group {
    flex: 1;
    min-width: 200px;
}

@media (max-width: 768px) {
    .quiz-controls {
        flex-direction: column;
    }
    
    .quiz-controls .form-group {
        min-width: 100%;
    }
}
`;

// Add the new styles to the existing styleSheet
const existingStyleSheet = document.querySelector('style');
if (existingStyleSheet) {
    existingStyleSheet.textContent += quizTypeStyles;
} else {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = quizTypeStyles;
    document.head.appendChild(styleSheet);
}

// Update the HTML structure to include quiz type selection
document.addEventListener('DOMContentLoaded', () => {
    // Modify the quiz controls in HTML to include quiz type selection
    const quizControls = document.querySelector('.quiz-controls');
    if (quizControls && !quizControls.querySelector('#quiz-type-select')) {
        const quizTypeHTML = `
            <div class="form-group">
                <label for="quiz-type-select">Quiz Type:</label>
                <select id="quiz-type-select" class="form-control">
                    <option value="chinese-english">Chinese → English</option>
                    <option value="chinese-vietnamese">Chinese → Vietnamese</option>
                    <option value="chinese-pinyin">Chinese → Pinyin</option>
                    <option value="mixed">Mixed Questions</option>
                </select>
            </div>
        `;
        quizControls.insertAdjacentHTML('afterbegin', quizTypeHTML);
    }
    
    new VocabularyApp();
});
|