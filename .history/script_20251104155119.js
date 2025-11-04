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
        this.quizQuestionCount = 10; // Default number of questions
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

        this.safeAddEventListener('question-count', 'change', (e) => {
            this.quizQuestionCount = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        });
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

    safeAddEventListener(elementId, event, handler) {
        const element = this.getElement(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    getElement(id) {
        return document.getElementById(id);
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

    populateLessonOptions() {
        const lessonSelect = this.getElement('lesson-select');
        if (!lessonSelect) return;

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
        this.showLoading(true);

        try {
            const csvData = await this.fetchCSVData(book);
            this.vocabulary = this.parseCSVData(csvData);
            this.updateStats();
            this.showMessage(`Successfully loaded ${this.vocabulary.length} words from ${book}`, 'success');
        } catch (error) {
            console.error('Error loading book data:', error);
            this.showMessage(`Error loading ${book}.csv: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchCSVData(book) {
        const csvFile = `${book}.csv`;

        try {
            const response = await fetch(csvFile);
            if (!response.ok) {
                throw new Error(`File not found: ${csvFile}`);
            }

            const buffer = await response.arrayBuffer();
            const byteArray = new Uint8Array(buffer);

            const decoders = [
                { name: 'UTF-8', decoder: new TextDecoder('utf-8') },
                { name: 'GB18030', decoder: new TextDecoder('gb18030') },
                { name: 'GBK', decoder: new TextDecoder('gbk') },
                { name: 'Big5', decoder: new TextDecoder('big5') },
                { name: 'UTF-16LE', decoder: new TextDecoder('utf-16le') },
                { name: 'UTF-16BE', decoder: new TextDecoder('utf-16be') }
            ];

            for (const { name, decoder } of decoders) {
                try {
                    const text = decoder.decode(buffer);
                    const cleanedText = this.removeBOM(text);

                    if (this.isValidCSV(cleanedText)) {
                        console.log(`Successfully decoded with ${name}`);
                        return cleanedText;
                    }
                } catch (e) {
                    console.log(`Failed to decode with ${name}`);
                }
            }

            throw new Error('Could not decode CSV file with any supported encoding');

        } catch (error) {
            throw new Error(`Failed to load CSV file: ${error.message}`);
        }
    }

    removeBOM(text) {
        return text.replace(/^\uFEFF/, '');
    }

    isValidCSV(text) {
        const hasLessonPattern = /1-1/.test(text);
        const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
        const hasCommas = /,/.test(text);

        return hasLessonPattern && hasChineseChars && hasCommas;
    }

    parseCSVData(csvText) {
        csvText = this.cleanText(csvText);
        const lines = csvText.split('\n').filter(line => line.trim() !== '');

        if (lines.length === 0) {
            throw new Error('CSV file is empty after cleaning');
        }

        const vocabulary = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const row = this.parseCSVLine(lines[i]);

                if (row.length >= 7) {
                    const vocabItem = {
                        lesson: this.cleanField(row[0]),
                        index: parseInt(this.cleanField(row[1])) || i,
                        chinese: this.cleanField(row[2]),
                        pinyin: this.cleanField(row[3]),
                        pos: this.cleanField(row[4]),
                        english: this.cleanField(row[5]),
                        vietnamese: this.cleanField(row[6]),
                        book: this.cleanField(row[7]) || '1'
                    };

                    if (vocabItem.chinese && vocabItem.chinese.trim() !== '') {
                        vocabulary.push(vocabItem);
                    }
                }
            } catch (error) {
                console.warn(`Skipping invalid row ${i + 1}:`, error);
            }
        }

        console.log(`Parsed ${vocabulary.length} vocabulary items`);
        return vocabulary;
    }

    cleanText(text) {
        return text
            .replace(/^\uFEFF/, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim();
    }

    cleanField(field) {
        if (!field) return '';
        return field.toString().replace(/^"|"$/g, '').trim();
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '"';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                if (i + 1 < line.length && line[i + 1] === quoteChar) {
                    current += char;
                    i++;
                } else {
                    inQuotes = false;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    loadVocabulary() {
        if (this.vocabulary.length === 0) {
            this.showMessage('No vocabulary data loaded. Please select a book first.', 'error');
            return;
        }

        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);

        if (filteredVocab.length === 0) {
            this.showMessage(`No vocabulary found for lesson ${this.currentLesson}`, 'warning');
            return;
        }

        const tableBody = this.getElement('vocabulary-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = filteredVocab.map(word => `
            <tr>
                <td class="chinese-cell">${word.chinese}</td>
                <td>${word.pinyin}</td>
                <td>${word.english}</td>
                <td>${word.vietnamese}</td>
                <td>${word.pos}</td>
            </tr>
        `).join('');

        this.switchTab('vocabulary');
        this.updateStats();
        this.showMessage(`Loaded ${filteredVocab.length} words from lesson ${this.currentLesson}`, 'success');
    }

    startFlashcards() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) {
            this.showMessage('No vocabulary found for this lesson. Please load vocabulary first.', 'error');
            return;
        }

        this.currentFlashcardIndex = 0;
        this.displayFlashcard();
        this.switchTab('flashcards');
    }

      displayFlashcard() {
        let filteredVocab;
        
        // Check if we're practicing difficult words
        if (this.currentLesson === 'difficult-words' && this.originalVocabulary) {
            filteredVocab = this.vocabulary; // Use the temp vocabulary
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

        // Your existing flashcard display logic...
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
            // ... rest of your cases
        }

        this.updateFlashcardProgress();
    }


    showEmptyFlashcard() {
        const frontContent = this.getElement('flashcard-front-content');
        const backContent = this.getElement('flashcard-back-content');

        if (!frontContent || !backContent) return;

        frontContent.innerHTML = `<div class="chinese-character">請選擇課程</div>`;
        backContent.innerHTML = `<div class="flashcard-content">Please select a lesson</div>`;

        this.updateFlashcardProgress();
    }

    flipCard() {
        const flashcard = this.getElement('flashcard');
        if (flashcard) {
            flashcard.classList.toggle('flipped');
        }
    }

    nextCard() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) return;

        this.currentFlashcardIndex = (this.currentFlashcardIndex + 1) % filteredVocab.length;
        this.displayFlashcard();
    }

    previousCard() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) return;

        this.currentFlashcardIndex = (this.currentFlashcardIndex - 1 + filteredVocab.length) % filteredVocab.length;
        this.displayFlashcard();
    }

    updateFlashcardProgress() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
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

    markAsDifficult() {
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        if (filteredVocab.length === 0) return;

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
        if (filteredVocab.length === 0) return;

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

        // Use the selected question count
        const shuffledQuestions = this.shuffleArray(questions);
        if (this.quizQuestionCount === 'all') {
            return shuffledQuestions;
        } else {
            return shuffledQuestions.slice(0, Math.min(this.quizQuestionCount, shuffledQuestions.length));
        }
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
        const quizContent = this.getElement('quiz-container');
        if (!quizContent) {
            console.error('Quiz container element not found');
            return;
        }

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
        const quizQuestion = this.getElement('quiz-question');
        const quizOptions = this.getElement('quiz-options');
        const quizFeedback = this.getElement('quiz-feedback');
        const nextButton = this.getElement('next-question-btn');

        if (!quizQuestion || !quizOptions || !quizFeedback || !nextButton) {
            console.error('Required quiz elements not found');
            return;
        }

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
            'chinese-english': '中文 → 🇺🇸',
            'chinese-vietnamese': '中文 → 🇻🇳',
            'chinese-pinyin': '中文 → 📝'
        };
        return indicators[type] || '❓';
    }

    checkAnswer(selectedOption) {
        const question = this.quizQuestions[this.currentQuizIndex];
        const isCorrect = selectedOption.dataset.answer === question.correctAnswer;
        const quizOptions = this.getElement('quiz-options');
        const quizFeedback = this.getElement('quiz-feedback');
        const nextButton = this.getElement('next-question-btn');

        if (!quizOptions || !quizFeedback || !nextButton) return;

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
        const quizContainer = this.getElement('quiz-container');
        if (!quizContainer) return;

        const percentage = Math.round((this.quizScore / this.quizQuestions.length) * 100);
        const scoreClass = percentage >= 70 ? 'success-message' : percentage >= 50 ? 'warning-message' : 'error-message';

        quizContainer.innerHTML = `
            <div class="text-center">
                <h2>Quiz Complete! 🎓</h2>
                <div class="${scoreClass}" style="margin: 20px 0; padding: 20px;">
                    <div style="font-size: 2rem; font-weight: bold; margin-bottom: 10px;">${percentage}%</div>
                    <div>Your score: ${this.quizScore} out of ${this.quizQuestions.length}</div>
                </div>
                <button id="restart-quiz-btn" class="btn primary mt-10">Restart Quiz</button>
                <button id="new-quiz-btn" class="btn secondary mt-10">Choose Different Quiz</button>
            </div>
        `;

        this.safeAddEventListener('restart-quiz-btn', 'click', () => this.startSelectedQuiz());
        this.safeAddEventListener('new-quiz-btn', 'click', () => this.showQuizSelection());
    }

    updateQuizProgress() {
        const progressText = this.getElement('quiz-progress-text');
        const progressBar = this.getElement('quiz-progress');

        if (!progressText || !progressBar) return;

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

    displayDifficultWords() {
        const difficultList = this.getElement('difficult-words-list');
        if (!difficultList) return;

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

        // Create a temporary vocabulary for difficult words practice
        const tempVocabulary = validWords.map(word => ({
            ...word,
            lesson: 'difficult-words' // Set a special lesson identifier
        }));

        // Store the original vocabulary and use temp vocabulary
        this.originalVocabulary = this.vocabulary; // Backup original
        this.vocabulary = tempVocabulary;
        this.currentLesson = 'difficult-words';
        this.currentFlashcardIndex = 0;
        
        this.displayFlashcard();
        this.switchTab('flashcards');
        this.showMessage(`Practicing ${validWords.length} difficult words`, 'success');
    }

    // Add method to restore original vocabulary when switching away from difficult words
    switchTab(tabName) {
        // Restore original vocabulary if we're leaving difficult words practice
        if (this.originalVocabulary && tabName !== 'flashcards') {
            this.vocabulary = this.originalVocabulary;
            this.originalVocabulary = null;
        }

        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });

        if (tabName === 'flashcards') {
            this.displayFlashcard();
        } else if (tabName === 'quiz') {
            const quizSetup = this.getElement('quiz-setup');
            const quizContainer = this.getElement('quiz-container');
            
            if (quizSetup && quizContainer) {
                quizSetup.classList.remove('hidden');
                quizContainer.classList.add('hidden');
            }
            
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

        const totalWordsEl = this.getElement('total-words');
        const masteredWordsEl = this.getElement('mastered-words');
        const difficultWordsEl = this.getElement('difficult-words');

        if (totalWordsEl) totalWordsEl.textContent = totalWords;
        if (masteredWordsEl) masteredWordsEl.textContent = masteredCount;
        if (difficultWordsEl) difficultWordsEl.textContent = difficultCount;
    }

    showLoading(show) {
        const loadingIndicator = this.getElement('loading-indicator');
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