class VocabularyApp {
    constructor() {
        this.vocabulary = [];
        this.currentBook = '';
        this.currentLesson = '';
        this.currentLessons = [];
        this.currentListWords = [];
        this.currentLessonVocabulary = [];
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        this.quizQuestions = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.incorrectWords = [];
        this.selectedLanguages = [];
        this.activeStrokeWord = null;
        this.activeStrokeCharacter = '';
        this.activeStrokeCharacters = [];
        this.activeStrokeCharacterIndex = 0;
        this.strokeWriter = null;
        this.strokeActivityMode = 'idle';
        this.strokeRenderToken = 0;
        this.strokeResizeTimer = null;
        this.lastStrokeViewportWidth = window.innerWidth;
        this.strokeReturnView = '';
        this.strokeReturnScrollY = 0;
        this.strokeReturnAnchor = null;
        this.strokeWordList = [];
        this.strokeWordIndex = 0;
        this.controlPanelScrollY = 0;
        this.controlPanelReturnAnchor = null;
        this.pendingConfirmation = null;
        this.toastTimer = null;
        this.gameType = '';
        this.gameWords = [];
        this.gameSelection = { chinese: null, meaning: null };
        this.memoryOpenCards = [];
        this.memoryMatchedPairs = 0;
        this.listeningIndex = 0;
        this.listeningScore = 0;
        this.bookLoadRequestId = 0;

        this.storageKeys = {
            hardWords: 'dangdai-hard-words-v1',
            hardCharacters: 'dangdai-hard-characters-v1'
        };
        this.hardWords = this.readStorage(this.storageKeys.hardWords, []);
        this.hardCharacters = this.readStorage(this.storageKeys.hardCharacters, []);

        this.bindEvents();
        this.setupLanguageSelection();
        this.updateHardWordControls();
        this.renderHardCharacterControls();
    }

    bindEvents() {
        document.getElementById('book-select').addEventListener('change', (event) => {
            this.bookLoadRequestId += 1;
            this.currentBook = event.target.value;
            this.currentLesson = '';
            this.currentLessons = [];
            this.updateButtonStates();
            if (this.currentBook) this.loadBookData(this.currentBook);
            else {
                this.vocabulary = [];
                this.disableControls();
                this.updateHardWordControls();
            }
        });

        document.getElementById('lesson-select').addEventListener('change', (event) => {
            if (!event.target.matches('input[name="lesson"]')) return;
            this.syncSelectedLessons();
        });
        document.getElementById('select-all-lessons-btn').addEventListener('click', () => {
            document.querySelectorAll('#lesson-select input[name="lesson"]').forEach((input) => {
                input.checked = true;
            });
            this.syncSelectedLessons();
        });
        document.getElementById('clear-lessons-btn').addEventListener('click', () => {
            document.querySelectorAll('#lesson-select input[name="lesson"]').forEach((input) => {
                input.checked = false;
            });
            this.syncSelectedLessons();
        });

        document.getElementById('view-list-btn').addEventListener('click', () => this.showVocabularyList());
        document.getElementById('start-flashcards-btn').addEventListener('click', () => this.startFlashcards());
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.startQuiz());
        document.getElementById('view-hard-words-btn').addEventListener('click', () => this.showHardWords());
        document.getElementById('practice-hard-words-btn').addEventListener('click', () => this.practiceHardWords());
        document.getElementById('practice-all-words-btn').addEventListener('click', () => this.practiceAllWords());
        document.getElementById('delete-hard-words-btn').addEventListener('click', () => this.deleteAllHardWords());
        document.getElementById('practice-hard-characters-btn').addEventListener('click', () => this.practiceHardCharacters());
        document.getElementById('delete-hard-characters-btn').addEventListener('click', () => this.deleteAllHardCharacters());
        document.getElementById('start-matching-game-btn').addEventListener('click', () => this.startGame('matching'));
        document.getElementById('start-memory-game-btn').addEventListener('click', () => this.startGame('memory'));
        document.getElementById('start-listening-game-btn').addEventListener('click', () => this.startGame('listening'));
        document.getElementById('new-game-round-btn').addEventListener('click', () => this.startGame(this.gameType));

        document.querySelectorAll('.exit-btn').forEach((button) => {
            button.addEventListener('click', () => this.exitStudyMode());
        });

        document.getElementById('fc-shuffle-btn').addEventListener('click', () => this.shuffleFlashcards());
        document.getElementById('quiz-shuffle-btn').addEventListener('click', () => this.shuffleQuiz());

