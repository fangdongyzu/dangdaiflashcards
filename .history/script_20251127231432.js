class VocabularyApp {
    constructor() {
        this.vocabulary = [];
        this.currentBook = '';
        this.currentLesson = '';

        // Flashcard State
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        
        // Quiz State
        this.quizQuestions = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;

        // Local Storage
        this.difficultWords = JSON.parse(localStorage.getItem('difficultWords')) || [];

        this.bindEvents();
    }

    bindEvents() {
        // Book Selection
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
            if(this.currentLesson) {
                 // Filter data for the list immediately
                this.renderVocabularyList();
            }
        });

        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Flashcard Controls
        document.getElementById('flashcard').addEventListener('click', () => this.flipCard());
        document.getElementById('next-btn').addEventListener('click', () => this.nextCard());
        document.getElementById('prev-btn').addEventListener('click', () => this.prevCard());
        document.getElementById('shuffle-btn').addEventListener('click', () => this.shuffleFlashcards());
        document.getElementById('mark-difficult-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent flip
            this.toggleDifficult();
        });

        // Quiz Controls
        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retry-quiz-btn').addEventListener('click', () => this.startQuiz());
        
        // Difficult List Controls
        document.getElementById('view-difficult-btn').addEventListener('click', () => this.renderDifficultList());
        document.getElementById('clear-difficult-btn').addEventListener('click', () => {
            this.difficultWords = [];
            localStorage.setItem('difficultWords', JSON.stringify([]));
            this.renderDifficultList();
        });
    }

    async loadBookData(bookId) {
        const lessonSelect = document.getElementById('lesson-select');
        lessonSelect.innerHTML = '<option value="">Loading...</option>';
        lessonSelect.disabled = true;

        try {
            // NOTE: This assumes the JSON files are in the same directory.
            const response = await fetch(`${bookId}.`);
            if (!response.ok) throw new Error("File not found");
            const data = await response.json();
            
            // Handle structure: flattened array if keys exist, or plain array
            this.fullBookData = data; 
            this.populateLessons(data);
        } catch (error) {
            console.error('Error loading book:', error);
            lessonSelect.innerHTML = '<option value="">Error loading book</option>';
            alert("Could not load book data. Please ensure the JSON files (B1.json, etc.) are in the correct folder.");
        }
    }

    populateLessons(data) {
        const lessonSelect = document.getElementById('lesson-select');
        lessonSelect.innerHTML = '<option value="">Select Lesson</option>';
        lessonSelect.disabled = false;

        let lessons = [];
        
        if (Array.isArray(data)) {
            lessons = [...new Set(data.map(item => item.lesson))];
        } else {
            lessons = Object.keys(data);
        }

        // Sort naturally (L1, L2, L10)
        lessons.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''));
            const numB = parseInt(b.replace(/\D/g, ''));
            return numA - numB;
        });
        
        const allOpt = document.createElement('option');
        allOpt.value = 'ALL';
        allOpt.textContent = 'All Lessons';
        lessonSelect.appendChild(allOpt);

        lessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson;
            option.textContent = lesson;
            lessonSelect.appendChild(option);
        });
    }

    filterVocabulary() {
        if (this.currentLesson === 'ALL') {
            if (Array.isArray(this.fullBookData)) {
                this.vocabulary = this.fullBookData;
            } else {
                this.vocabulary = Object.values(this.fullBookData).flat();
            }
        } else {
            if (Array.isArray(this.fullBookData)) {
                this.vocabulary = this.fullBookData.filter(item => item.lesson === this.currentLesson);
            } else {
                this.vocabulary = this.fullBookData[this.currentLesson] || [];
            }
        }
    }

    updateButtonStates() {
        const disabled = !this.currentLesson;
        document.getElementById('view-list-btn').disabled = disabled;
        document.getElementById('start-flashcards-btn').disabled = disabled;
        document.getElementById('start-quiz-btn').disabled = disabled;
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(tabId).classList.remove('hidden');
        const activeBtn = document.querySelector(`button[data-tab="${tabId}"]`);
        if(activeBtn) activeBtn.classList.add('active');

        this.filterVocabulary(); 
        if (tabId === 'flashcard-content') this.startFlashcards();
        if (tabId === 'quiz-content') this.startQuiz();
        if (tabId === 'list-content') this.renderVocabularyList();
    }

    /* --- LIST VIEW --- */
    renderVocabularyList() {
        this.filterVocabulary();
        const tbody = document.getElementById('vocab-table-body');
        tbody.innerHTML = '';
        
        if (this.vocabulary.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No words found.</td></tr>';
            return;
        }

        this.vocabulary.forEach(word => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Chinese">${word.chinese}</td>
                <td data-label="Pinyin">${word.pinyin}</td>
                <td data-label="English">${word.english}</td>
                <td data-label="Type">${word.partOfSpeech || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    /* --- FLASHCARDS --- */
    startFlashcards() {
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        this.renderFlashcard();
    }

    shuffleFlashcards() {
        for (let i = this.vocabulary.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.vocabulary[i], this.vocabulary[j]] = [this.vocabulary[j], this.vocabulary[i]];
        }
        this.startFlashcards();
    }

    renderFlashcard() {
        if (this.vocabulary.length === 0) return;
        
        const word = this.vocabulary[this.currentFlashcardIndex];
        const card = document.getElementById('flashcard');
        
        card.classList.remove('flipped');
        this.isFlipped = false;

        document.getElementById('fc-chinese').textContent = word.chinese;
        document.getElementById('fc-pinyin').textContent = word.pinyin;
        document.getElementById('fc-pos').textContent = word.partOfSpeech || '';
        document.getElementById('fc-english').textContent = word.english;
        document.getElementById('fc-example').textContent = word.example || 'No example available.';

        document.getElementById('prev-btn').disabled = this.currentFlashcardIndex === 0;
        document.getElementById('next-btn').disabled = this.currentFlashcardIndex === this.vocabulary.length - 1;

        this.updateFlashcardProgress();
    }

    updateFlashcardProgress() {
        const total = this.vocabulary.length;
        const current = this.currentFlashcardIndex + 1;
        const percentage = (current / total) * 100;

        const progressBar = document.getElementById('flashcard-progress-bar');
        const progressText = document.getElementById('flashcard-progress-text');

        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current} / ${total}`;
    }

    flipCard() {
        const card = document.getElementById('flashcard');
        this.isFlipped = !this.isFlipped;
        if (this.isFlipped) {
            card.classList.add('flipped');
        } else {
            card.classList.remove('flipped');
        }
    }

    nextCard() {
        if (this.currentFlashcardIndex < this.vocabulary.length - 1) {
            this.currentFlashcardIndex++;
            this.renderFlashcard();
        }
    }

    prevCard() {
        if (this.currentFlashcardIndex > 0) {
            this.currentFlashcardIndex--;
            this.renderFlashcard();
        }
    }

    toggleDifficult() {
        const word = this.vocabulary[this.currentFlashcardIndex];
        const existsIndex = this.difficultWords.findIndex(w => w.chinese === word.chinese);
        
        if (existsIndex === -1) {
            this.difficultWords.push(word);
            alert("Added to My List!");
        } else {
            this.difficultWords.splice(existsIndex, 1);
            alert("Removed from My List.");
        }
        localStorage.setItem('difficultWords', JSON.stringify(this.difficultWords));
    }

    /* --- QUIZ --- */
    startQuiz() {
        this.quizQuestions = [...this.vocabulary];
        this.quizQuestions.sort(() => Math.random() - 0.5);
        if(this.quizQuestions.length > 20) this.quizQuestions = this.quizQuestions.slice(0, 20);

        this.currentQuizIndex = 0;
        this.quizScore = 0;

        document.querySelector('.quiz-container > .question-area').classList.remove('hidden');
        document.getElementById('quiz-options').classList.remove('hidden');
        document.getElementById('quiz-result').classList.add('hidden');
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('feedback-msg').classList.add('hidden');
        document.getElementById('quiz-options').style.pointerEvents = 'auto';

        this.renderQuestion();
    }

    renderQuestion() {
        const currentWord = this.quizQuestions[this.currentQuizIndex];
        document.getElementById('quiz-question').textContent = currentWord.chinese;

        const options = [currentWord];
        while (options.length < 4 && options.length < this.vocabulary.length) {
            const randomWord = this.vocabulary[Math.floor(Math.random() * this.vocabulary.length)];
            if (!options.includes(randomWord)) {
                options.push(randomWord);
            }
        }
        options.sort(() => Math.random() - 0.5);

        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';

        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'quiz-option';
            btn.textContent = opt.english;
            btn.onclick = () => this.checkAnswer(opt, currentWord, btn);
            optionsContainer.appendChild(btn);
        });

        this.updateQuizProgress();
    }

    updateQuizProgress() {
        const total = this.quizQuestions.length;
        const current = this.currentQuizIndex + 1;
        const percentage = (current / total) * 100;

        const progressBar = document.getElementById('quiz-progress-bar');
        const progressText = document.getElementById('quiz-progress-text');

        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `Question ${current} of ${total}`;
    }

    checkAnswer(selected, correct, element) {
        document.getElementById('quiz-options').style.pointerEvents = 'none';

        if (selected.chinese === correct.chinese) {
            element.classList.add('correct');
            this.quizScore++;
        } else {
            element.classList.add('incorrect');
            const options = document.querySelectorAll('.quiz-option');
            options.forEach(opt => {
                if (opt.textContent === correct.english) {
                    opt.classList.add('correct');
                }
            });
        }
        document.getElementById('next-question-btn').classList.remove('hidden');
    }

    nextQuestion() {
        document.getElementById('quiz-options').style.pointerEvents = 'auto';
        document.getElementById('next-question-btn').classList.add('hidden');

        this.currentQuizIndex++;
        if (this.currentQuizIndex < this.quizQuestions.length) {
            this.renderQuestion();
        } else {
            this.showQuizResults();
        }
    }

    showQuizResults() {
        document.querySelector('.quiz-container > .question-area').classList.add('hidden');
        document.getElementById('quiz-options').classList.add('hidden');
        document.getElementById('quiz-result').classList.remove('hidden');

        const total = this.quizQuestions.length;
        const percentage = Math.round((this.quizScore / total) * 100);

        document.getElementById('final-score').textContent = `${this.quizScore} / ${total} Correct`;
        document.getElementById('final-percentage').textContent = `(${percentage}%)`;
    }

    /* --- DIFFICULT LIST --- */
    renderDifficultList() {
        this.switchTab('difficult-content');
        const listEl = document.getElementById('difficult-words-list');
        listEl.innerHTML = '';
        
        if (this.difficultWords.length === 0) {
            listEl.innerHTML = '<li class="text-center" style="padding:20px; color:var(--secondary-color);">No words added yet. Use the star icon on flashcards!</li>';
            return;
        }

        this.difficultWords.forEach(w => {
            const li = document.createElement('li');
            li.style.cssText = 'background:white; margin:10px 0; padding:15px; border-radius:8px; border:1px solid #eee; box-shadow:0 2px 5px rgba(0,0,0,0.05);';
            li.innerHTML = `
                <div style="font-size:1.2rem; font-weight:bold; color:var(--primary-color);">${w.chinese}</div>
                <div style="color:#666;">${w.pinyin}</div>
                <div style="margin-top:5px;">${w.english}</div>
            `;
            listEl.appendChild(li);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VocabularyApp();
});