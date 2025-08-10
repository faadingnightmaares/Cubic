/*
  Cubic theme + i18n context
  - Dark mode (class-based)
  - English/Arabic with RTL switch
*/
import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

const translations = {
  en: {
    // Sidebar
    searchPlaceholder: 'Search conversations...',
    all: 'All',
    recent: 'Recent',
    archived: 'Archived',
    allConversations: 'All Conversations',
    quizzes: 'Quizzes',
    newChat: 'New Chat',
    settings: 'Settings',
    theme: 'Theme',
    language: 'Language',
    dark: 'Dark',
    light: 'Light',
    
    // Chat Interface
    sendMessage: 'Send a message...',
    generateQuiz: 'Generate Quiz',
    uploadPDF: 'Upload PDF',
    think: 'Think',
    reasoningModeEnabled: 'Reasoning mode enabled - uses deepseek-reasoner',
    normalMode: 'Normal mode - uses deepseek-chat',
    
    // Quiz Config
    configureQuiz: 'Configure Your Quiz',
    customizeQuizExperience: 'Customize your quiz experience',
    quizType: 'Quiz Type',
    multipleChoice: 'Multiple Choice',
    multipleChoiceDesc: 'Traditional quiz with 4 options per question',
    textAnswer: 'Text Answer',
    textAnswerDesc: 'Open-ended questions requiring written responses',
    mixedFormat: 'Mixed Format',
    mixedFormatDesc: 'Combination of multiple choice and text answers',
    difficultyLevel: 'Difficulty Level',
    easy: 'Easy',
    easyDesc: 'Basic concepts and simple questions',
    medium: 'Medium',
    mediumDesc: 'Moderate difficulty with some complexity',
    hard: 'Hard',
    hardDesc: 'Advanced concepts and challenging questions',
    expert: 'Expert',
    expertDesc: 'Professional level with deep understanding required',
    numberOfQuestions: 'Number of Questions',
    '5Questions': '5 Questions',
    '10Questions': '10 Questions',
    '15Questions': '15 Questions',
    '20Questions': '20 Questions',
    '25Questions': '25 Questions',
    timeLimit: 'Time Limit (minutes)',
    noTimeLimit: 'No Time Limit',
    '5Minutes': '5 Minutes',
    '10Minutes': '10 Minutes',
    '15Minutes': '15 Minutes',
    '20Minutes': '20 Minutes',
    '30Minutes': '30 Minutes',
    '45Minutes': '45 Minutes',
    '60Minutes': '60 Minutes',
    subjectTopic: 'Subject/Topic (Optional)',
    subjectPlaceholder: 'e.g., JavaScript, History, Mathematics...',
    customInstructions: 'Custom Instructions (Optional)',
    customInstructionsPlaceholder: 'Any specific requirements or topics you\'d like to focus on...',
    pdfSource: 'PDF Source',
    optional: 'Optional',
    uploadPDFForQuiz: 'Upload a PDF to generate quiz from its content',
    pdfQuizDescription: 'Questions will be based exclusively on the PDF content',
    processingPDF: 'Processing PDF...',
    selectPDF: 'Select PDF File',
    quizWillBeBasedOnPDF: 'Quiz questions will be generated from this PDF',
    autoFilledFromPDF: 'Auto-filled from PDF',
    quizLanguage: 'Quiz Language',
    quizLanguageDesc: 'Choose the language for quiz questions and answers',
    english: 'English',
    arabic: 'Arabic',
    processingMode: 'Processing Mode',
    processingModeDesc: 'Choose between speed and quality for quiz generation',
    speed: 'Speed',
    speedDesc: 'Fast generation using chat mode',
    quality: 'Quality',
    qualityDesc: 'High-quality generation using advanced reasoning',
    cancel: 'Cancel',
    result: 'result',
    s: 's',
    justNow: 'Just now',
    noConversationsFound: 'No conversations found',
    noConversationsYet: 'No conversations yet',
    clearSearch: 'Clear search'
  },
  ar: {
    // Sidebar
    searchPlaceholder: 'البحث في المحادثات...',
    all: 'الكل',
    recent: 'الحديثة',
    archived: 'المؤرشفة',
    allConversations: 'جميع المحادثات',
    quizzes: 'الاختبارات',
    newChat: 'محادثة جديدة',
    settings: 'الإعدادات',
    theme: 'المظهر',
    language: 'اللغة',
    dark: 'داكن',
    light: 'فاتح',
    
    // Chat Interface
    sendMessage: 'اكتب رسالة...',
    generateQuiz: 'إنشاء اختبار',
    uploadPDF: 'رفع ملف PDF',
    think: 'فكر',
    reasoningModeEnabled: 'وضع التفكير مفعل - يستخدم deepseek-reasoner',
    normalMode: 'الوضع العادي - يستخدم deepseek-chat',
    
    // Quiz Config
    configureQuiz: 'إعداد الاختبار',
    customizeQuizExperience: 'خصص تجربة الاختبار الخاصة بك',
    quizType: 'نوع الاختبار',
    multipleChoice: 'اختيار متعدد',
    multipleChoiceDesc: 'اختبار تقليدي مع 4 خيارات لكل سؤال',
    textAnswer: 'إجابة نصية',
    textAnswerDesc: 'أسئلة مفتوحة تتطلب إجابات مكتوبة',
    mixedFormat: 'تنسيق مختلط',
    mixedFormatDesc: 'مزيج من الاختيار المتعدد والإجابات النصية',
    difficultyLevel: 'مستوى الصعوبة',
    easy: 'سهل',
    easyDesc: 'مفاهيم أساسية وأسئلة بسيطة',
    medium: 'متوسط',
    mediumDesc: 'صعوبة متوسطة مع بعض التعقيد',
    hard: 'صعب',
    hardDesc: 'مفاهيم متقدمة وأسئلة صعبة',
    expert: 'خبير',
    expertDesc: 'مستوى مهني يتطلب فهماً عميقاً',
    numberOfQuestions: 'عدد الأسئلة',
    '5Questions': '5 أسئلة',
    '10Questions': '10 أسئلة',
    '15Questions': '15 سؤال',
    '20Questions': '20 سؤال',
    '25Questions': '25 سؤال',
    timeLimit: 'الحد الزمني (بالدقائق)',
    noTimeLimit: 'بدون حد زمني',
    '5Minutes': '5 دقائق',
    '10Minutes': '10 دقائق',
    '15Minutes': '15 دقيقة',
    '20Minutes': '20 دقيقة',
    '30Minutes': '30 دقيقة',
    '45Minutes': '45 دقيقة',
    '60Minutes': '60 دقيقة',
    subjectTopic: 'الموضوع/المادة (اختياري)',
    subjectPlaceholder: 'مثال: جافا سكريبت، التاريخ، الرياضيات...',
    customInstructions: 'تعليمات مخصصة (اختياري)',
    customInstructionsPlaceholder: 'أي متطلبات محددة أو مواضيع تريد التركيز عليها...',
    pdfSource: 'مصدر PDF',
    optional: 'اختياري',
    uploadPDFForQuiz: 'ارفع ملف PDF لإنشاء اختبار من محتواه',
    pdfQuizDescription: 'ستكون الأسئلة مبنية حصرياً على محتوى PDF',
    processingPDF: 'جاري معالجة PDF...',
    selectPDF: 'اختر ملف PDF',
    quizWillBeBasedOnPDF: 'سيتم إنشاء أسئلة الاختبار من هذا الملف',
    autoFilledFromPDF: 'تم التعبئة تلقائياً من PDF',
    quizLanguage: 'لغة الاختبار',
    quizLanguageDesc: 'اختر لغة أسئلة وإجابات الاختبار',
    english: 'الإنجليزية',
    arabic: 'العربية',
    processingMode: 'وضع المعالجة',
    processingModeDesc: 'اختر بين السرعة والجودة لإنشاء الاختبار',
    speed: 'السرعة',
    speedDesc: 'إنشاء سريع باستخدام وضع المحادثة',
    quality: 'الجودة',
    qualityDesc: 'إنشاء عالي الجودة باستخدام التفكير المتقدم',
    cancel: 'إلغاء',
    result: 'نتيجة',
    s: '',
    justNow: 'الآن',
    noConversationsFound: 'لم يتم العثور على محادثات',
    noConversationsYet: 'لا توجد محادثات بعد',
    clearSearch: 'مسح البحث'
  }
}

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('cubic_theme') || localStorage.getItem('pquiz_theme')
    if (saved) {
      return saved === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [language, setLanguage] = useState(() => {
    // Check localStorage first, then default to English
    const saved = localStorage.getItem('cubic_language') || localStorage.getItem('pquiz_language')
    return saved || 'en'
  })

  useEffect(() => {
    // Save theme preference (write both for back-compat)
    localStorage.setItem('cubic_theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('pquiz_theme', isDarkMode ? 'dark' : 'light')
    
    // Update document class for Tailwind dark mode
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    // Save language preference (write both for back-compat)
    localStorage.setItem('cubic_language', language)
    localStorage.setItem('pquiz_language', language)
    
    // Update document direction for RTL
    if (language === 'ar') {
      document.documentElement.dir = 'rtl'
      document.documentElement.lang = 'ar'
    } else {
      document.documentElement.dir = 'ltr'
      document.documentElement.lang = 'en'
    }
  }, [language])

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en')
  }

  const t = (key) => {
    return translations[language][key] || key
  }

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleTheme, 
      language, 
      toggleLanguage, 
      t,
      isRTL: language === 'ar'
    }}>
      {children}
    </ThemeContext.Provider>
  )
}