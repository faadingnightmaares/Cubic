/*
  Cubic — Sidebar: history, search, quick settings (dark/RTL)
  Local only. Simple, works.
*/
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search, Plus, MessageSquare, Archive, Settings, Clock, Trash2, X, Box, FileText, Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = forwardRef(({ onChatSelect, onNewChat, currentChatId }, ref) => {
  const { isDarkMode, toggleTheme, language, toggleLanguage, t, isRTL } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [chatHistory, setChatHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  useImperativeHandle(ref, () => ({
    refreshChatList: loadChatHistory
  }));

  const loadChatHistory = () => {
    // Back-compat: migrate pquiz -> cubic if needed
    const legacy = localStorage.getItem('pquiz_chats')
    const chats = JSON.parse(localStorage.getItem('cubic_chats') || legacy || '[]');
    setChatHistory(chats.sort((a, b) => b.timestamp - a.timestamp));
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  const filteredChats = chatHistory.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeSection === 'all') return matchesSearch;
    if (activeSection === 'quizzes') return matchesSearch && chat.title.toLowerCase().includes('quiz');
    return matchesSearch;
  });

  const handleChatSelect = (chat) => {
    if (onChatSelect) {
      onChatSelect(chat);
    }
  };

  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    const updatedChats = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updatedChats);
    localStorage.setItem('cubic_chats', JSON.stringify(updatedChats));
    localStorage.setItem('pquiz_chats', JSON.stringify(updatedChats)); // legacy key for back-compat
    
    // If the deleted chat is the currently active one, redirect to new chat
    if (currentChatId === chatId && onNewChat) {
      onNewChat();
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: language === 'ar' ? false : true
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };
  
  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full transition-colors duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        {/* Logo - Centered Box Icon Only */}
        <div className="flex items-center justify-center mb-6">
          <Box className="w-8 h-8 text-gray-600 dark:text-gray-300" />
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4`} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* New Chat Button */}
        <button 
          onClick={handleNewChat}
          className={`w-full bg-gray-600 dark:bg-gray-700 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 font-medium`}
        >
          <Plus className="w-4 h-4" />
          <span>{t('newChat')}</span>
        </button>
      </div>
      
      {/* Navigation */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <nav className="space-y-2">
          <button 
            onClick={() => setActiveSection('all')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 ${
              activeSection === 'all' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t('allConversations')}</span>
            <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full`}>
              {chatHistory.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveSection('quizzes')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 ${
              activeSection === 'quizzes' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>{t('quizzes')}</span>
            <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full`}>
              {chatHistory.filter(c => c.type === 'quiz').length}
            </span>
          </button>
        </nav>
      </div>
      
      {/* Recent Conversations */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {activeSection === 'all' ? t('allConversations') : 
             activeSection === 'quizzes' ? t('quizzes') : t('allConversations')}
          </h3>
          {searchTerm && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {filteredChats.length} {t('result')}{filteredChats.length !== 1 ? t('s') : ''}
            </span>
          )}
        </div>
        
        {filteredChats.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-2">
              {searchTerm ? (
                <Search className="w-8 h-8 mx-auto" />
              ) : (
                <MessageSquare className="w-8 h-8 mx-auto" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? t('noConversationsFound') : t('noConversationsYet')}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-1"
              >
                {t('clearSearch')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((conversation) => (
              <div 
                key={conversation.id}
                onClick={() => handleChatSelect(conversation)}
                className={`group p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors duration-200 relative ${
                  currentChatId === conversation.id ? `bg-gray-100 dark:bg-gray-800 ${isRTL ? 'border-r-4' : 'border-l-4'} border-gray-600 dark:border-gray-400` : ''
                }`}
              >
                <div className={`flex items-start ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {conversation.type === 'quiz' ? (
                      <div className="relative">
                        <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        {conversation.results && (
                          <div className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} w-2 h-2 bg-green-500 rounded-full`}></div>
                        )}
                      </div>
                    ) : (
                      <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                      {conversation.title}
                    </p>
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse flex-row-reverse' : ''} space-x-1 mt-1`}>
                      <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.timestamp ? formatDate(conversation.timestamp) : t('justNow')}
                      </p>
                      {conversation.type === 'quiz' && conversation.results && (
                        <>
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {conversation.results.score}/{conversation.results.totalQuestions}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(conversation.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all duration-200"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Settings */}
      <div className="p-6 border-t border-gray-100 dark:border-gray-700">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200 flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 group`}
        >
          <Settings className={`w-4 h-4 transition-transform duration-200 ${showSettings ? 'rotate-45' : 'group-hover:rotate-45'}`} />
          <span>{t('settings')}</span>
        </button>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="space-y-3">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('theme')}</span>
                <button
                  onClick={toggleTheme}
                  className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200`}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <>
                      <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('dark')}</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('light')}</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Language Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('language')}</span>
                <button
                  onClick={toggleLanguage}
                  className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200`}
                >
                  <Languages className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {language === 'en' ? 'English' : 'العربية'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default Sidebar;