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
        this.quizType = 'english'; // 'english' or 'vietnamese'
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
            if (e.target.closest('.flashcard-controls')) return;
            this.flipCard();
        });

        // Use event delegation for dynamically created quiz type buttons
        document.getElementById('quiz-content').addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-type-btn')) {
                const type = e.target.dataset.type;
                this.quizType = type;
                this.generateAndStartQuiz();
            }
            
            if (e.target.id === 'cancel-quiz-btn') {
                this.displayQuizInstructions();
            }
            
            if (e.target.id === 'start-quiz-from-tab') {
                this.startQuiz();
            }
            
            if (e.target.id === 'try-again-quiz') {
                this.startQuiz();
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

        const tableBody = document.getElementById('vocabulary-table-body');
        
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
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        
        if (filteredVocab.length === 0) {
            this.showEmptyFlashcard();
            return;
        }

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

    showEmptyFlashcard() {
        const frontContent = document.getElementById('flashcard-front-content');
        const backContent = document.getElementById('flashcard-back-content');
        
        frontContent.innerHTML = `<div class="chinese-character">请选择课程</div>`;
        backContent.innerHTML = `<div class="flashcard-content">Please select a lesson and load vocabulary</div>`;
        
        this.updateFlashcardProgress();
    }

    flipCard() {
        document.getElementById('flashcard').classList.toggle('flipped');
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
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('flashcard-progress');

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

    startQuiz() {
        console.log('Starting quiz for lesson:', this.currentLesson);
        
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        console.log('Filtered vocabulary:', filteredVocab);
        
        if (filteredVocab.length === 0) {
            this.showMessage('No vocabulary found for this lesson. Please load vocabulary first.', 'error');
            return;
        }

        // Show quiz type selection
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
                <button class="btn secondary mt-10" id="cancel-quiz-btn">Cancel</button>
            </div>
        `;

        console.log('Quiz type selection displayed');
    }

    generateAndStartQuiz() {
        console.log('Generating quiz for type:', this.quizType);
        
        const filteredVocab = this.vocabulary.filter(word => word.lesson === this.currentLesson);
        this.quizQuestions = this.generateQuizQuestions(filteredVocab, this.quizType);
        console.log('Generated quiz questions:', this.quizQuestions);
        
        if (this.quizQuestions.length === 0) {
            this.showMessage(`Not enough vocabulary to generate ${this.quizType} quiz questions. Need at least 2 words.`, 'warning');
            this.showQuizTypeSelection();
            return;
        }

        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.displayQuizQuestion();
    }

    generateQuizQuestions(vocabulary, quizType) {
        const questions = [];
        
        console.log(`Generating ${quizType} quiz questions from vocabulary:`, vocabulary);
        
        // Only generate questions if we have at least 2 words for options
        if (vocabulary.length < 2) {
            console.log('Not enough words for quiz (need at least 2)');
            return questions;
        }
        
        vocabulary.forEach((word, index) => {
            console.log(`Processing word ${index}:`, word);
            
            if (quizType === 'pinyin') {
                // Pinyin question
                if (word.pinyin && word.pinyin.trim() !== '') {
                    const pinyinOptions = this.generateOptions(vocabulary, word.pinyin, 'pinyin');
                    console.log(`Pinyin options for ${word.chinese}:`, pinyinOptions);
                    
                    if (pinyinOptions.length >= 2) {
                        questions.push({
                            type: 'pinyin',
                            question: `What is the pinyin for "${word.chinese}"?`,
                            correctAnswer: word.pinyin,
                            options: pinyinOptions,
                            word: word
                        });
                    }
                }
            } else if (quizType === 'english') {
                // English meaning question
                if (word.english && word.english.trim() !== '') {
                    const englishOptions = this.generateOptions(vocabulary, word.english, 'english');
                    console.log(`English options for ${word.chinese}:`, englishOptions);
                    
                    if (englishOptions.length >= 2) {
                        questions.push({
                            type: 'meaning',
                            question: `What does "${word.chinese}" mean in English?`,
                            correctAnswer: word.english,
                            options: englishOptions,
                            word: word
                        });
                    }
                }
            } else if (quizType === 'vietnamese') {
                // Vietnamese meaning question
                if (word.vietnamese && word.vietnamese.trim() !== '') {
                    const vietnameseOptions = this.generateOptions(vocabulary, word.vietnamese, 'vietnamese');
                    console.log(`Vietnamese options for ${word.chinese}:`, vietnameseOptions);
                    
                    if (vietnameseOptions.length >= 2) {
                        questions.push({
                            type: 'vietnamese',
                            question: `What does "${word.chinese}" mean in Vietnamese?`,
                            correctAnswer: word.vietnamese,
                            options: vietnameseOptions,
                            word: word
                        });
                    }
                }
            }
        });

        const shuffledQuestions = this.shuffleArray(questions).slice(0, Math.min(10, questions.length));
        console.log('Final quiz questions:', shuffledQuestions);
        return shuffledQuestions;
    }

    generateOptions(vocabulary, correctAnswer, field) {
        const options = [correctAnswer];
        const otherWords = vocabulary.filter(w => w[field] && w[field].trim() !== '' && w[field] !== correctAnswer);
        
        console.log(`Generating ${field} options. Correct answer: ${correctAnswer}`);
        console.log('Other words available:', otherWords);
        
        // Add unique options from other words
        while (options.length < 4 && otherWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherWords.length);
            const option = otherWords[randomIndex][field];
            if (!options.includes(option)) {
                options.push(option);
                console.log(`Added option: ${option}`);
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
                console.log(`Added generic option: ${genericOption}`);
            }
        }

        const shuffledOptions = this.shuffleArray(options);
        console.log(`Final ${field} options:`, shuffledOptions);
        return shuffledOptions;
    }

    displayQuizQuestion() {
        const quizContent = document.getElementById('quiz-content');
        
        if (this.quizQuestions.length === 0) {
            quizContent.innerHTML = `
                <div class="text-center">
                    <h3>No Quiz Available</h3>
                    <p>Not enough vocabulary to generate quiz questions.</p>
                    <p>Please load a lesson with at least 2 vocabulary words.</p>
                    <button id="try-again-quiz" class="btn primary mt-10">Try Again</button>
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

        console.log('Displaying quiz question:', question);

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

        // Add event listeners for result buttons
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