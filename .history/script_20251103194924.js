class VocabularyApp {
    
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
                    ${currentWord.pos ? `<div class="pos">(${currentWord.pos})</div>` : ''}
                `;
                break;
            case 'pinyin-front':
                frontContent.innerHTML = `<div class="pinyin">${currentWord.pinyin}</div>`;
                backContent.innerHTML = `
                    <div class="chinese-character">${currentWord.chinese}</div>
                    <div class="meaning">${currentWord.english}</div>
                    <div class="meaning">${currentWord.vietnamese}</div>
                    ${currentWord.pos ? `<div class="pos">(${currentWord.pos})</div>` : ''}
                `;
                break;
            case 'english-front':
                frontContent.innerHTML = `<div class="meaning">${currentWord.english}</div>`;
                backContent.innerHTML = `
                    <div class="chinese-character">${currentWord.chinese}</div>
                    <div class="pinyin">${currentWord.pinyin}</div>
                    <div class="meaning">${currentWord.vietnamese}</div>
                    ${currentWord.pos ? `<div class="pos">(${currentWord.pos})</div>` : ''}
                `;
                break;
            case 'vietnamese-front':
                frontContent.innerHTML = `<div class="meaning">${currentWord.vietnamese}</div>`;
                backContent.innerHTML = `
                    <div class="chinese-character">${currentWord.chinese}</div>
                    <div class="pinyin">${currentWord.pinyin}</div>
                    <div class="meaning">${currentWord.english}</div>
                    ${currentWord.pos ? `<div class="pos">(${currentWord.pos})</div>` : ''}
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
        
        const wordKey = `${currentWord.chinese}-${currentWord.pinyin}-${currentWord.lesson}`;
        if (!this.difficultWords.includes(wordKey)) {
            this.difficultWords.push(wordKey);
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            this.updateStats();
            this.showMessage('Word marked as difficult', 'success');
        }
    }

    markAsMastered() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        const currentWord = filteredVocab[this.currentFlashcardIndex];
        
        const wordKey = `${currentWord.chinese}-${currentWord.pinyin}-${currentWord.lesson}`;
        if (!this.masteredWords.includes(wordKey)) {
            this.masteredWords.push(wordKey);
            localStorage.setItem('masteredWords', JSON.stringify(this.masteredWords));
            
            this.difficultWords = this.difficultWords.filter(w => w !== wordKey);
            localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
            
            this.updateStats();
            this.showMessage('Word marked as mastered!', 'success');
        }
    }

    startQuiz() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) {
            this.showMessage('No vocabulary found for this lesson. Please load vocabulary first.', 'error');
            return;
        }

        this.quizQuestions = this.generateQuizQuestions(filteredVocab);
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.displayQuizQuestion();
        this.switchTab('quiz');
    }

    generateQuizQuestions(vocabulary) {
        const questions = [];
        
        vocabulary.forEach(word => {
            questions.push({
                type: 'pinyin',
                question: `What is the pinyin for "${word.chinese}"?`,
                correctAnswer: word.pinyin,
                options: this.generateOptions(vocabulary, word.pinyin, 'pinyin'),
                word: word
            });

            questions.push({
                type: 'meaning',
                question: `What does "${word.chinese}" mean in English?`,
                correctAnswer: word.english,
                options: this.generateOptions(vocabulary, word.english, 'english'),
                word: word
            });

            questions.push({
                type: 'vietnamese',
                question: `What does "${word.chinese}" mean in Vietnamese?`,
                correctAnswer: word.vietnamese,
                options: this.generateOptions(vocabulary, word.vietnamese, 'vietnamese'),
                word: word
            });
        });

        return this.shuffleArray(questions).slice(0, Math.min(10, vocabulary.length * 2));
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
            <div class="quiz-option" data-answer="${this.escapeHtml(option)}">${option}</div>
        `).join('');

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
        const quizContent = document.getElementById('quiz-content');
        const percentage = Math.round((this.quizScore / this.quizQuestions.length) * 100);
        const scoreClass = percentage >= 70 ? 'success-message' : percentage >= 50 ? 'warning-message' : 'error-message';
        
        quizContent.innerHTML = `
            <div class="text-center">
                <h2>Quiz Complete! 🎓</h2>
                <div class="${scoreClass}" style="margin: 20px 0; padding: 20px;">
                    <div style="font-size: 2rem; font-weight: bold; margin-bottom: 10px;">${percentage}%</div>
                    <div>Your score: ${this.quizScore} out of ${this.quizQuestions.length}</div>
                </div>
                <button id="restart-quiz-btn" class="btn primary mt-10">Restart Quiz</button>
                <button id="new-quiz-btn" class="btn secondary mt-10">New Quiz</button>
            </div>
        `;

        document.getElementById('restart-quiz-btn').addEventListener('click', () => this.startQuiz());
        document.getElementById('new-quiz-btn').addEventListener('click', () => {
            const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
            this.quizQuestions = this.generateQuizQuestions(filteredVocab);
            this.currentQuizIndex = 0;
            this.quizScore = 0;
            this.displayQuizQuestion();
        });
    }

    updateQuizProgress() {
        const progressText = document.getElementById('quiz-progress-text');
        const progressBar = document.getElementById('quiz-progress');

        progressText.textContent = `Question ${this.currentQuizIndex + 1} of ${this.quizQuestions.length}`;
        progressBar.style.width = `${((this.currentQuizIndex + 1) / this.quizQuestions.length) * 100}%`;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });

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
        this.startFlashcards();
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
        if (show) {
            loadingIndicator.classList.remove('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
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

// Add CSS for messages
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
styleSheet.textContent = messageStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', () => {
    new VocabularyApp();
});