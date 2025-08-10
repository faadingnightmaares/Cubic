/*
  Cubic — Inline quiz summary in chat.
*/
import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  Target, 
  Trophy,
  Zap,
  BookOpen,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

const QuizMessage = ({ quiz, onStartQuiz, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'hard':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600';
    }
  };

  const getEstimatedTime = (questionCount) => {
    const minutes = Math.ceil(questionCount * 1.5);
    return `${minutes} min`;
  };

  return (
    <div className={`transition-all duration-300 transform ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    } ${className}`}>
      {/* Quiz Generated Header */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-6 h-6 bg-gray-600 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <MessageSquare className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Quiz Generated
        </span>
      </div>

      {/* Main Quiz Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {quiz.title}
              </h3>
              {quiz.subject && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {quiz.subject}
                </p>
              )}
            </div>
          </div>
          
          {quiz.difficulty && (
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getDifficultyColor(quiz.difficulty)}`}>
              {quiz.difficulty}
            </span>
          )}
        </div>

        {/* Description */}
        {quiz.description && (
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
            {quiz.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
            <Target className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-auto mb-1" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {quiz.questions?.length || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Questions
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-auto mb-1" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {getEstimatedTime(quiz.questions?.length || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Duration
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
            <Trophy className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-auto mb-1" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {quiz.maxScore || (quiz.questions?.length || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Max Score
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
            <Zap className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-auto mb-1" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {quiz.category || 'General'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Category
            </div>
          </div>
        </div>

        {/* Sample Questions Preview */}
        {quiz.questions && quiz.questions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Sample Questions:
            </h4>
            <div className="space-y-2">
              {quiz.questions.slice(0, 2).map((question, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border-l-3 border-gray-300 dark:border-gray-600"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Q{index + 1}:
                    </span>{' '}
                    {question.question}
                  </p>
                </div>
              ))}
              {quiz.questions.length > 2 && (
                <div className="text-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{quiz.questions.length - 2} more questions
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={() => onStartQuiz(quiz)}
            className="group flex items-center space-x-2 px-6 py-3 bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
          >
            <Play className="w-4 h-4" />
            <span>Start Quiz</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizMessage;