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
        this.quizType = null;
        this.quizQuestionCount = 10; // Default number of questions
        this.difficultWords = JSON.parse(localStorage.getItem('difficultWords')) || [];
        this.masteredWords = JSON.parse(localStorage.getItem('masteredWords')) || [];
        
        this.initializeApp();
        this.bindEvents();
    }

    // Add this method to bind the question count selector
    bindEvents() {
        // ... your existing event bindings ...

        this.safeAddEventListener('question-count', 'change', (e) => {
            this.quizQuestionCount = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        });

        // ... rest of your existing bindEvents ...
    }

    // Fix the practiceDifficultWords method
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

        // Create a temporary vocabulary array for difficult words practice
        const tempVocabulary = [...validWords];
        
        // Store the original vocabulary and lesson
        this.originalVocabulary = this.vocabulary;
        this.originalLesson = this.currentLesson;
        
        // Use the difficult words for flashcards
        this.vocabulary = tempVocabulary;
        this.currentLesson = 'difficult-words';
        this.currentFlashcardIndex = 0;
        this.displayFlashcard();
        this.switchTab('flashcards');
        this.showMessage(`Practicing ${validWords.length} difficult words`, 'success');
    }

    // Update displayFlashcard to handle difficult words
    displayFlashcard() {
        let filteredVocab;
        
        if (this.currentLesson === 'difficult-words') {
            // Use the current vocabulary (which is set to difficult words)
            filteredVocab = this.vocabulary;
        } else {
            filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        }
        
        if (filteredVocab.length === 0) {
            this.showEmptyFlashcard();
            return;
        }

        const currentWord = filteredVocab[this.currentFlashcardIndex];
        const flashcard = this.getElement('flashcard');
        const frontContent = this.getElement('flashcard-front-content');
        const backContent = this.getElement('flashcard-back-content');

        if (!flashcard || !frontContent || !backContent) return;

        flashcard.classList.remove('flipped');

        // ... rest of your displayFlashcard code remains the same ...
        switch (this.flashcardMode) {
            case 'chinese-front':
                frontContent.innerHTML = `<div class="chinese-character">${currentWord.chinese}</div>`;
                backContent.innerHTML = `
                    <div class="pinyin">${currentWord.pinyin}</div>
                    <div class="meaning">${currentWord.english}</div>
                    <div class="meaning">${currentWord.vietnamese}</div>
                    ${currentWord.pos ? `<div class="pos">(${currentWord.pos})</div>` : ''}
                `;
                break;
            // ... other cases remain the same ...
        }

        this.updateFlashcardProgress();
    }

    // Update updateFlashcardProgress to handle difficult words
    updateFlashcardProgress() {
        let filteredVocab;
        
        if (this.currentLesson === 'difficult-words') {
            filteredVocab = this.vocabulary;
        } else {
            filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        }
        
        const progressText = this.getElement('progress-text');
        const progressBar = this.getElement('flashcard-progress');

        if (!progressText || !progressBar) return;

        if (filteredVocab.length === 0) {
            progressText.textContent = 'Card 0 of 0';
            progressBar.style.width = '0%';
        } else {
            progressText.textContent = `Card ${this.currentFlashcardIndex + 1} of ${filteredVocab.length}`;
            progressBar.style.width = `${((this.currentFlashcardIndex + 1) / filteredVocab.length) * 100}%`;
        }
    }

    // Update nextCard and previousCard to handle difficult words
    nextCard() {
        let filteredVocab;
        
        if (this.currentLesson === 'difficult-words') {
            filteredVocab = this.vocabulary;
        } else {
            filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        }
        
        if (filteredVocab.length === 0) return;
        
        this.currentFlashcardIndex = (this.currentFlashcardIndex + 1) % filteredVocab.length;
        this.displayFlashcard();
    }

    previousCard() {
        let filteredVocab;
        
        if (this.currentLesson === 'difficult-words') {
            filteredVocab = this.vocabulary;
        } else {
            filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        }
        
        if (filteredVocab.length === 0) return;
        
        this.currentFlashcardIndex = (this.currentFlashcardIndex - 1 + filteredVocab.length) % filteredVocab.length;
        this.displayFlashcard();
    }

    // Update generateQuizQuestions to use the selected question count
    generateQuizQuestions(vocabulary) {
        const questions = [];
        
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
                // ... other quiz types remain the same ...
            }
        });

        // Use the selected question count
        const questionCount = this.quizQuestionCount === 'all' ? questions.length : Math.min(this.quizQuestionCount, questions.length);
        return this.shuffleArray(questions).slice(0, questionCount);
    }

    // Add method to restore original vocabulary when leaving difficult words practice
    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });

        // Restore original vocabulary if we're leaving difficult words practice
        if (this.currentLesson === 'difficult-words' && tabName !== 'flashcards') {
            if (this.originalVocabulary) {
                this.vocabulary = this.originalVocabulary;
            }
            if (this.originalLesson) {
                this.currentLesson = this.originalLesson;
            }
        }

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
}

// Add CSS for quiz type selection and messages
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

@media (max-width: 768px) {
    .quiz-controls {
        flex-direction: column;
    }
    
    .quiz-controls .form-group {
        min-width: 100%;
    }
}
`;

// Add the styles to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = quizSelectionStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', () => {
    new VocabularyApp();
});