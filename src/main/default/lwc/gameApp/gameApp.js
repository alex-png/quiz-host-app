import { LightningElement, track, wire } from 'lwc';
import getCurrentQuestion from '@salesforce/apex/QuizController.getCurrentQuestion';
import getQuizSession from '@salesforce/apex/QuizController.getQuizSession';
import getQuizSettings from '@salesforce/apex/QuizController.getQuizSettings';
import triggerNextPhase from '@salesforce/apex/QuizController.triggerNextPhase';
import { reduceErrors } from 'c/errorUtils';

export default class GameApp extends LightningElement {
    @track error;
    @track quizSession;
    @track quizSettings;
    @track isNextButtonDisabled = true;
    @track currentQuestion;

    @wire(getQuizSettings)
    wiredQuizSettings({ error, data }) {
        if (data) {
            this.quizSettings = data;
            this.error = undefined;
        } else if (error) {
            this.error = reduceErrors(error);
            this.quizSettings = undefined;
        }
    }

    connectedCallback() {
        getQuizSession()
            .then(quizSession => {
                this.quizSession = quizSession;
                this.error = undefined;
                this.refreshCurrentQuestion();
            })
            .catch(error => {
                this.error = reduceErrors(error);
                this.quizSession = undefined;
            });
    }

    refreshCurrentQuestion() {
        getCurrentQuestion({ sessionId: this.quizSession.Id })
            .then(currentQuestion => {
                this.currentQuestion = currentQuestion;
                this.error = undefined;
                // Double phase change click prevention
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => {
                    this.isNextButtonDisabled = false;
                }, 500);
            })
            .catch(error => {
                this.error = reduceErrors(error);
                this.currentQuestion = undefined;
                this.isNextButtonDisabled = true;
            });
    }

    handleNextPhaseClick() {
        this.isNextButtonDisabled = true;
        this.answerCount = undefined;
        triggerNextPhase({ sessionId: this.quizSession.Id })
            .then(updatedSession => {
                this.quizSession = updatedSession;
                this.error = undefined;
                this.refreshCurrentQuestion();
            })
            .catch(error => {
                this.error = reduceErrors(error);
                this.quizSession = undefined;
            });
    }

    get quizPhaseLabel() {
        if (this.quizSession) {
            if (this.isRegistrationPhase) return 'Registration';
            if (this.isPreQuestionPhase) return 'Get Ready!';
            if (this.isQuestionPhase) return 'Question';
            if (this.isQuestionResultsPhase) return 'Answer';
            if (this.isGameResultsPhase) return 'Game Over';
        }
        return 'Loading...';
    }

    get nextButtonText() {
        if (this.quizSession) {
            if (this.isRegistrationPhase) return 'Start!';
            if (this.isPreQuestionPhase) return 'Ready!';
            if (this.isGameResultsPhase) return 'New Game';
            return 'Next';
        }
        return 'Loading...';
    }

    get correctAnswerLabel() {
        const { currentQuestion } = this;
        const correctAnswer = currentQuestion.Correct_Answer__c;
        const answerLabel = this.currentQuestion[`Answer_${correctAnswer}__c`];
        return `${correctAnswer}: ${answerLabel}`;
    }

    get cardBodyClasses() {
        let bgColorClass = this.quizSession
            ? `bg-${this.quizSession.Phase__c}`
            : '';
        return `slds-card__body slds-card__body_inner ${bgColorClass}`;
    }

    get isRegistrationPhase() {
        return this.quizSession.Phase__c === 'Registration';
    }

    get isPreQuestionPhase() {
        return this.quizSession.Phase__c === 'PreQuestion';
    }

    get isQuestionPhase() {
        return this.quizSession.Phase__c === 'Question';
    }

    get isQuestionResultsPhase() {
        return this.quizSession.Phase__c === 'QuestionResults';
    }

    get isGameResultsPhase() {
        return this.quizSession.Phase__c === 'GameResults';
    }
}
