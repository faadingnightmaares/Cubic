/*
  Cubic — Quiz runner: MCQ/Text, timer, scoring, review mode.
  UI polish, logic stays the same.
*/
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trophy, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft,
  Target,
  Zap,
  Award,
  ChevronRight
} from 'lucide-react';

const QuizInterface = ({ quizData, quizResults, onComplete, onBack }) => {
  // Validate quiz data
  if (!quizData || !quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Invalid Quiz Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The quiz data is missing or corrupted. Please try generating a new quiz.
          </p>
          <button
            onClick={onBack}
            className="flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 mx-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(quizResults?.answers || {});
  const [showResults, setShowResults] = useState(!!quizResults); // Show results if quiz is already completed
  const [timeElapsed, setTimeElapsed] = useState(quizResults?.timeElapsed || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Cleanup function to reset all state
  const resetQuizState = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setTimeElapsed(0);
    setIsAnimating(false);
    setShowExplanation(false);
    setIsReviewMode(false);
  };

  // Reset state when quizData changes (switching between quizzes)
  useEffect(() => {
    if (quizData) {
      resetQuizState();
      // Re-initialize with quiz results if available
      if (quizResults?.answers) {
        setSelectedAnswers(quizResults.answers);
        setShowResults(true);
      }
    }
  }, [quizData?.id, quizData?.title]); // Reset when quiz ID or title changes

  // Validate current question index
  const validCurrentQuestion = Math.max(0, Math.min(currentQuestion, quizData.questions.length - 1));
  
  // Get current question with validation
  const getCurrentQuestion = () => {
    const question = quizData.questions[validCurrentQuestion];
    if (!question || !question.options || !Array.isArray(question.options)) {
      return {
        question: 'Invalid question data',
        options: ['Error loading options'],
        correctAnswer: 0
      };
    }
    return question;
  };

  const currentQ = getCurrentQuestion();

  // Check if quiz has time limit
  const hasTimeLimit = quizData.timeLimit && quizData.timeLimit > 0;
  const timeLimitSeconds = hasTimeLimit ? quizData.timeLimit * 60 : 0; // Convert minutes to seconds
  
  // Calculate remaining time for countdown
  const timeRemaining = hasTimeLimit ? Math.max(0, timeLimitSeconds - timeElapsed) : 0;
  const isTimeUp = hasTimeLimit && timeRemaining <= 0;

  // Timer effect
  useEffect(() => {
    if (!showResults) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          // Auto-submit when time is up
          if (hasTimeLimit && newTime >= timeLimitSeconds) {
            setTimeout(() => handleSubmit(), 100);
          }
          return newTime;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showResults, hasTimeLimit, timeLimitSeconds]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer selection with validation
  const handleAnswerSelect = (questionIndex, answerIndex) => {
    if (showResults || isReviewMode) {
      return;
    }
    
    if (questionIndex < 0 || questionIndex >= quizData.questions.length) {
      console.error('Invalid question index:', questionIndex);
      return;
    }
    
    if (answerIndex < 0 || answerIndex >= currentQ.options.length) {
      console.error('Invalid answer index:', answerIndex);
      return;
    }
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  // Navigate to next question with validation
  const handleNext = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestion(prev => Math.min(prev + 1, quizData.questions.length - 1));
        setIsAnimating(false);
        setShowExplanation(false);
      }, 200);
    }
  };

  // Navigate to previous question with validation
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestion(prev => Math.max(prev - 1, 0));
        setIsAnimating(false);
        setShowExplanation(false);
      }, 200);
    }
  };

  // Submit quiz with validation
  const handleSubmit = () => {
    try {
      setShowResults(true);
      if (onComplete) {
        const score = calculateScore();
        onComplete({
          score,
          totalQuestions: quizData.questions.length,
          timeElapsed,
          answers: selectedAnswers
        });
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      // Optionally show error message to user
    }
  };

  // Calculate score with validation
  const calculateScore = () => {
    // If quiz results are provided (completed quiz), use the stored score
    if (quizResults && typeof quizResults.score === 'number') {
      return quizResults.score;
    }
    
    // Otherwise calculate from current answers
    let correct = 0;
    try {
      quizData.questions.forEach((question, index) => {
        if (question && 
            typeof question.correctAnswer === 'number' && 
            selectedAnswers[index] === question.correctAnswer) {
          correct++;
        }
      });
    } catch (error) {
      console.error('Error calculating score:', error);
    }
    return correct;
  };

  // Restart quiz
  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setTimeElapsed(0);
    setShowExplanation(false);
    setIsReviewMode(false);
  };

  const progress = ((validCurrentQuestion + 1) / quizData.questions.length) * 100;
  const score = calculateScore();
  const scorePercentage = (score / quizData.questions.length) * 100;

  if (showResults) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-all duration-300">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <div className="text-center mb-8">
            {quizResults && (
               <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                 <p className="text-sm text-blue-700 dark:text-blue-300">
                   This quiz was completed on {new Date(quizResults.timestamp || Date.now()).toLocaleDateString()}
                 </p>
               </div>
             )}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-600 dark:bg-gray-700 rounded-full mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {quizResults ? 'Quiz Results' : 'Quiz Complete!'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {quizData.title}
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Target className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Score</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {score}/{quizData.questions.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {scorePercentage.toFixed(0)}% Correct
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Time</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatTime(timeElapsed)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Time
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Award className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Grade</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {scorePercentage >= 90 ? 'A+' : 
                   scorePercentage >= 80 ? 'A' : 
                   scorePercentage >= 70 ? 'B' : 
                   scorePercentage >= 60 ? 'C' : 'F'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Performance
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setShowResults(false);
                setCurrentQuestion(0);
                setShowExplanation(true);
                setIsReviewMode(true);
              }}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Review Answers
            </button>
            
            <button
              onClick={handleRestart}
              className="flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Quiz
            </button>
            
            <button
              onClick={onBack}
              className="flex items-center justify-center px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-all duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Timer - only show during active quiz with time limit */}
              {hasTimeLimit && !showResults && !isReviewMode && (
                <div className={`flex items-center ${
                  timeRemaining <= 60 
                    ? 'text-red-600 dark:text-red-400' 
                    : timeRemaining <= 300 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-xs ml-1 opacity-75">
                    {timeRemaining <= 60 ? 'left' : 'remaining'}
                  </span>
                </div>
              )}
              
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Zap className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">
                  {validCurrentQuestion + 1}/{quizData.questions.length}
                </span>
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {quizData.title}
            {isReviewMode && (
              <span className="ml-3 text-lg font-medium text-blue-600 dark:text-blue-400">
                (Review Mode)
              </span>
            )}
          </h1>
          
          {/* Review Mode Status */}
          {isReviewMode && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center">
                <div className="flex items-center mr-6">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Correct: {score}/{quizData.questions.length}
                  </span>
                </div>
                <div className="flex items-center">
                  <XCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wrong: {quizData.questions.length - score}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                 {selectedAnswers[validCurrentQuestion] === currentQ.correctAnswer ? (
                   <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                     <CheckCircle className="w-4 h-4 mr-2" />
                     <span className="font-medium">Your answer: </span>
                     <span className="ml-1">{currentQ.options[selectedAnswers[validCurrentQuestion]]}</span>
                   </div>
                 ) : (
                   <div className="space-y-1">
                     <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                       <XCircle className="w-4 h-4 mr-2" />
                       <span className="font-medium">Your answer: </span>
                       <span className="ml-1">{currentQ.options[selectedAnswers[validCurrentQuestion]]}</span>
                     </div>
                     <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                       <CheckCircle className="w-4 h-4 mr-2" />
                       <span className="font-medium">Correct answer: </span>
                       <span className="ml-1">{currentQ.options[currentQ.correctAnswer]}</span>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gray-600 dark:bg-gray-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-all duration-200 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gray-600 dark:bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                {validCurrentQuestion + 1}
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Question {validCurrentQuestion + 1} of {quizData.questions.length}
              </span>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, index) => {
              const userAnswer = selectedAnswers[validCurrentQuestion];
              const isUserChoice = userAnswer === index;
              const isCorrectAnswer = index === currentQ.correctAnswer;
              const inResultsMode = showResults || isReviewMode;
              

              
              // Determine styling based on state
              let borderClass = 'border-2 border-gray-200 dark:border-gray-600';
              let bgClass = 'bg-white dark:bg-gray-700';
              let textClass = 'text-gray-900 dark:text-white';
              let iconClass = 'border-gray-300 dark:border-gray-600';
              let iconBg = '';
              let showIcon = null;
              
              if (inResultsMode) {
                // In results/review mode
                if (isCorrectAnswer) {
                  // This is the correct answer - always show green outline
                  borderClass = 'border-4 border-green-500';
                  bgClass = 'bg-white dark:bg-gray-800';
                  iconClass = 'border-green-500 bg-green-500';
                  showIcon = <CheckCircle className="w-3 h-3 text-white" />;
                } else if (isUserChoice && !isCorrectAnswer) {
                  // This is user's wrong choice - show red outline
                  borderClass = 'border-4 border-red-500';
                  bgClass = 'bg-white dark:bg-gray-800';
                  iconClass = 'border-red-500 bg-red-500';
                  showIcon = <XCircle className="w-3 h-3 text-white" />;
                } else {
                  // Other options - dimmed
                  borderClass = 'border-2 border-gray-200 dark:border-gray-600';
                  bgClass = 'bg-gray-50 dark:bg-gray-700';
                  textClass = 'text-gray-500 dark:text-gray-400';
                }
              } else {
                // During quiz
                if (isUserChoice) {
                  borderClass = 'border-2 border-gray-600';
                  bgClass = 'bg-gray-50 dark:bg-gray-700';
                  iconClass = 'border-gray-600 bg-gray-600';
                  showIcon = <div className="w-2 h-2 bg-white rounded-full" />;
                } else {
                  borderClass = 'border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500';
                }
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(validCurrentQuestion, index)}
                  className={`w-full p-4 text-left rounded-lg transition-all duration-200 ${borderClass} ${bgClass} ${textClass}`}
                  disabled={inResultsMode}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${iconClass}`}>
                      {showIcon}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {(showResults || isReviewMode) && currentQ.explanation && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Explanation:</h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">{currentQ.explanation}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={validCurrentQuestion === 0}
            className="flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex space-x-3">
            {isReviewMode ? (
              <>
                {validCurrentQuestion === quizData.questions.length - 1 ? (
                  <button
                    onClick={() => {
                      setIsReviewMode(false);
                      setShowResults(true);
                      setShowExplanation(false);
                    }}
                    className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Back to Results
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </>
            ) : (
              <>
                {validCurrentQuestion === quizData.questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={Object.keys(selectedAnswers).length !== quizData.questions.length}
                    className="flex items-center px-8 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Submit Quiz
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={selectedAnswers[validCurrentQuestion] === undefined}
                    className="flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;