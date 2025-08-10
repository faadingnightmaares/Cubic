/*
  Cubic — App shell: Sidebar + Chat/Quiz views
  Keep behavior identical; just naming cleanups and comments.
*/
import React, { useState, useRef } from 'react'
import ChatInterface from './components/ChatInterface'
import QuizInterface from './components/QuizInterface'
import Sidebar from './components/Sidebar'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  const [currentChatId, setCurrentChatId] = useState(null)
  const [currentView, setCurrentView] = useState('chat') // 'chat' or 'quiz'
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [currentQuizResults, setCurrentQuizResults] = useState(null)
  const chatInterfaceRef = useRef(null)
  const sidebarRef = useRef(null)

  const handleChatSelect = (chat) => {
    // Always clear current state first to prevent interference
    setCurrentQuiz(null)
    setCurrentQuizResults(null)
    
    // Clear chat interface state
    if (chatInterfaceRef.current && chatInterfaceRef.current.clearChat) {
      chatInterfaceRef.current.clearChat()
    }
    
    setCurrentChatId(chat.id)
    
    // Check if this is a quiz or regular chat
    if (chat.type === 'quiz' && chat.quiz) {
      // For quiz items, switch to quiz view and load quiz data
      setCurrentView('quiz')
      setCurrentQuiz(chat.quiz)
      setCurrentQuizResults(chat.results || null) // Pass results if quiz is completed
    } else {
      // For regular chats, switch to chat view and load chat
      setCurrentView('chat')
      if (chatInterfaceRef.current && chatInterfaceRef.current.loadChat) {
        chatInterfaceRef.current.loadChat(chat)
      }
    }
  }

  const handleNewChat = () => {
    setCurrentChatId(null)
    setCurrentView('chat')
    setCurrentQuizResults(null)
    // Clear the current chat in ChatInterface
    if (chatInterfaceRef.current && chatInterfaceRef.current.clearChat) {
      chatInterfaceRef.current.clearChat()
    }
  }

  const handleChatUpdate = (chatData) => {
    setCurrentChatId(chatData.id)
    // Refresh sidebar chat list in real-time
    if (sidebarRef.current && sidebarRef.current.refreshChatList) {
      sidebarRef.current.refreshChatList()
    }
  }

  const handleStartQuiz = (quiz) => {
    // Clear any existing quiz state first
    setCurrentQuiz(null)
    setCurrentQuizResults(null)
    
    // Clear chat interface state
    if (chatInterfaceRef.current && chatInterfaceRef.current.clearChat) {
      chatInterfaceRef.current.clearChat()
    }
    
    // Set new quiz
    setCurrentQuiz(quiz)
    setCurrentView('quiz')
  }

  const handleQuizComplete = (results) => {
    // Update existing quiz entry with results instead of creating a new one
    const existingChats = JSON.parse(localStorage.getItem('cubic_chats') || localStorage.getItem('pquiz_chats') || '[]')
    
    // Find the current quiz entry and update it with results
    const updatedChats = existingChats.map(chat => {
      if (chat.type === 'quiz' && chat.quiz && 
          chat.quiz.title === currentQuiz.title && 
          !chat.results) {
        return {
          ...chat,
          results: results,
          timestamp: new Date().toISOString() // Update timestamp when completed
        }
      }
      return chat
    })
    
    localStorage.setItem('cubic_chats', JSON.stringify(updatedChats))
    localStorage.setItem('pquiz_chats', JSON.stringify(updatedChats)) // legacy key for back-compat
    
    // Refresh sidebar
    if (sidebarRef.current && sidebarRef.current.refreshChatList) {
      sidebarRef.current.refreshChatList()
    }
  }

  const handleBackToChat = () => {
    setCurrentView('chat')
    setCurrentQuiz(null)
    setCurrentQuizResults(null)
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Sidebar - Always visible desktop layout */}
        <Sidebar 
          ref={sidebarRef}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          currentChatId={currentChatId}
        />
        
        {/* Main Content - Full Width Chat Interface */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
          <div className="w-full h-full flex flex-col">
            {/* Conditional Rendering based on current view */}
            {currentView === 'chat' ? (
              <ChatInterface 
                ref={chatInterfaceRef}
                onNewChat={handleChatUpdate}
                onStartQuiz={handleStartQuiz}
                currentChatId={currentChatId}
              />
            ) : currentView === 'quiz' && currentQuiz ? (
              <QuizInterface
                quizData={currentQuiz}
                quizResults={currentQuizResults}
                onComplete={handleQuizComplete}
                onBack={handleBackToChat}
              />
            ) : null}
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App