        const card = document.getElementById('flashcard');
        card.addEventListener('click', () => {
            if (window.getSelection().toString().length === 0) this.flipFlashcard();
        });
        card.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            this.flipFlashcard();
        });

        document.getElementById('next-btn').addEventListener('click', (event) => {
            event.stopPropagation();
            this.nextFlashcard();
        });
        document.getElementById('prev-btn').addEventListener('click', (event) => {
            event.stopPropagation();
            this.prevFlashcard();
        });

        document.getElementById('fc-pronounce-btn').addEventListener('click', () => {
            this.pronounce(this.getCurrentFlashcardWord());
        });
        document.getElementById('fc-hard-word-btn').addEventListener('click', () => {
            const word = this.getCurrentFlashcardWord();
            if (word) {
                this.toggleHardWord(word);
                this.updateFlashcardActions();
            }
        });
        document.getElementById('fc-strokes-btn').addEventListener('click', () => {
            this.openStrokeStudy(this.getCurrentFlashcardWord());
        });

        document.getElementById('quiz-pronounce-btn').addEventListener('click', () => {
            this.pronounce(this.quizQuestions[this.currentQuizIndex]);
        });
        document.getElementById('next-question-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retry-quiz-btn').addEventListener('click', () => this.startQuiz());

        document.getElementById('animate-strokes-btn').addEventListener('click', () => this.animateStrokes());
        document.getElementById('practice-strokes-btn').addEventListener('click', () => this.beginStrokePractice());
        document.getElementById('reset-strokes-btn').addEventListener('click', () => this.resetStrokePractice());
        document.getElementById('stroke-pronounce-btn').addEventListener('click', () => {
            this.pronounceText(this.activeStrokeCharacter);
        });
        document.getElementById('stroke-hard-character-btn').addEventListener('click', () => {
            this.toggleHardCharacter(this.activeStrokeCharacter);
        });
        document.getElementById('stroke-back-btn').addEventListener('click', () => {
            this.returnFromStrokeStudy();
        });
        document.getElementById('stroke-prev-word-btn').addEventListener('click', () => {
            this.navigateStrokeWord(-1);
        });
        document.getElementById('stroke-next-word-btn').addEventListener('click', () => {
            this.navigateStrokeWord(1);
        });
        document.getElementById('stroke-prev-character-btn').addEventListener('click', () => {
            this.navigateStrokeCharacter(-1);
        });
        document.getElementById('stroke-next-character-btn').addEventListener('click', () => {
            this.navigateStrokeCharacter(1);
        });
        document.getElementById('confirmation-cancel-btn').addEventListener('click', () => this.closeConfirmation());
        document.getElementById('confirmation-submit-btn').addEventListener('click', () => this.submitConfirmation());
        document.getElementById('confirmation-input').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') this.submitConfirmation();
            if (event.key === 'Escape') this.closeConfirmation();
        });

        this.bindKeyboardNavigation();
        this.bindSwipeNavigation();
        window.addEventListener('resize', () => {
            const widthChanged = Math.abs(window.innerWidth - this.lastStrokeViewportWidth) >= 20;
            this.lastStrokeViewportWidth = window.innerWidth;
            if (!widthChanged) return;
            clearTimeout(this.strokeResizeTimer);
            this.strokeResizeTimer = setTimeout(() => {
                const strokeView = document.getElementById('stroke-view');
                if (!strokeView.classList.contains('hidden') && this.activeStrokeCharacter) {
                    if (this.strokeActivityMode === 'idle') this.renderStrokeCharacter();
                    else this.resetStrokePractice();
                }
            }, 180);
        });
    }

    bindKeyboardNavigation() {
        let pendingDirection = '';
        let pendingTimer = null;
        let lastPressAt = 0;

        const moveCard = (direction) => {
            if (document.getElementById('flashcard-view').classList.contains('hidden')) return;
            if (direction === 'next') this.nextFlashcard();
            if (direction === 'previous') this.prevFlashcard();
        };

        document.addEventListener('keydown', (event) => {
            if (document.getElementById('flashcard-view').classList.contains('hidden')) return;
            if (event.repeat) return;

            const target = event.target;
            const isTypingControl = target.matches?.('input, select, textarea, button');
            if (isTypingControl && target.id !== 'flashcard') return;

            const nextKeys = ['ArrowRight', 'PageDown', ' ', 'Enter', 'MediaTrackNext'];
            const previousKeys = ['ArrowLeft', 'PageUp', 'Backspace', 'MediaTrackPrevious'];
            const direction = nextKeys.includes(event.key)
                ? 'next'
                : previousKeys.includes(event.key) ? 'previous' : '';

            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                this.flipFlashcard();
                return;
            }

            if (!direction) return;
            event.preventDefault();
            const now = Date.now();

            if (pendingDirection === direction && now - lastPressAt <= 360) {
                clearTimeout(pendingTimer);
                pendingTimer = null;
                pendingDirection = '';
                lastPressAt = 0;
                this.flipFlashcard();
                return;
            }

            if (pendingTimer) {
                clearTimeout(pendingTimer);
                moveCard(pendingDirection);
            }

            pendingDirection = direction;
            lastPressAt = now;
            pendingTimer = setTimeout(() => {
                moveCard(pendingDirection);
                pendingDirection = '';
                pendingTimer = null;
                lastPressAt = 0;
            }, 320);
        });
    }

    bindSwipeNavigation() {
        const container = document.querySelector('.flashcard-container');
        let touchStartX = 0;
        let touchStartY = 0;

        container.addEventListener('touchstart', (event) => {
            touchStartX = event.changedTouches[0].screenX;
            touchStartY = event.changedTouches[0].screenY;
        }, { passive: true });

        container.addEventListener('touchend', (event) => {
            const distanceX = event.changedTouches[0].screenX - touchStartX;
            const distanceY = event.changedTouches[0].screenY - touchStartY;
            if (Math.abs(distanceX) < 55 || Math.abs(distanceX) <= Math.abs(distanceY)) return;
            if (distanceX < 0) this.nextFlashcard();
            if (distanceX > 0) this.prevFlashcard();
        }, { passive: true });

        const strokeView = document.getElementById('stroke-view');
        let strokeTouchStartX = null;
        let strokeTouchStartY = null;

        strokeView.addEventListener('touchstart', (event) => {
            if (event.target.closest('#stroke-canvas, button, .character-selector')) {
                strokeTouchStartX = null;
                strokeTouchStartY = null;
                return;
            }
            strokeTouchStartX = event.changedTouches[0].screenX;
            strokeTouchStartY = event.changedTouches[0].screenY;
        }, { passive: true });

        strokeView.addEventListener('touchend', (event) => {
            if (strokeTouchStartX === null) return;
            const distanceX = event.changedTouches[0].screenX - strokeTouchStartX;
            const distanceY = event.changedTouches[0].screenY - strokeTouchStartY;
            strokeTouchStartX = null;
            strokeTouchStartY = null;
            if (Math.abs(distanceX) < 55 || Math.abs(distanceX) <= Math.abs(distanceY)) return;
            this.navigateStrokeCharacter(distanceX < 0 ? 1 : -1);
        }, { passive: true });
    }

    setupLanguageSelection() {
        document.querySelectorAll('input[name="language"]').forEach((checkbox) => {
            checkbox.checked = checkbox.value === 'english';
            checkbox.addEventListener('change', () => this.updateSelectedLanguages());
        });
        this.updateSelectedLanguages();
    }

    updateSelectedLanguages() {
        this.selectedLanguages = Array.from(
            document.querySelectorAll('input[name="language"]:checked'),
            (checkbox) => checkbox.value
        );
    }

    getMeaningLanguages(word) {
        const selected = this.selectedLanguages.filter((language) => word[language]);
        if (selected.length) return selected;
        if (word.english) return ['english'];
        return ['vietnamese', 'thai', 'burmese', 'japanese', 'korean', 'spanish', 'indonesian']
            .filter((language) => word[language])
            .slice(0, 1);
    }

    async loadBookData(bookId) {
        const requestId = ++this.bookLoadRequestId;
        const filename = `${bookId}.csv`;
        this.showLessonLoadingState(bookId);
        try {
            const response = await fetch(filename);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            if (requestId !== this.bookLoadRequestId || bookId !== this.currentBook) return;
            this.parseCSV(text, bookId);
        } catch (error) {
            if (requestId !== this.bookLoadRequestId) return;
            console.error('Error loading file:', error);
            this.disableControls('Could not load lessons');
            this.showToast(`Could not load ${filename}. Start the included local server and try again.`, true);
        }
    }

    showLessonLoadingState(bookId) {
        const lessonContainer = document.getElementById('lesson-select');
        lessonContainer.innerHTML =
            `<p class="lesson-placeholder loading-placeholder"><span class="loading-spinner" aria-hidden="true"></span>Loading ${this.escapeHtml(bookId.replace('B', 'Book '))}…</p>`;
        lessonContainer.classList.add('disabled');
        lessonContainer.setAttribute('aria-busy', 'true');
        lessonContainer.setAttribute('aria-disabled', 'true');
        document.getElementById('lesson-selection-tools').classList.add('hidden');
    }

    parseCSV(text, bookId = this.currentBook) {
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
        if (lines.length < 2) return;

        const separator = lines[0].includes('\t') ? '\t' : ',';
        const headers = this.parseCSVLine(lines[0], separator).map((header) => header.trim());
        const keyMap = {
            '課-序號': 'lessonCode',
            '序號': 'sequence',
            '生詞': 'chinese',
            '漢拼': 'pinyin',
            '詞類': 'partOfSpeech',
            '英譯': 'english',
            '越譯': 'vietnamese',
            '泰譯': 'thai',
            '緬譯': 'burmese',
            '日譯': 'japanese',
            '韓譯': 'korean',
            '西譯': 'spanish',
            '印尼譯': 'indonesian',
            '冊': 'volume'
        };

        const parsedData = [];
        for (let index = 1; index < lines.length; index += 1) {
            const values = this.parseCSVLine(lines[index], separator);
            if (values.length < headers.length) continue;
            const entry = { bookId };

            headers.forEach((header, valueIndex) => {
                const mappedKey = keyMap[header];
                if (mappedKey) entry[mappedKey] = (values[valueIndex] || '').trim();
            });

            if (entry.chinese && entry.lessonCode) parsedData.push(entry);
        }

        this.vocabulary = parsedData;
        this.updateLanguageAvailability();
        this.populateLessonOptions();
        this.updateHardWordControls();
    }

    updateLanguageAvailability() {
        [
            { key: 'spanish', label: 'Spanish' },
            { key: 'indonesian', label: 'Bahasa Indonesia' }
        ].forEach(({ key, label }) => {
            const input = document.querySelector(`input[name="language"][value="${key}"]`);
            const isAvailable = this.vocabulary.some((word) => Boolean(word[key]));
            input.disabled = !isAvailable;
            input.closest('.checkbox-label').title =
                isAvailable ? `Show ${label} translations` : `${label} translations are not available for this book`;
            if (!isAvailable) input.checked = false;
        });
        this.updateSelectedLanguages();
    }

    parseCSVLine(text, separator) {
        const pattern = new RegExp(
            "(\\" + separator + "|\\r?\\n|\\r|^)(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\"\\" + separator + "\\r\\n]*))",
            'gi'
        );
        const result = [];
        let matches;
        while ((matches = pattern.exec(text))) {
            if (matches[1].length && matches[1] !== separator) break;
            result.push(matches[2] ? matches[2].replace(/""/g, '"') : matches[3]);
        }
        if (result.length > 0 && result[0] === undefined) result.shift();
        return result;
    }

    populateLessonOptions() {
        const lessonContainer = document.getElementById('lesson-select');
        lessonContainer.innerHTML = '';
        lessonContainer.classList.remove('disabled');
        lessonContainer.setAttribute('aria-busy', 'false');
        lessonContainer.setAttribute('aria-disabled', 'false');
        document.getElementById('lesson-selection-tools').classList.remove('hidden');

        const lessons = [...new Set(this.vocabulary.map((word) => word.lessonCode))];
        lessons.sort((a, b) => {
            const partsA = a.split('-').map(Number);
            const partsB = b.split('-').map(Number);
            return partsA[0] - partsB[0] || partsA[1] - partsB[1];
        });

        lessons.forEach((lesson) => {
            const label = document.createElement('label');
            label.className = 'lesson-checkbox-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'lesson';
            checkbox.value = lesson;

            const text = document.createElement('span');
            text.textContent = `Lesson ${lesson}`;

            label.append(checkbox, text);
            lessonContainer.appendChild(label);
        });
        this.syncSelectedLessons();
    }

    syncSelectedLessons() {
        this.currentLessons = Array.from(
            document.querySelectorAll('#lesson-select input[name="lesson"]:checked')
        ).map((input) => input.value);
        this.currentLesson = this.currentLessons[0] || '';
        this.updateButtonStates();
        this.updateSelectionSummary();
    }

    updateSelectionSummary() {
        const summary = document.getElementById('selection-summary');
        const lessonInputs = Array.from(
            document.querySelectorAll('#lesson-select input[name="lesson"]')
        );
        const lessonCount = this.currentLessons.length;
        const wordCount = this.getLessonVocabulary().length;
        summary.textContent = lessonCount
            ? `${lessonCount} lesson${lessonCount === 1 ? '' : 's'} · ${wordCount} word${wordCount === 1 ? '' : 's'}`
            : 'No lessons selected';
        document.getElementById('select-all-lessons-btn').disabled =
            lessonInputs.length === 0 || lessonCount === lessonInputs.length;
        document.getElementById('clear-lessons-btn').disabled = lessonCount === 0;
    }

    updateButtonStates() {
        const hasLesson = this.currentLessons.length > 0;
        document.getElementById('view-list-btn').disabled = !hasLesson;
        document.getElementById('start-flashcards-btn').disabled = !hasLesson;
        document.getElementById('start-quiz-btn').disabled = !hasLesson;
        document.getElementById('start-matching-game-btn').disabled = !hasLesson;
        document.getElementById('start-memory-game-btn').disabled = !hasLesson;
        document.getElementById('start-listening-game-btn').disabled = !hasLesson;
        this.updateHardWordControls();
    }

    disableControls(message = 'Select a book first') {
        const lessonContainer = document.getElementById('lesson-select');
        lessonContainer.innerHTML = `<p class="lesson-placeholder">${this.escapeHtml(message)}</p>`;
        lessonContainer.classList.add('disabled');
        lessonContainer.setAttribute('aria-busy', 'false');
        lessonContainer.setAttribute('aria-disabled', 'true');
        document.getElementById('lesson-selection-tools').classList.add('hidden');
        document.getElementById('view-list-btn').disabled = true;
        document.getElementById('start-flashcards-btn').disabled = true;
        document.getElementById('start-quiz-btn').disabled = true;
        document.getElementById('start-matching-game-btn').disabled = true;
        document.getElementById('start-memory-game-btn').disabled = true;
        document.getElementById('start-listening-game-btn').disabled = true;
    }

    getLessonVocabulary() {
        return this.vocabulary.filter((word) => this.currentLessons.includes(word.lessonCode));
    }

    getSelectedLessonLabel() {
        return this.currentLessons.join(', ');
    }

    showOnlyStudyView(viewId) {
        ['list-view', 'flashcard-view', 'quiz-view', 'stroke-view', 'game-view'].forEach((id) => {
            document.getElementById(id).classList.toggle('hidden', id !== viewId);
        });
    }

    toggleControlPanel(show) {
        const panel = document.getElementById('control-panel');
        const studyArea = document.getElementById('study-area');
        const panelWasVisible = !panel.classList.contains('hidden');

        if (!show && panelWasVisible) {
            this.controlPanelScrollY = window.scrollY;
            this.controlPanelReturnAnchor =
                document.activeElement?.closest('button, select, input') || null;
        }

        document.body.classList.toggle('study-mode', !show);
        panel.classList.toggle('hidden', !show);
        studyArea.classList.toggle('hidden', show);

        if (show) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (this.controlPanelReturnAnchor?.isConnected) {
                    this.controlPanelReturnAnchor.scrollIntoView({ block: 'center' });
                    this.controlPanelReturnAnchor.focus({ preventScroll: true });
                } else {
                    window.scrollTo(0, this.controlPanelScrollY);
                }
            }));
        }
    }

    exitStudyMode() {
        this.toggleControlPanel(true);
        document.body.classList.remove('scrolling-mode');
        this.showOnlyStudyView('');
        if (this.strokeWriter) this.strokeWriter.cancelQuiz();
    }

    showVocabularyList() {
        const words = this.getLessonVocabulary();
        if (!words.length) return;
        const lessonWord = this.currentLessons.length === 1 ? 'Lesson' : 'Lessons';
        this.showWordList(words, `Vocabulary List — ${lessonWord} ${this.getSelectedLessonLabel()}`);
    }

    showHardWords() {
        if (!this.hardWords.length) return;
        this.showWordList(this.hardWords, 'My Hard Words');
    }

    showWordList(words, title) {
        this.currentListWords = [...words];
        this.toggleControlPanel(false);
        document.body.classList.add('scrolling-mode');
        this.showOnlyStudyView('list-view');
        document.getElementById('list-title').textContent = title;
        requestAnimationFrame(() => window.scrollTo(0, 0));

        const tbody = document.getElementById('vocab-table-body');
        tbody.innerHTML = '';
        words.forEach((word) => tbody.appendChild(this.createVocabularyRow(word)));
    }

    createVocabularyRow(word) {
        const row = document.createElement('tr');
        row.dataset.wordKey = this.getWordKey(word);
        const translations = [];
        const languageLabels = {
            english: '',
            vietnamese: 'VN: ',
            thai: 'TH: ',
            burmese: 'MM: ',
            japanese: 'JP: ',
            korean: 'KR: ',
            spanish: 'ES: ',
            indonesian: 'ID: '
        };

        this.getMeaningLanguages(word).forEach((language) => {
            if (word[language]) translations.push(`${languageLabels[language]}${word[language]}`);
        });

        const chineseCell = document.createElement('td');
        chineseCell.className = 'chinese-cell';
        chineseCell.textContent = word.chinese;

        const pinyinCell = document.createElement('td');
        pinyinCell.className = 'pinyin-cell';
        pinyinCell.textContent = word.pinyin;

        const translationsCell = document.createElement('td');
        translationsCell.textContent = translations.join(' | ');

        const actionsCell = document.createElement('td');
        actionsCell.className = 'table-actions';
        const pronounceButton = this.makeMiniButton('🔊', 'Pronounce', () => this.pronounce(word));
        const strokeButton = this.makeMiniButton('✍', 'Study strokes', () => this.openStrokeStudy(word));
        const hardButton = this.makeMiniButton(
            this.isHardWord(word) ? '★' : '☆',
            this.isHardWord(word) ? 'Remove hard word' : 'Add hard word',
            () => {
                this.toggleHardWord(word);
                hardButton.textContent = this.isHardWord(word) ? '★' : '☆';
                hardButton.title = this.isHardWord(word) ? 'Remove hard word' : 'Add hard word';
                hardButton.setAttribute(
                    'aria-label',
                    this.isHardWord(word) ? 'Remove hard word' : 'Add hard word'
                );
                if (document.getElementById('list-title').textContent === 'My Hard Words' && !this.isHardWord(word)) {
                    row.remove();
                    if (!this.hardWords.length) this.exitStudyMode();
                }
            }
        );
        actionsCell.append(pronounceButton, strokeButton, hardButton);
        row.append(chineseCell, pinyinCell, translationsCell, actionsCell);
        return row;
    }

    makeMiniButton(label, title, handler) {
        const button = document.createElement('button');
        button.className = 'mini-action-btn';
        button.type = 'button';
        button.textContent = label;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.addEventListener('click', handler);
        return button;
    }

    startFlashcards() {
        const words = this.getLessonVocabulary();
        if (!words.length) return;
        const lessonWord = this.currentLessons.length === 1 ? 'Lesson' : 'Lessons';
        this.startFlashcardsWithWords(words, `${lessonWord} ${this.getSelectedLessonLabel()}`);
    }

    practiceHardWords() {
        if (!this.hardWords.length) return;
        this.startFlashcardsWithWords(this.hardWords, 'Hard Words');
    }

    practiceAllWords() {
        const words = this.getLessonVocabulary();
        if (!words.length) return;
        const lessonWord = this.currentLessons.length === 1 ? 'Lesson' : 'Lessons';
        this.startFlashcardsWithWords(
            words,
            `All Words — ${lessonWord} ${this.getSelectedLessonLabel()}`
        );
    }

    startFlashcardsWithWords(words, title) {
        this.currentLessonVocabulary = [...words];
        this.currentFlashcardIndex = 0;
        this.isFlipped = false;
        this.toggleControlPanel(false);
        document.body.classList.remove('scrolling-mode');
        this.showOnlyStudyView('flashcard-view');
        document.getElementById('fc-lesson-display').textContent = title;
        this.renderFlashcard();
    }

    shuffleFlashcards() {
        if (!this.currentLessonVocabulary.length) return;
        for (let index = this.currentLessonVocabulary.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [this.currentLessonVocabulary[index], this.currentLessonVocabulary[randomIndex]] =
                [this.currentLessonVocabulary[randomIndex], this.currentLessonVocabulary[index]];
        }
        this.currentFlashcardIndex = 0;
        this.renderFlashcard();
    }

    getMultilingualHtml(word) {
        const meanings = this.getMeaningLanguages(word)
            .map((language) => `<div class="meaning-item">${this.escapeHtml(word[language])}</div>`);
        return `<div class="meaning-grid">${meanings.join('')}</div>`;
    }

    renderFlashcard() {
        const word = this.getCurrentFlashcardWord();
        if (!word) return;

        const mode = document.getElementById('flashcard-mode').value;
        const chinese = this.escapeHtml(word.chinese);
        const pinyin = this.escapeHtml(word.pinyin);
        let frontHtml = '';
        let backHtml = '';

        if (mode === 'chinese-meaning') {
            frontHtml = `<div class="chinese-text">${chinese}</div>`;
            backHtml = `<div class="pinyin-text">${pinyin}</div>${this.getMultilingualHtml(word)}`;
        } else if (mode === 'meaning-chinese') {
            frontHtml = this.getMultilingualHtml(word);
            backHtml = `<div class="chinese-text">${chinese}</div><div class="pinyin-text">${pinyin}</div>`;
        } else {
            frontHtml = `<div class="pinyin-text prominent-pinyin">${pinyin}</div>`;
            backHtml = `<div class="chinese-text">${chinese}</div>`;
        }

        document.getElementById('card-front-content').innerHTML = frontHtml;
        document.getElementById('card-back-content').innerHTML = backHtml;
        document.getElementById('flashcard').classList.remove('flipped');
        document.getElementById('flashcard').setAttribute('aria-pressed', 'false');
        document.getElementById('flashcard').setAttribute(
            'aria-label',
            'Flip flashcard to reveal the answer'
        );
        document.getElementById('flip-hint').textContent = 'Tap the card to reveal the answer.';
        this.isFlipped = false;
        this.updateFlashcardProgress();
        this.updateFlashcardActions();
    }

    getCurrentFlashcardWord() {
        return this.currentLessonVocabulary[this.currentFlashcardIndex] || null;
    }

    updateFlashcardActions() {
        const word = this.getCurrentFlashcardWord();
        if (!word) return;
        const hardButton = document.getElementById('fc-hard-word-btn');
        const isHard = this.isHardWord(word);
        hardButton.textContent = isHard ? '★ Hard Word' : '☆ Hard Word';
        hardButton.classList.toggle('is-hard', isHard);
        document.getElementById('fc-strokes-btn').disabled = this.getHanCharacters(word.chinese).length === 0;
    }

    flipFlashcard() {
        this.isFlipped = !this.isFlipped;
        const card = document.getElementById('flashcard');
        card.classList.toggle('flipped', this.isFlipped);
        card.setAttribute('aria-pressed', String(this.isFlipped));
        card.setAttribute(
            'aria-label',
            this.isFlipped
                ? 'Flip flashcard to show the question'
                : 'Flip flashcard to reveal the answer'
        );
        document.getElementById('flip-hint').textContent =
            this.isFlipped ? 'Tap the card to return to the question.' : 'Tap the card to reveal the answer.';
    }

    nextFlashcard() {
        if (this.currentFlashcardIndex < this.currentLessonVocabulary.length - 1) {
            this.currentFlashcardIndex += 1;
            this.renderFlashcard();
        }
    }

    prevFlashcard() {
        if (this.currentFlashcardIndex > 0) {
            this.currentFlashcardIndex -= 1;
            this.renderFlashcard();
        }
    }

    updateFlashcardProgress() {
        const current = this.currentFlashcardIndex + 1;
        const total = this.currentLessonVocabulary.length;
        document.getElementById('flashcard-progress').style.width = `${(current / total) * 100}%`;
        document.getElementById('fc-progress').textContent = `${current} / ${total}`;
    }

    startQuiz() {
        const words = this.getLessonVocabulary();
        if (!words.length) return;

        this.quizQuestions = [...words];
        this.incorrectWords = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.quizMode = document.getElementById('quiz-mode').value;

        this.toggleControlPanel(false);
        document.body.classList.remove('scrolling-mode');
        this.showOnlyStudyView('quiz-view');
        const lessonWord = this.currentLessons.length === 1 ? 'Lesson' : 'Lessons';
        document.getElementById('quiz-lesson-display').textContent =
            `${lessonWord} ${this.getSelectedLessonLabel()}`;
        document.getElementById('quiz-score').textContent = '0';
        this.resetQuizLayout();
        this.renderQuestion();
    }

    resetQuizLayout() {
        document.getElementById('quiz-result').classList.add('hidden');
        document.getElementById('quiz-feedback').innerHTML = '';
        document.getElementById('quiz-feedback').className = 'feedback';
        document.getElementById('next-question-btn').classList.add('hidden');
        document.querySelector('.quiz-container > .question-area').style.display = 'block';
        document.querySelector('.quiz-container > .options-grid').style.display = 'grid';
    }

    shuffleQuiz() {
        if (!this.quizQuestions.length) return;
        this.quizQuestions.sort(() => Math.random() - 0.5);
        this.incorrectWords = [];
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        document.getElementById('quiz-score').textContent = '0';
        this.resetQuizLayout();
        this.renderQuestion();
    }

    formatAllMeanings(word) {
        const meanings = this.getMeaningLanguages(word)
            .map((language) => this.escapeHtml(word[language]));
        return `<div class="quiz-meaning">${meanings.join(' | ')}</div>`;
    }

    renderQuestion() {
        const question = this.quizQuestions[this.currentQuizIndex];
        const questionElement = document.getElementById('quiz-question');
        const optionsElement = document.getElementById('quiz-options');
        optionsElement.innerHTML = '';
        document.getElementById('quiz-feedback').innerHTML = '';
        document.getElementById('quiz-feedback').className = 'feedback';
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('quiz-progress').style.width =
            `${((this.currentQuizIndex + 1) / this.quizQuestions.length) * 100}%`;
        document.getElementById('quiz-question-count').textContent =
            `Question ${this.currentQuizIndex + 1} of ${this.quizQuestions.length}`;

        let answerType;
        if (this.quizMode === 'chinese-meaning') {
            questionElement.innerHTML = `<span class="chinese-text quiz-chinese">${this.escapeHtml(question.chinese)}</span>`;
            answerType = 'meanings';
        } else if (this.quizMode === 'meaning-chinese') {
            questionElement.innerHTML = this.formatAllMeanings(question);
            answerType = 'chinese';
        } else if (this.quizMode === 'chinese-pinyin') {
            questionElement.innerHTML = `<span class="chinese-text quiz-chinese">${this.escapeHtml(question.chinese)}</span>`;
            answerType = 'pinyin';
        } else {
            questionElement.innerHTML = `<span class="pinyin-text quiz-pinyin">${this.escapeHtml(question.pinyin)}</span>`;
            answerType = 'chinese';
        }

        const options = [question];
        const usedAnswers = new Set([this.getQuizAnswerValue(question, answerType)]);
        const pool = this.shuffleArray(this.quizQuestions.filter((word) => word !== question))
            .filter((word) => {
                const value = this.getQuizAnswerValue(word, answerType);
                if (!value || usedAnswers.has(value)) return false;
                usedAnswers.add(value);
                return true;
            });
        while (options.length < 4 && pool.length) {
            options.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        }
        options.sort(() => Math.random() - 0.5);

        options.forEach((word) => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            if (answerType === 'meanings') button.innerHTML = this.formatAllMeanings(word);
            else button.textContent = answerType === 'chinese' ? word.chinese : word.pinyin;
            button.addEventListener('click', () => this.handleAnswer(word === question, button, word));
            optionsElement.appendChild(button);
        });
    }

    getQuizAnswerValue(word, answerType) {
        if (answerType === 'meanings') {
            return this.getMeaningLanguages(word).map((language) => word[language]).join(' | ');
        }
        return answerType === 'chinese' ? word.chinese : word.pinyin;
    }

    handleAnswer(isCorrect, selectedButton) {
        if (!document.getElementById('next-question-btn').classList.contains('hidden')) return;
        const question = this.quizQuestions[this.currentQuizIndex];
        const options = document.querySelectorAll('.quiz-option');
        options.forEach((option) => { option.disabled = true; });

        if (isCorrect) {
            this.quizScore += 1;
            selectedButton.classList.add('correct');
            document.getElementById('quiz-score').textContent = String(this.quizScore);
            document.getElementById('quiz-feedback').textContent = '✓ Correct';
            document.getElementById('quiz-feedback').className = 'feedback correct-feedback';
        } else {
            this.incorrectWords.push(question);
            selectedButton.classList.add('incorrect');
            const correctAnswer = this.getCorrectAnswerText(question);
            document.getElementById('quiz-feedback').textContent =
                `Not quite — correct answer: ${correctAnswer}`;
            document.getElementById('quiz-feedback').className = 'feedback incorrect-feedback';
            options.forEach((option) => {
                const optionText = option.textContent.trim();
                if (optionText === correctAnswer) option.classList.add('correct');
            });
        }

        if (this.currentQuizIndex < this.quizQuestions.length - 1) {
            document.getElementById('next-question-btn').classList.remove('hidden');
        } else {
            setTimeout(() => this.showQuizResults(), 700);
        }
    }

    getCorrectAnswerText(word) {
        if (this.quizMode === 'chinese-meaning') {
            return this.getMeaningLanguages(word).map((language) => word[language]).join(' | ');
        }
        if (this.quizMode === 'chinese-pinyin') return word.pinyin;
        return word.chinese;
    }

    nextQuestion() {
        this.currentQuizIndex += 1;
        if (this.currentQuizIndex < this.quizQuestions.length) this.renderQuestion();
        else this.showQuizResults();
    }

    showQuizResults() {
        document.querySelector('.quiz-container > .question-area').style.display = 'none';
        document.querySelector('.quiz-container > .options-grid').style.display = 'none';
        document.getElementById('next-question-btn').classList.add('hidden');
        document.getElementById('quiz-result').classList.remove('hidden');

        const percentage = Math.round((this.quizScore / this.quizQuestions.length) * 100);
        document.getElementById('final-score').innerHTML =
            `${this.quizScore} / ${this.quizQuestions.length}<br><small>${percentage}% Correct</small>`;

        const wrongContainer = document.getElementById('wrong-answers-container');
        const wrongList = document.getElementById('wrong-answers-list');
        wrongList.innerHTML = '';
        wrongContainer.classList.toggle('hidden', this.incorrectWords.length === 0);
        wrongContainer.style.display = this.incorrectWords.length ? 'block' : 'none';

        this.incorrectWords.forEach((word) => {
            const item = document.createElement('div');
            item.className = 'wrong-word-item';

            const top = document.createElement('div');
            top.className = 'wrong-word-top';
            const chinese = document.createElement('strong');
            chinese.textContent = word.chinese;
            const pinyin = document.createElement('span');
            pinyin.textContent = word.pinyin;
            top.append(chinese, pinyin);

            const meanings = document.createElement('div');
            meanings.className = 'wrong-word-meanings';
            meanings.textContent = this.getMeaningLanguages(word)
                .map((language) => word[language])
                .join(', ');

            const actions = document.createElement('div');
            actions.className = 'wrong-word-actions';
            const hardWordButton = this.makeMiniButton(
                this.isHardWord(word) ? '★' : '☆',
                'Add or remove hard word',
                (event) => {
                    this.toggleHardWord(word);
                    event.currentTarget.textContent = this.isHardWord(word) ? '★' : '☆';
                }
            );
            actions.append(
                this.makeMiniButton('🔊', 'Pronounce', () => this.pronounce(word)),
                hardWordButton
            );

            item.append(top, meanings, actions);
            wrongList.appendChild(item);
        });
    }

    shuffleArray(items) {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
        }
        return shuffled;
    }

    getGameMeaning(word) {
        return this.getMeaningLanguages(word)
            .map((language) => word[language])
            .filter(Boolean)
            .join(' / ');
    }

    startGame(type) {
        const vocabulary = this.getLessonVocabulary();
        if (vocabulary.length < 2) {
            this.showToast('Select a lesson with at least two vocabulary items.', true);
            return;
        }

        this.gameType = type;
        this.gameWords = this.shuffleArray(vocabulary).slice(0, Math.min(6, vocabulary.length));
        this.gameSelection = { chinese: null, meaning: null };
        this.memoryOpenCards = [];
        this.memoryMatchedPairs = 0;
        this.listeningIndex = 0;
        this.listeningScore = 0;

        this.toggleControlPanel(false);
        document.body.classList.remove('scrolling-mode');
        this.showOnlyStudyView('game-view');
        document.getElementById('game-controls').innerHTML = '';

        if (type === 'matching') this.renderMatchingGame();
        if (type === 'memory') this.renderMemoryGame();
        if (type === 'listening') this.renderListeningGame();
    }

    renderMatchingGame() {
        document.getElementById('game-title').textContent = 'Quick Match';
        document.getElementById('game-subtitle').textContent =
            `Lessons ${this.getSelectedLessonLabel()} · Pair each Chinese word with its meaning.`;
        const board = document.getElementById('game-board');
        board.className = 'game-board matching-board';
        board.innerHTML = '<div class="match-column" data-side="chinese"></div><div class="match-column" data-side="meaning"></div>';

        const chineseColumn = board.querySelector('[data-side="chinese"]');
        const meaningColumn = board.querySelector('[data-side="meaning"]');
        const matchedKeys = new Set();

        const choose = (side, word, button) => {
            if (button.disabled || button.classList.contains('selected')) return;
            const previous = this.gameSelection[side];
            if (previous) previous.button.classList.remove('selected');
            this.gameSelection[side] = { word, button };
            button.classList.add('selected');

            const chineseChoice = this.gameSelection.chinese;
            const meaningChoice = this.gameSelection.meaning;
            if (!chineseChoice || !meaningChoice) return;

            const isMatch = this.getWordKey(chineseChoice.word) === this.getWordKey(meaningChoice.word);
            if (isMatch) {
                [chineseChoice.button, meaningChoice.button].forEach((choice) => {
                    choice.classList.remove('selected');
                    choice.classList.add('matched');
                    choice.disabled = true;
                });
                matchedKeys.add(this.getWordKey(chineseChoice.word));
                this.gameSelection = { chinese: null, meaning: null };
                document.getElementById('game-status').textContent =
                    matchedKeys.size === this.gameWords.length
                        ? 'Excellent! You matched every word.'
                        : `${matchedKeys.size} of ${this.gameWords.length} pairs matched`;
                return;
            }

            [chineseChoice.button, meaningChoice.button].forEach((choice) => {
                choice.classList.add('incorrect');
            });
            setTimeout(() => {
                [chineseChoice.button, meaningChoice.button].forEach((choice) => {
                    choice.classList.remove('selected', 'incorrect');
                });
                if (this.gameType === 'matching') {
                    this.gameSelection = { chinese: null, meaning: null };
                }
            }, 650);
        };

        this.shuffleArray(this.gameWords).forEach((word) => {
            const button = document.createElement('button');
            button.className = 'match-card game-chinese';
            button.textContent = word.chinese;
            button.addEventListener('click', () => choose('chinese', word, button));
            chineseColumn.appendChild(button);
        });
        this.shuffleArray(this.gameWords).forEach((word) => {
            const button = document.createElement('button');
            button.className = 'match-card meaning-card';
            button.textContent = this.getGameMeaning(word);
            button.addEventListener('click', () => choose('meaning', word, button));
            meaningColumn.appendChild(button);
        });
        document.getElementById('game-status').textContent = `0 of ${this.gameWords.length} pairs matched`;
    }

    renderMemoryGame() {
        document.getElementById('game-title').textContent = 'Memory Flip';
        document.getElementById('game-subtitle').textContent =
            `Lessons ${this.getSelectedLessonLabel()} · Find each Chinese and meaning pair.`;
        const board = document.getElementById('game-board');
        board.className = 'game-board memory-board';
        board.innerHTML = '';

        const cards = this.shuffleArray(this.gameWords.flatMap((word) => [
            { word, kind: 'chinese', label: word.chinese },
            { word, kind: 'meaning', label: this.getGameMeaning(word) }
        ]));

        cards.forEach((card) => {
            const button = document.createElement('button');
            button.className = `memory-card ${card.kind === 'chinese' ? 'game-chinese' : ''}`;
            button.innerHTML = '<span class="memory-card-back">?</span>';
            button.addEventListener('click', () => {
                if (
                    button.disabled
                    || button.classList.contains('revealed')
                    || this.memoryOpenCards.length >= 2
                ) return;

                button.classList.add('revealed');
                button.textContent = card.label;
                this.memoryOpenCards.push({ card, button });
                if (this.memoryOpenCards.length < 2) return;

                const [first, second] = this.memoryOpenCards;
                const isPair =
                    this.getWordKey(first.card.word) === this.getWordKey(second.card.word)
                    && first.card.kind !== second.card.kind;

                if (isPair) {
                    [first.button, second.button].forEach((choice) => {
                        choice.classList.add('matched');
                        choice.disabled = true;
                    });
                    this.memoryMatchedPairs += 1;
                    this.memoryOpenCards = [];
                    document.getElementById('game-status').textContent =
                        this.memoryMatchedPairs === this.gameWords.length
                            ? 'Great memory! You found every pair.'
                            : `${this.memoryMatchedPairs} of ${this.gameWords.length} pairs found`;
                    return;
                }

                setTimeout(() => {
                    [first.button, second.button].forEach((choice) => {
                        choice.classList.remove('revealed');
                        choice.innerHTML = '<span class="memory-card-back">?</span>';
                    });
                    if (this.gameType === 'memory') this.memoryOpenCards = [];
                }, 850);
            });
            board.appendChild(button);
        });
        document.getElementById('game-status').textContent = `0 of ${this.gameWords.length} pairs found`;
    }

    renderListeningGame() {
        document.getElementById('game-title').textContent = 'Listen & Pick';
        document.getElementById('game-subtitle').textContent =
            `Lessons ${this.getSelectedLessonLabel()} · Listen, then choose the correct meaning.`;
        this.renderListeningQuestion();
    }

    renderListeningQuestion() {
        const word = this.gameWords[this.listeningIndex];
        const board = document.getElementById('game-board');
        const controls = document.getElementById('game-controls');
        board.className = 'game-board listening-board';
        board.innerHTML = '';
        controls.innerHTML = '';
        document.getElementById('game-status').textContent =
            `Question ${this.listeningIndex + 1} of ${this.gameWords.length} · Score ${this.listeningScore}`;

        const listenButton = document.createElement('button');
        listenButton.className = 'listen-word-btn';
        listenButton.innerHTML = '<span aria-hidden="true">🔊</span><strong>Play word</strong><small>Tap again to replay</small>';
        listenButton.addEventListener('click', () => this.pronounce(word));
        board.appendChild(listenButton);

        const options = document.createElement('div');
        options.className = 'listening-options';
        const distractorPool = this.shuffleArray(
            this.getLessonVocabulary().filter((candidate) => candidate !== word)
        );
        const optionWords = this.shuffleArray([word, ...distractorPool.slice(0, 3)]);
        let answered = false;

        optionWords.forEach((optionWord) => {
            const button = document.createElement('button');
            button.className = 'listening-option';
            button.textContent = this.getGameMeaning(optionWord);
            button.addEventListener('click', () => {
                if (answered) return;
                answered = true;
                const correct = this.getWordKey(optionWord) === this.getWordKey(word);
                if (correct) {
                    this.listeningScore += 1;
                    button.classList.add('correct');
                } else {
                    button.classList.add('incorrect');
                    Array.from(options.children).forEach((choice, index) => {
                        if (this.getWordKey(optionWords[index]) === this.getWordKey(word)) {
                            choice.classList.add('correct');
                        }
                    });
                }
                Array.from(options.children).forEach((choice) => { choice.disabled = true; });

                const nextButton = document.createElement('button');
                nextButton.className = 'large-btn listening-next-btn';
                nextButton.textContent =
                    this.listeningIndex < this.gameWords.length - 1 ? 'Next Word →' : 'See Result';
                nextButton.addEventListener('click', () => {
                    if (this.listeningIndex < this.gameWords.length - 1) {
                        this.listeningIndex += 1;
                        this.renderListeningQuestion();
                    } else {
                        board.innerHTML =
                            `<div class="listening-result"><span>🎧</span><h3>${this.listeningScore} / ${this.gameWords.length}</h3><p>Listening round complete!</p></div>`;
                        controls.innerHTML = '';
                        document.getElementById('game-status').textContent = 'Choose New Round to play again.';
                    }
                });
                controls.appendChild(nextButton);
            });
            options.appendChild(button);
        });
        board.appendChild(options);
        this.pronounce(word);
    }

    pronounce(word) {
        if (!word || !word.chinese) return;
        this.pronounceText(word.chinese);
    }

    pronounceText(text) {
        if (!text) return;
        if (!('speechSynthesis' in window)) {
            this.showToast('Speech playback is not supported by this browser.', true);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-TW';
        utterance.rate = 0.78;
        utterance.pitch = 1;
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === 'zh-tw')
            || voices.find((voice) => voice.lang.toLowerCase().startsWith('zh'));
        window.speechSynthesis.speak(utterance);
    }

    getHanCharacters(text) {
        try {
            return Array.from(text || '').filter((character) => /\p{Script=Han}/u.test(character));
        } catch {
            return Array.from(text || '').filter((character) => /[\u3400-\u9fff\uf900-\ufaff]/.test(character));
        }
    }

    openStrokeStudy(word) {
        if (!word) return;
        const characters = this.getHanCharacters(word.chinese);
        if (!characters.length) {
            this.showToast('No Chinese character was found in this vocabulary item.', true);
            return;
        }

        this.strokeReturnView = ['list-view', 'flashcard-view', 'quiz-view']
            .find((id) => !document.getElementById(id).classList.contains('hidden')) || '';
        this.strokeReturnScrollY = window.scrollY;
        this.strokeReturnAnchor = document.activeElement?.closest('tr') || null;
        if (this.strokeReturnView === 'list-view') {
            this.strokeWordList = [...this.currentListWords];
        } else if (this.strokeReturnView === 'flashcard-view') {
            this.strokeWordList = [...this.currentLessonVocabulary];
        } else {
            this.strokeWordList = [word];
        }
        this.strokeWordIndex = this.strokeWordList.findIndex(
            (candidate) => this.getWordKey(candidate) === this.getWordKey(word)
        );
        if (this.strokeWordIndex < 0) {
            this.strokeWordList = [word];
            this.strokeWordIndex = 0;
        }
        this.toggleControlPanel(false);
        document.body.classList.remove('scrolling-mode');
        this.showOnlyStudyView('stroke-view');
        this.loadStrokeWord(word);
    }

    loadStrokeWord(word) {
        const characters = this.getHanCharacters(word.chinese);
        if (!characters.length) return;

        this.strokeActivityMode = 'idle';
        this.activeStrokeWord = word;
        this.activeStrokeCharacters = characters;
        this.activeStrokeCharacterIndex = 0;
        this.activeStrokeCharacter = characters[0];
        document.getElementById('stroke-word-label').textContent =
            word.pinyin ? `${word.chinese} · ${word.pinyin}` : word.chinese;
        document.getElementById('stroke-word-progress').textContent =
            `${this.strokeWordIndex + 1} / ${this.strokeWordList.length}`;
        document.getElementById('stroke-prev-word-btn').disabled = this.strokeWordIndex === 0;
        document.getElementById('stroke-next-word-btn').disabled =
            this.strokeWordIndex >= this.strokeWordList.length - 1;

        const selector = document.getElementById('character-selector');
        selector.innerHTML = '';
        characters.forEach((character, index) => {
            const button = document.createElement('button');
            button.className = 'character-choice';
            button.textContent = character;
            button.dataset.characterIndex = String(index);
            button.setAttribute('aria-label', `Study character ${character}`);
            button.addEventListener('click', () => {
                this.selectStrokeCharacter(index);
            });
            if (index === 0) button.classList.add('active');
            selector.appendChild(button);
        });
        this.renderStrokeCharacter();
    }

    selectStrokeCharacter(index) {
        if (index < 0 || index >= this.activeStrokeCharacters.length) return;
        this.strokeActivityMode = 'idle';
        this.activeStrokeCharacterIndex = index;
        this.activeStrokeCharacter = this.activeStrokeCharacters[index];
        document.querySelectorAll('#character-selector .character-choice').forEach((button) => {
            button.classList.toggle(
                'active',
                Number(button.dataset.characterIndex) === this.activeStrokeCharacterIndex
            );
        });
        this.renderStrokeCharacter();
    }

    navigateStrokeCharacter(direction) {
        this.selectStrokeCharacter(this.activeStrokeCharacterIndex + direction);
    }

    updateStrokeCharacterNavigation() {
        document.getElementById('stroke-prev-character-btn').disabled =
            this.activeStrokeCharacterIndex <= 0;
        document.getElementById('stroke-next-character-btn').disabled =
            this.activeStrokeCharacterIndex >= this.activeStrokeCharacters.length - 1;
    }

    navigateStrokeWord(direction) {
        const nextIndex = this.strokeWordIndex + direction;
        if (nextIndex < 0 || nextIndex >= this.strokeWordList.length) return;

        this.strokeWordIndex = nextIndex;
        const word = this.strokeWordList[this.strokeWordIndex];

        if (this.strokeReturnView === 'flashcard-view') {
            const flashcardIndex = this.currentLessonVocabulary.findIndex(
                (candidate) => this.getWordKey(candidate) === this.getWordKey(word)
            );
            if (flashcardIndex >= 0) {
                this.currentFlashcardIndex = flashcardIndex;
                this.renderFlashcard();
            }
        }

        if (this.strokeReturnView === 'list-view') {
            this.strokeReturnAnchor = Array.from(
                document.querySelectorAll('#vocab-table-body tr')
            ).find((row) => row.dataset.wordKey === this.getWordKey(word)) || this.strokeReturnAnchor;
        }

        this.loadStrokeWord(word);
    }

    returnFromStrokeStudy() {
        if (this.strokeWriter) this.strokeWriter.cancelQuiz();
        if (!this.strokeReturnView) {
            this.exitStudyMode();
            return;
        }

        const returnView = this.strokeReturnView;
        this.toggleControlPanel(false);
        this.showOnlyStudyView(returnView);
        document.body.classList.toggle('scrolling-mode', returnView === 'list-view');

        if (returnView === 'list-view') {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (this.strokeReturnAnchor?.isConnected) {
                    this.strokeReturnAnchor.scrollIntoView({ block: 'center' });
                } else {
                    window.scrollTo(0, this.strokeReturnScrollY);
                }
            }));
        }
    }

    renderStrokeCharacter(showCharacter = true) {
        if (!this.activeStrokeCharacter || typeof HanziWriter === 'undefined') {
            document.getElementById('stroke-status').textContent = 'The stroke-order engine could not be loaded.';
            return;
        }
        if (this.strokeWriter) this.strokeWriter.cancelQuiz();
        this.strokeRenderToken += 1;

        const target = document.getElementById('stroke-canvas');
        target.innerHTML = '';
        const size = Math.min(Math.max(window.innerWidth - 130, 190), 360);
        document.getElementById('stroke-status').textContent =
            `Selected: ${this.activeStrokeCharacter}. Watch the animation or start tracing.`;
        const pronounceButton = document.getElementById('stroke-pronounce-btn');
        pronounceButton.textContent = '🔊';
        pronounceButton.title = `Pronounce ${this.activeStrokeCharacter}`;
        pronounceButton.setAttribute('aria-label', `Pronounce ${this.activeStrokeCharacter}`);
        pronounceButton.dataset.pronunciationText = this.activeStrokeCharacter;
        this.updateStrokeHardCharacterButton();
        this.updateStrokeCharacterNavigation();

        this.strokeWriter = HanziWriter.create('stroke-canvas', this.activeStrokeCharacter, {
            width: size,
            height: size,
            padding: 12,
            showOutline: true,
            showCharacter,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 220,
            strokeColor: '#312e81',
            radicalColor: '#db2777',
            outlineColor: '#dbe2ea',
            drawingColor: '#0f766e',
            drawingWidth: 16,
            charDataLoader: (character) =>
                fetch(`hanzi-data/${encodeURIComponent(character)}.json`).then((response) => {
                    if (!response.ok) throw new Error(`No local stroke data for ${character}`);
                    return response.json();
                }),
            onLoadCharDataError: () => {
                document.getElementById('stroke-status').textContent =
                    `Stroke data is not available for ${this.activeStrokeCharacter}.`;
            }
        });
    }

    resetStrokePractice() {
        const activityMode = this.strokeActivityMode;
        if (this.strokeWriter) this.strokeWriter.cancelQuiz();
        this.renderStrokeCharacter(false);
        if (activityMode === 'watch') {
            this.animateStrokes();
            return;
        }
        if (activityMode === 'write') {
            this.beginStrokePractice();
            return;
        }
        document.getElementById('stroke-status').textContent =
            `Reset complete. Press ▶️ to watch ${this.activeStrokeCharacter} or ✍️ to practice.`;
    }

    animateStrokes() {
        if (!this.strokeWriter) return;
        this.strokeActivityMode = 'watch';
        const renderToken = this.strokeRenderToken;
        this.strokeWriter.cancelQuiz();
        document.getElementById('stroke-status').textContent =
            `Watching the stroke order for ${this.activeStrokeCharacter}…`;
        this.strokeWriter.showCharacter({ duration: 0 });
        this.strokeWriter.animateCharacter({
            onComplete: () => {
                if (renderToken !== this.strokeRenderToken || this.strokeActivityMode !== 'watch') return;
                document.getElementById('stroke-status').textContent =
                    `Animation complete. Now try writing ${this.activeStrokeCharacter}.`;
            }
        });
    }

    beginStrokePractice() {
        if (!this.strokeWriter) return;
        this.strokeActivityMode = 'write';
        const renderToken = this.strokeRenderToken;
        this.strokeWriter.cancelQuiz();
        document.getElementById('stroke-status').textContent =
            `Trace ${this.activeStrokeCharacter} in the box. A hint appears after a missed stroke.`;
        this.strokeWriter.quiz({
            showHintAfterMisses: 1,
            highlightOnComplete: true,
            onComplete: (summary) => {
                if (renderToken !== this.strokeRenderToken || this.strokeActivityMode !== 'write') return;
                const mistakes = summary.totalMistakes || 0;
                document.getElementById('stroke-status').textContent =
                    mistakes === 0
                        ? `Excellent — ${this.activeStrokeCharacter} completed with no mistakes!`
                        : `Completed ${this.activeStrokeCharacter} with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`;
            }
        });
    }

    toggleHardCharacter(character) {
        if (!character) return;
        const index = this.hardCharacters.indexOf(character);
        if (index >= 0) this.hardCharacters.splice(index, 1);
        else this.hardCharacters.push(character);
        this.writeStorage(this.storageKeys.hardCharacters, this.hardCharacters);
        this.renderHardCharacterControls();
        this.updateStrokeHardCharacterButton();
    }

    isHardCharacter(character) {
        return this.hardCharacters.includes(character);
    }

    updateStrokeHardCharacterButton() {
        const button = document.getElementById('stroke-hard-character-btn');
        if (!button) return;
        const isHard = this.isHardCharacter(this.activeStrokeCharacter);
        button.textContent = isHard ? '★' : '☆';
        button.classList.toggle('is-hard', isHard);
        const description =
            `${isHard ? 'Remove' : 'Add'} ${this.activeStrokeCharacter || 'character'} ${isHard ? 'from' : 'to'} hard writing characters`;
        button.setAttribute('aria-label', description);
        button.title = description;
    }

    renderHardCharacterControls() {
        const list = document.getElementById('hard-character-list');
        const count = this.hardCharacters.length;
        document.getElementById('hard-character-count').textContent = String(count);
        document.getElementById('practice-hard-characters-btn').disabled = count === 0;
        document.getElementById('delete-hard-characters-btn').disabled = count === 0;
        list.innerHTML = '';

        if (!count) {
            list.innerHTML =
                '<p class="empty-character-message">Add difficult characters while practicing stroke order.</p>';
            return;
        }

        this.hardCharacters.forEach((character) => {
            const chip = document.createElement('div');
            chip.className = 'hard-character-chip';
            const characterText = document.createElement('span');
            characterText.className = 'hard-character-glyph';
            characterText.textContent = character;
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'hard-character-remove';
            removeButton.textContent = '×';
            removeButton.setAttribute('aria-label', `Remove ${character} from hard writing characters`);
            removeButton.addEventListener('click', () => this.toggleHardCharacter(character));
            chip.append(characterText, removeButton);
            list.appendChild(chip);
        });
    }

    practiceHardCharacters() {
        if (!this.hardCharacters.length) return;
        this.strokeWordList = this.hardCharacters.map((character, index) => ({
            chinese: character,
            pinyin: '',
            english: 'Hard writing character',
            bookId: 'hard-writing',
            lessonCode: 'saved',
            sequence: String(index + 1)
        }));
        this.strokeWordIndex = 0;
        this.strokeReturnView = '';
        this.strokeReturnAnchor = null;
        this.toggleControlPanel(false);
        document.body.classList.remove('scrolling-mode');
        this.showOnlyStudyView('stroke-view');
        this.loadStrokeWord(this.strokeWordList[0]);
    }

    deleteAllHardCharacters() {
        if (!this.hardCharacters.length) return;
        this.openConfirmation({
            title: 'Delete all hard writing characters?',
            message: 'This permanently removes every character from your hard-writing list.',
            expectedWord: 'delete',
            action: () => {
                this.hardCharacters = [];
                this.writeStorage(this.storageKeys.hardCharacters, this.hardCharacters);
                this.renderHardCharacterControls();
                this.showToast('All hard writing characters were deleted.');
            }
        });
    }

    toggleHardWord(word) {
        const key = this.getWordKey(word);
        const index = this.hardWords.findIndex((savedWord) => this.getWordKey(savedWord) === key);
        if (index >= 0) this.hardWords.splice(index, 1);
        else this.hardWords.push({ ...word, bookId: word.bookId || this.currentBook });
        this.writeStorage(this.storageKeys.hardWords, this.hardWords);
        this.updateHardWordControls();
    }

    isHardWord(word) {
        const key = this.getWordKey(word);
        return this.hardWords.some((savedWord) => this.getWordKey(savedWord) === key);
    }

    deleteAllHardWords() {
        if (!this.hardWords.length) return;
        this.openConfirmation({
            title: 'Delete all hard words?',
            message: 'This permanently removes every word from your hard-word list.',
            expectedWord: 'delete',
            action: () => {
                this.hardWords = [];
                this.writeStorage(this.storageKeys.hardWords, this.hardWords);
                this.updateHardWordControls();
                this.showToast('All hard words were deleted.');
            }
        });
    }

    openConfirmation({ title, message, expectedWord, action }) {
        this.pendingConfirmation = { expectedWord, action };
        document.getElementById('confirmation-title').textContent = title;
        document.getElementById('confirmation-message').textContent = message;
        document.getElementById('confirmation-word').textContent = `"${expectedWord}"`;
        document.getElementById('confirmation-input').value = '';
        document.getElementById('confirmation-error').textContent = '';
        document.getElementById('confirmation-modal').classList.remove('hidden');
        document.getElementById('confirmation-input').focus();
    }

    submitConfirmation() {
        if (!this.pendingConfirmation) return;
        const input = document.getElementById('confirmation-input');
        if (input.value !== this.pendingConfirmation.expectedWord) {
            document.getElementById('confirmation-error').textContent =
                `Type exactly: ${this.pendingConfirmation.expectedWord}`;
            input.focus();
            input.select();
            return;
        }
        const action = this.pendingConfirmation.action;
        this.closeConfirmation();
        action();
    }

    closeConfirmation() {
        document.getElementById('confirmation-modal').classList.add('hidden');
        document.getElementById('confirmation-error').textContent = '';
        this.pendingConfirmation = null;
    }

    showToast(message, isError = false) {
        const toast = document.getElementById('app-toast');
        toast.textContent = message;
        toast.classList.toggle('error', isError);
        toast.classList.remove('hidden');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
    }

    updateHardWordControls() {
        const count = this.hardWords.length;
        document.getElementById('hard-word-count').textContent = String(count);
        document.getElementById('view-hard-words-btn').disabled = count === 0;
        document.getElementById('practice-hard-words-btn').disabled = count === 0;
        document.getElementById('delete-hard-words-btn').disabled = count === 0;
        document.getElementById('practice-all-words-btn').disabled = this.currentLessons.length === 0;
    }

    getWordKey(word) {
        return [
            word.bookId || word.volume || this.currentBook || '',
            word.lessonCode || '',
            word.sequence || '',
            word.chinese || ''
        ].join('|');
    }

    dedupeWords(words) {
        const seen = new Set();
        return words.filter((word) => {
            const key = this.getWordKey(word);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    readStorage(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            if ([this.storageKeys.hardWords, this.storageKeys.hardCharacters].includes(key)) {
                return Array.isArray(value) ? value : fallback;
            }
        } catch (error) {
            console.warn(`Could not read ${key}:`, error);
        }
        return fallback;
    }

    writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Could not save ${key}:`, error);
            this.showToast('This browser could not save your data. Check private-browsing or storage settings.', true);
        }
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

const app = new VocabularyApp();
