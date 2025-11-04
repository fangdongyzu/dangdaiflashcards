

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