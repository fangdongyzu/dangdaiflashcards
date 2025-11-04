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
        this.quizType = 'english'; // 'english', 'vietnamese', or 'pinyin'
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
        // Book selection
        document.getElementById('book-select').addEventListener('change', (e) => {
            this.currentBook = e.target.value;
            this.loadBookData(this.currentBook);
        });

        // Lesson selection
        document.getElementById('lesson-select').addEventListener('change', (e) => {
            this.currentLesson = e.target.value;
        });

        // Mode selection
        document.getElementById('mode-select').addEventListener('change', (e) => {
            this.flashcardMode = e.target.value;
        });

        // Buttons
        document.getElementById('load-vocab-btn').addEventListener('click', () => this.loadVocabulary());
        document.getElementById('start-flashcards-btn').addEventListener('click', () => this.startFlashcards());
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.startQuiz());

        // Flashcard controls
        document.getElementById('prev-card-btn').addEventListener('click', () => this.previousCard());
        document.getElementById('next-card-btn').addEventListener('click', () => this.nextCard());
        document.getElementById('flip-card-btn').addEventListener('click', () => this.flipCard());
        document.getElementById('mark-difficult-btn').addEventListener('click', () => this.markAsDifficult());
        document.getElementById('mark-mastered-btn').addEventListener('click', () => this.markAsMastered());

        // Quiz controls
        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());

        // Difficult words
        document.getElementById('practice-difficult-btn').addEventListener('click', () => this.practiceDifficultWords());
        document.getElementById('clear-difficult-btn').addEventListener('click', () => this.clearDifficultWords());

        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Touch events for flashcards
        document.getElementById('flashcard').addEventListener('click', (e) => {
            if (e.target.closest('.flashcard-controls')) return;
            this.flipCard();
        });

        // Event delegation for quiz type buttons
        document.getElementById('quiz-content').addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-type-btn')) {
                const type = e.target.dataset.type;
                this.selectQuizType(type);
            }
        });
    }

    populateLessonOptions() {
        const lessonSelect = document.getElementById('lesson-select');
        lessonSelect.innerHTML = '';
        
        for (let lesson = 1; lesson <= 15; lesson++) {
            const option1 = document.createElement('option');
            option1.value = `${lesson}-1`;
            option1.textContent = `Lesson ${lesson}-1`;
            lessonSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = `${lesson}-2`;
            option2.textContent = `Lesson ${lesson}-2`;
            lessonSelect.appendChild(option2);
        }
        
        this.currentLesson = '1-1';
    }

    async loadBookData(book) {
        try {
            // In a real app, this would fetch from your CSV file
            // For now, we'll use mock data that matches your format
            this.vocabulary = await this.mockLoadCSVData(book);
            this.populateLessonOptions();
            this.updateStats();
        } catch (error) {
            console.error('Error loading book data:', error);
        }
    }

    async mockLoadCSVData(book) {
        // Mock data - replace this with actual CSV loading logic
        // This simulates the structure of your B1.csv file
        return [
            { lesson: '1-1', index: 1, chinese: '陳月美', pinyin: 'Chén Yuèměi', english: 'a woman from Vietnam', vietnamese: 'một phụ nữ từ Việt Nam', pos: '' },
            { lesson: '1-1', index: 2, chinese: '李明華', pinyin: 'Lǐ Mínghuá', english: 'a man from Taiwan', vietnamese: 'một người đàn ông từ Đài Loan', pos: '' },
            { lesson: '1-1', index: 3, chinese: '王開文', pinyin: 'Wáng Kāiwén', english: 'a man from the US', vietnamese: 'một người đàn ông từ Mỹ', pos: '' },
            { lesson: '1-1', index: 4, chinese: '你', pinyin: 'nǐ', english: 'you', vietnamese: 'bạn', pos: 'N' },
            { lesson: '1-2', index: 1, chinese: '你好', pinyin: 'nǐ hǎo', english: 'hello', vietnamese: 'xin chào', pos: '' },
            { lesson: '1-2', index: 2, chinese: '謝謝', pinyin: 'xiè xie', english: 'thank you', vietnamese: 'cảm ơn', pos: '' }
        ];
    }

    loadVocabulary() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        const tableBody = document.getElementById('vocabulary-table-body');
        
        tableBody.innerHTML = filteredVocab.map(word => `
            <tr>
                <td>${word.chinese}</td>
                <td>${word.pinyin}</td>
                <td>${word.english}</td>
                <td>${word.vietnamese}</td>
                <td>${word.pos}</td>
            </tr>
        `).join('');

        this.switchTab('vocabulary');
        this.updateStats();
    }

    startFlashcards() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) {
            alert('No vocabulary found for this lesson. Please load vocabulary first.');
            return;
        }

        this.currentFlashcardIndex = 0;
        this.displayFlashcard();
        this.switchTab('flashcards');
    }

    displayFlashcard() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) return;

        const currentWord = filteredVocab[this.currentFlashcardIndex];
        const flashcard = document.getElementById('flashcard');
        const frontContent = document.getElementById('flashcard-front-content');
        const backContent = document.getElementById('flashcard-back-content');

        flashcard.classList.remove('flipped');

        switch (this.flashcardMode) {
            case 'chinese-front':
                frontContent.innerHTML = `<div class="chinese-character">${currentWord.chinese}</div>`;
                backContent.innerHTML = `
                    <div class="pinyin">${currentWord.pinyin}</div>
                    <div class="meaning">${currentWord.english}</div>
                    <div class="meaning">${currentWord.vietnamese}</div>
                `;
                break;
            case 'pinyin-front':
                frontContent.innerHTML = `<div class="pinyin">${currentWord.pinyin}</div>`;
                backContent.innerHTML = `
                    <div class="chinese-character">${currentWord.chinese}</div>
                    <div class="meaning">${currentWord.english}</div>
                    <div class="meaning">${currentWord.vietnamese}</div>
                `;
                break;
            case 'english-front':
                frontContent.innerHTML = `<div class="meaning">${currentWord.english}</div>`;
                backContent.innerHTML = `
                    <div class="chinese-character">${currentWord.chinese}</div>
                    <div class="pinyin">${currentWord.pinyin}</div>
                    <div class="meaning">${currentWord.vietnamese}</div>
                `;
                break;
            case 'vietnamese-front':
                frontContent.innerHTML = `<div class="meaning">${currentWord.vietnamese}</div>`;
                backContent.innerHTML = `
                    <div class="chinese-character">${currentWord.chinese}</div>
                    <div class="pinyin">${currentWord.pinyin}</div>
                    <div class="meaning">${currentWord.english}</div>
                `;
                break;
        }

        this.updateFlashcardProgress();
    }

    flipCard() {
        document.getElementById('flashcard').classList.toggle('flipped');
    }

    nextCard() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        this.currentFlashcardIndex = (this.currentFlashcardIndex + 1) % filteredVocab.length;
        this.displayFlashcard();
    }

    previousCard() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        this.currentFlashcardIndex = (this.currentFlashcardIndex - 1 + filteredVocab.length) % filteredVocab.length;
        this.displayFlashcard();
    }

    updateFlashcardProgress() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('flashcard-progress');

        progressText.textContent = `Card ${this.currentFlashcardIndex + 1} of ${filteredVocab.length}`;
        progressBar.style.width = `${((this.currentFlashcardIndex + 1) / filteredVocab.length) * 100}%`;
    }

    markAsDifficult() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        const currentWord = filteredVocab[this.currentFlashcardIndex];
        
        const wordKey = `${currentWord.chinese}-${currentWord.pinyin}`;
        if (!this.difficultWords.includes(wordKey)) {
            this.difficultWords.push(wordKey);
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            this.updateStats();
        }
    }

    markAsMastered() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        const currentWord = filteredVocab[this.currentFlashcardIndex];
        
        const wordKey = `${currentWord.chinese}-${currentWord.pinyin}`;
        if (!this.masteredWords.includes(wordKey)) {
            this.masteredWords.push(wordKey);
            localStorage.setItem('masteredWords', JSON.stringify(this.masteredWords));
            
            // Remove from difficult words if it was there
            this.difficultWords = this.difficultWords.filter(w => w !== wordKey);
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            
            this.updateStats();
        }
    }

    startQuiz() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) {
            alert('No vocabulary found for this lesson. Please load vocabulary first.');
            return;
        }

        // Show quiz type selection instead of starting quiz directly
        this.showQuizTypeSelection();
    }

    showQuizTypeSelection() {
        const quizContent = document.getElementById('quiz-content');
        quizContent.innerHTML = `
            <div class="text-center">
                <h3>Choose Quiz Type</h3>
                <p>Select what you want to test:</p>
                <div class="quiz-type-options">
                    <button class="btn primary quiz-type-btn" data-type="english">
                        Chinese → English
                    </button>
                    <button class="btn primary quiz-type-btn" data-type="vietnamese">
                        Chinese → Vietnamese
                    </button>
                    <button class="btn primary quiz-type-btn" data-type="pinyin">
                        Chinese → Pinyin
                    </button>
                </div>
            </div>
        `;

        this.switchTab('quiz');
    }

    selectQuizType(type) {
        this.quizType = type;
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        this.quizQuestions = this.generateQuizQuestions(filteredVocab);
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.displayQuizQuestion();
    }

    generateQuizQuestions(vocabulary) {
        const questions = [];
        
        vocabulary.forEach(word => {
            // Only generate questions for the selected quiz type
            if (this.quizType === 'pinyin') {
                // Pinyin question
                questions.push({
                    type: 'pinyin',
                    question: `What is the pinyin for "${word.chinese}"?`,
                    correctAnswer: word.pinyin,
                    options: this.generateOptions(vocabulary, word.pinyin, 'pinyin'),
                    word: word
                });
            } else if (this.quizType === 'english') {
                // English meaning question
                questions.push({
                    type: 'meaning',
                    question: `What does "${word.chinese}" mean in English?`,
                    correctAnswer: word.english,
                    options: this.generateOptions(vocabulary, word.english, 'english'),
                    word: word
                });
            } else if (this.quizType === 'vietnamese') {
                // Vietnamese meaning question
                questions.push({
                    type: 'meaning',
                    question: `What does "${word.chinese}" mean in Vietnamese?`,
                    correctAnswer: word.vietnamese,
                    options: this.generateOptions(vocabulary, word.vietnamese, 'vietnamese'),
                    word: word
                });
            }
        });

        return this.shuffleArray(questions).slice(0, 10); // Limit to 10 questions
    }

    generateOptions(vocabulary, correctAnswer, field) {
        const options = [correctAnswer];
        const otherWords = vocabulary.filter(w => w[field] !== correctAnswer);
        
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
            pinyin: ['nǐ', 'wǒ', 'tā', 'hǎo'],
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
        if (this.currentQuizIndex >= this.quizQuestions.length) {
            this.showQuizResults();
            return;
        }

        const question = this.quizQuestions[this.currentQuizIndex];
        const quizQuestion = document.getElementById('quiz-question');
        const quizOptions = document.getElementById('quiz-options');
        const quizFeedback = document.getElementById('quiz-feedback');
        const nextButton = document.getElementById('next-question-btn');

        quizQuestion.textContent = question.question;
        quizFeedback.textContent = '';
        quizFeedback.className = 'quiz-feedback';
        nextButton.classList.add('hidden');

        quizOptions.innerHTML = question.options.map(option => `
            <div class="quiz-option" data-answer="${option}">${option}</div>
        `).join('');

        // Add event listeners to options
        quizOptions.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', (e) => this.checkAnswer(e.target));
        });

        this.updateQuizProgress();
    }

    checkAnswer(selectedOption) {
        const question = this.quizQuestions[this.currentQuizIndex];
        const isCorrect = selectedOption.dataset.answer === question.correctAnswer;
        const quizOptions = document.getElementById('quiz-options');
        const quizFeedback = document.getElementById('quiz-feedback');
        const nextButton = document.getElementById('next-question-btn');

        // Disable all options
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
            quizFeedback.textContent = 'Correct!';
            quizFeedback.style.backgroundColor = 'var(--success-color)';
            quizFeedback.style.color = 'white';
        } else {
            quizFeedback.textContent = `Incorrect. The correct answer is: ${question.correctAnswer}`;
            quizFeedback.style.backgroundColor = 'var(--accent-color)';
            quizFeedback.style.color = 'white';
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
        quizContent.innerHTML = `
            <div class="text-center">
                <h2>Quiz Complete!</h2>
                <p><strong>Quiz Type:</strong> ${quizTypeNames[this.quizType]}</p>
                <p>Your score: ${this.quizScore} out of ${this.quizQuestions.length}</p>
                <p>Percentage: ${Math.round((this.quizScore / this.quizQuestions.length) * 100)}%</p>
                <button id="restart-quiz-btn" class="btn primary mt-10">Restart Quiz</button>
                <button id="new-quiz-type-btn" class="btn secondary mt-10">Choose Different Quiz Type</button>
            </div>
        `;

        document.getElementById('restart-quiz-btn').addEventListener('click', () => {
            const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
            this.quizQuestions = this.generateQuizQuestions(filteredVocab);
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

        progressText.textContent = `Question ${this.currentQuizIndex + 1} of ${this.quizQuestions.length}`;
        progressBar.style.width = `${((this.currentQuizIndex + 1) / this.quizQuestions.length) * 100}%`;
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });

        // Load content for specific tabs
        if (tabName === 'difficult') {
            this.displayDifficultWords();
        }
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
                </div>
                <div class="word-actions">
                    <button class="btn success mark-mastered" data-word="${word.chinese}-${word.pinyin}">Mastered</button>
                    <button class="btn warning remove-difficult" data-word="${word.chinese}-${word.pinyin}">Remove</button>
                </div>
            </li>
        `).join('');

        // Add event listeners
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
            const [chinese, pinyin] = wordKey.split('-');
            const word = this.vocabulary.find(w => w.chinese === chinese && w.pinyin === pinyin);
            return word || { chinese, pinyin, english: 'Not found', vietnamese: 'Not found' };
        });
    }

    markWordAsMastered(wordKey) {
        this.masteredWords.push(wordKey);
        localStorage.setItem('masteredWords', JSON.stringify(this.masteredWords));
        
        this.difficultWords = this.difficultWords.filter(w => w !== wordKey);
        localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
        
        this.displayDifficultWords();
        this.updateStats();
    }

    removeFromDifficult(wordKey) {
        this.difficultWords = this.difficultWords.filter(w => w !== wordKey);
        localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
        
        this.displayDifficultWords();
        this.updateStats();
    }

    practiceDifficultWords() {
        const difficultWords = this.getDifficultWordsDetails();
        if (difficultWords.length === 0) {
            alert('No difficult words to practice!');
            return;
        }

        // Set current lesson to practice difficult words
        this.vocabulary = difficultWords;
        this.currentLesson = 'difficult';
        this.startFlashcards();
    }

    clearDifficultWords() {
        if (confirm('Are you sure you want to clear all difficult words?')) {
            this.difficultWords = [];
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            this.displayDifficultWords();
            this.updateStats();
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

    // Utility functions
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
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
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = quizTypeStyles;
document.head.appendChild(styleSheet);

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VocabularyApp();
});