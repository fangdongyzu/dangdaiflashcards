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
        this.quizType = null; // Will be set when user selects a quiz type
        this.difficultWords = JSON.parse(localStorage.getItem('difficultWords')) || [];
        this.masteredWords = JSON.parse(localStorage.getItem('masteredWords')) || [];
        
        this.initializeApp();
        this.bindEvents();
    }

    initializeApp() {
        this.populateLessonOptions();
        this.updateStats();
        this.loadBookData(this.currentBook);
        this.initializeQuizUI();
    }

    bindEvents() {
        // Safe event binding with null checks
        this.safeAddEventListener('book-select', 'change', (e) => {
            this.currentBook = e.target.value;
            this.loadBookData(this.currentBook);
        });

        this.safeAddEventListener('lesson-select', 'change', (e) => {
            this.currentLesson = e.target.value;
            this.currentFlashcardIndex = 0;
            if (this.getElement('flashcards-content')?.classList.contains('active')) {
                this.displayFlashcard();
            }
        });

        this.safeAddEventListener('mode-select', 'change', (e) => {
            this.flashcardMode = e.target.value;
            if (this.getElement('flashcards-content')?.classList.contains('active')) {
                this.displayFlashcard();
            }
        });

        this.safeAddEventListener('load-vocab-btn', 'click', () => this.loadVocabulary());
        this.safeAddEventListener('start-flashcards-btn', 'click', () => this.startFlashcards());
        this.safeAddEventListener('start-quiz-btn', 'click', () => this.showQuizSelection());

        this.safeAddEventListener('prev-card-btn', 'click', () => this.previousCard());
        this.safeAddEventListener('next-card-btn', 'click', () => this.nextCard());
        this.safeAddEventListener('flip-card-btn', 'click', () => this.flipCard());
        this.safeAddEventListener('mark-difficult-btn', 'click', () => this.markAsDifficult());
        this.safeAddEventListener('mark-mastered-btn', 'click', () => this.markAsMastered());

        this.safeAddEventListener('next-question-btn', 'click', () => this.nextQuestion());
        this.safeAddEventListener('start-selected-quiz', 'click', () => this.startSelectedQuiz());

        this.safeAddEventListener('practice-difficult-btn', 'click', () => this.practiceDifficultWords());
        this.safeAddEventListener('clear-difficult-btn', 'click', () => this.clearDifficultWords());

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        const flashcard = this.getElement('flashcard');
        if (flashcard) {
            flashcard.addEventListener('click', (e) => {
                if (e.target.closest('.flashcard-controls')) return;
                this.flipCard();
            });
        }
    }

    initializeQuizUI() {
        // Add event listeners for quiz type selection
        const quizTypeOptions = document.querySelectorAll('.quiz-type-option');
        quizTypeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                quizTypeOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                option.classList.add('active');
                
                // Enable start button
                const startButton = this.getElement('start-selected-quiz');
                if (startButton) {
                    startButton.disabled = false;
                }
                
                // Store selected quiz type
                this.quizType = option.dataset.quizType;
            });
        });
    }

    showQuizSelection() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) {
            this.showMessage('No vocabulary found for this lesson. Please load vocabulary first.', 'error');
            return;
        }

        // Reset quiz selection
        const quizTypeOptions = document.querySelectorAll('.quiz-type-option');
        quizTypeOptions.forEach(opt => opt.classList.remove('active'));
        
        const startButton = this.getElement('start-selected-quiz');
        if (startButton) {
            startButton.disabled = true;
        }
        
        this.quizType = null;

        // Show quiz setup and hide quiz container
        const quizSetup = this.getElement('quiz-setup');
        const quizContainer = this.getElement('quiz-container');
        
        if (quizSetup) quizSetup.classList.remove('hidden');
        if (quizContainer) quizContainer.classList.add('hidden');

        this.switchTab('quiz');
        this.showMessage('Please select a quiz type to begin', 'info');
    }

    startSelectedQuiz() {
        if (!this.quizType) {
            this.showMessage('Please select a quiz type first', 'error');
            return;
        }

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

        // Hide quiz setup and show quiz container
        const quizSetup = this.getElement('quiz-setup');
        const quizContainer = this.getElement('quiz-container');
        
        if (quizSetup) quizSetup.classList.add('hidden');
        if (quizContainer) quizContainer.classList.remove('hidden');

        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.displayQuizQuestion();
    }

    // ... (keep all the existing methods like generateQuizQuestions, displayQuizQuestion, etc. the same)

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
            // When switching to quiz tab, show the selection screen
            const quizSetup = this.getElement('quiz-setup');
            const quizContainer = this.getElement('quiz-container');
            
            if (quizSetup && quizContainer) {
                quizSetup.classList.remove('hidden');
                quizContainer.classList.add('hidden');
            }
            
            // Reset quiz selection
            const quizTypeOptions = document.querySelectorAll('.quiz-type-option');
            quizTypeOptions.forEach(opt => opt.classList.remove('active'));
            
            const startButton = this.getElement('start-selected-quiz');
            if (startButton) {
                startButton.disabled = true;
            }
            
            this.quizType = null;
        } else if (tabName === 'difficult') {
            this.displayDifficultWords();
        }
    }

    // ... (keep all other existing methods the same)

    safeAddEventListener(elementId, event, handler) {
        const element = this.getElement(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    getElement(id) {
        return document.getElementById(id);
    }

    // ... (rest of the existing methods remain the same)
}

// Add CSS for quiz type selection
const quizSelectionStyles = `
.quiz-setup {
    text-align: center;
    padding: 20px;
}

.quiz-type-selection {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin: 30px 0;
}

.quiz-type-option {
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: white;
}

.quiz-type-option:hover {
    border-color: var(--secondary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.quiz-type-option.active {
    border-color: var(--secondary-color);
    background-color: #f0f8ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.quiz-type-icon {
    font-size: 2.5rem;
    margin-bottom: 10px;
}

.quiz-type-info h4 {
    margin: 0 0 8px 0;
    color: var(--primary-color);
    font-size: 1.1rem;
}

.quiz-type-info p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
    line-height: 1.4;
}

.quiz-start-controls {
    margin-top: 30px;
}

.hidden {
    display: none !important;
}

.quiz-container {
    padding: 20px;
}
`;

// Add the styles to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = quizSelectionStyles + messageStyles; 
// Combine with existing message styles

// Add CSS for quiz type selection and messages


// Add the styles to the document

styleSheet.textContent = quizSelectionStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', () => {
    new VocabularyApp();
});

