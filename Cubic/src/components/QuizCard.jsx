import React, { useState } from 'react';
import { 
  Play, 
  Clock, 
  Target, 
  ChevronRight, 
  BookOpen,
  Award,
  Users,
  Zap
} from 'lucide-react';

const QuizCard = ({ quiz, onStart, className = "" }) => {
  const [isHovered, setIsHovered] = useState(false);

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
    // Estimate 1-2 minutes per question
    const minutes = Math.ceil(questionCount * 1.5);
    return `${minutes} min`;
  };

  return (
    <div 
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onStart}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3">
              <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                {quiz.title}
              </h3>
              {quiz.subject && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {quiz.subject}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className={`transition-transform duration-200 ${isHovered ? 'translate-x-1' : ''}`}>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* Description */}
      {quiz.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
          {quiz.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {quiz.questions?.length || 0} Questions
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {getEstimatedTime(quiz.questions?.length || 0)}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {quiz.difficulty && (
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getDifficultyColor(quiz.difficulty)}`}>
              {quiz.difficulty}
            </span>
          )}
          
          {quiz.category && (
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
              {quiz.category}
            </span>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          className={`flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-90'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Start</span>
        </button>
      </div>
    </div>
  );
};

// Quiz Preview Component for inline display in chat
export const QuizPreview = ({ quiz, onStart, className = "" }) => {
  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-600 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {quiz.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {quiz.questions?.length || 0} questions • Ready to start
            </p>
          </div>
        </div>
        
        <button
          onClick={onStart}
          className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 font-medium transition-all duration-200"
        >
          <Play className="w-4 h-4" />
          <span>Start Quiz</span>
        </button>
      </div>
    </div>
  );
};

export default QuizCard;