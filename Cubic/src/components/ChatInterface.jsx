/*
  Cubic — turns PDFs into interactive quizzes + chat (EN/AR, dark/RTL)
  Keep it simple, all client-side. Error handling is "good enough".
*/
import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Send, Upload, FileText, Check, X, Paperclip, Zap, User, Bot, MessageSquare, GraduationCap, Activity, CheckCircle, Box, Loader } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import QuizMessage from './QuizMessage'
import QuizConfig from './QuizConfig'

// Simple markdown parser for basic formatting
const parseMarkdown = (text) => {
  if (!text) return text;
  
  // Convert **bold** to <strong>bold</strong>
  const boldRegex = /\*\*(.*?)\*\*/g;
  return text.replace(boldRegex, '<strong>$1</strong>');
};

const ChatInterface = forwardRef(({ onNewChat, onStartQuiz, currentChatId }, ref) => {
  const { isDarkMode, t, isRTL } = useTheme()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [localChatId, setLocalChatId] = useState(null)
  const [hasGeneratedTitle, setHasGeneratedTitle] = useState(false)
  const [isReasoningMode, setIsReasoningMode] = useState(false)
  const [showQuizConfig, setShowQuizConfig] = useState(false)
  const [pendingQuizConfig, setPendingQuizConfig] = useState(null)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [quizGenerationStartTime, setQuizGenerationStartTime] = useState(null)
  const [quizGenerationElapsed, setQuizGenerationElapsed] = useState(0)
  const [quizGenerationComplete, setQuizGenerationComplete] = useState(false)
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    loadChat: (chat) => {
      setMessages(chat.messages || [])
      setLocalChatId(chat.id)
      setHasGeneratedTitle(true)
      setIsReasoningMode(false)
      setInput('')
      setUploadedFile(null)
    },
    clearChat: () => {
      setMessages([])
      setLocalChatId(null)
      setHasGeneratedTitle(false)
      setIsReasoningMode(false)
      setInput('')
      setUploadedFile(null)
      setIsGeneratingQuiz(false)
      setShowQuizConfig(false)
      setPendingQuizConfig(null)
      setQuizGenerationStartTime(null)
      setQuizGenerationElapsed(0)
      setQuizGenerationComplete(false)
    }
  }), [])
  
  // No hardcoded keys here. Read from Vite env inside callDeepSeekAPI.

  const handleQuizConfigSubmit = async (config) => {
    setShowQuizConfig(false)
    setPendingQuizConfig(config)
    
  

    setIsGeneratingQuiz(true)
    setIsLoading(true)
    setQuizGenerationStartTime(Date.now())
    setQuizGenerationElapsed(0)
    setQuizGenerationComplete(false)
    
    // Add a small delay to ensure state updates are processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Generate a prompt based on the configuration
    let prompt = ''
    
    // Handle PDF content with chunking for large documents
    if (config.pdfContent && config.useCustomPDF) {
      const maxChunkSize = 8000 // Limit chunk size to avoid token limits
      let pdfContentToUse = config.pdfContent
      
      // If PDF content is too large, chunk it intelligently
      if (config.pdfContent.length > maxChunkSize) {
        // Split by pages first, then by paragraphs if needed
        const pages = config.pdfContent.split(/--- Page \d+ ---/)
        let chunkedContent = ''
        let currentLength = 0
        
        for (const page of pages) {
          if (currentLength + page.length <= maxChunkSize) {
            chunkedContent += page
            currentLength += page.length
          } else {
            // If we've reached the limit, break and use what we have
            break
          }
        }
        
        pdfContentToUse = chunkedContent || config.pdfContent.substring(0, maxChunkSize)
      }
      
      prompt = `CRITICAL INSTRUCTION: You are a STRICT quiz generator that MUST create questions EXCLUSIVELY from the provided document content. You are FORBIDDEN from using any external knowledge, general knowledge, or information not explicitly stated in the document below.

PDF DOCUMENT CONTENT:
${pdfContentToUse}

END OF DOCUMENT CONTENT

STRICT REQUIREMENTS:
1. ONLY use information that is EXPLICITLY written in the document above
2. NEVER add information from your general knowledge
3. NEVER make assumptions or inferences beyond what is directly stated
4. If a concept is mentioned but not fully explained in the document, DO NOT elaborate with external knowledge
5. Every question and answer MUST be directly traceable to specific text in the document
6. If the document lacks sufficient content for ${config.questionCount} questions, create fewer questions rather than inventing content

Create a ${config.type} quiz with exactly ${config.questionCount} questions at ${config.difficulty} difficulty level using ONLY the content provided above.

VERIFICATION CHECKLIST - Before finalizing each question, verify:
✓ Is this information explicitly stated in the document?
✓ Can I point to the exact text that supports this question/answer?
✓ Am I using ONLY document content without adding external knowledge?

${config.quizLanguage === 'arabic' ? 'Generate all questions and answers in Arabic language using proper Arabic grammar and vocabulary' : 'Generate all questions and answers in English language'}`
    } else {
      prompt = `Create a high-quality, accurate ${config.type} quiz with exactly ${config.questionCount} questions at ${config.difficulty} difficulty level.`
      
      if (config.subject) {
        prompt += ` The quiz should be about ${config.subject}.`
      }
      
      prompt += `

QUALITY REQUIREMENTS:
- Ensure all questions are factually accurate and well-researched
- Provide clear, unambiguous questions with precise wording
- For multiple choice questions, ensure only one answer is definitively correct
- Avoid trick questions or ambiguous phrasing
- Make sure difficulty level is appropriate: ${config.difficulty === 'easy' ? 'basic concepts and fundamental knowledge' : config.difficulty === 'medium' ? 'intermediate understanding and application' : 'advanced analysis and complex reasoning'}
- Double-check all facts and information for accuracy`
    }
    
    // Add language preference to the prompt
    if (config.quizLanguage === 'arabic') {
      prompt += ' IMPORTANT: Generate all questions and answers in Arabic language. Use proper Arabic grammar and vocabulary.'
    } else {
      prompt += ' IMPORTANT: Generate all questions and answers in English language.'
    }
    
    if (config.type === 'multiple-choice') {
      prompt += ' Each question must have exactly 4 options labeled a), b), c), d) with one correct answer.'
      prompt += `

IMPORTANT: Format the quiz exactly like this:

1. What is the capital of France?
a) London
b) Berlin
c) Paris
d) Madrid
Correct Answer: c)

2. Which planet is closest to the Sun?
a) Venus
b) Mercury
c) Earth
d) Mars
Correct Answer: b)

Make sure to:
- Number each question (1., 2., 3., etc.)
- Use a), b), c), d) for options
- Include "Correct Answer: [letter])" for each question
- End each question with a question mark`
    } else if (config.type === 'text-answer') {
      prompt += ' Create open-ended questions that require written responses. Do NOT include multiple choice options.'
      prompt += `

IMPORTANT: Format the text-answer quiz exactly like this:

1. What are the main causes of climate change and how do they affect global temperatures?
Answer: The main causes include greenhouse gas emissions from fossil fuels, deforestation, and industrial processes, which trap heat in the atmosphere and lead to rising global temperatures.

2. Explain the concept of photosynthesis and its importance to life on Earth.
Answer: Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen, providing energy for plants and oxygen for other organisms.

Make sure to:
- Number each question (1., 2., 3., etc.)
- Use "Answer: [detailed answer]" format
- Provide comprehensive answers that demonstrate understanding
- End each question with a question mark`
    } else if (config.type === 'mixed') {
      prompt += ' Mix multiple choice questions with text-answer questions. Include both types in the quiz.'
      prompt += `

IMPORTANT: Format the mixed quiz exactly like this:

1. What is the capital of France? (Multiple Choice)
a) London
b) Berlin
c) Paris
d) Madrid
Correct Answer: c)

2. Explain the significance of the French Revolution in European history. (Text Answer)
Answer: The French Revolution (1789-1799) was a pivotal event that overthrew the monarchy, established democratic principles, and inspired revolutionary movements across Europe, fundamentally changing the political landscape.

3. Which planet is closest to the Sun? (Multiple Choice)
a) Venus
b) Mercury
c) Earth
d) Mars
Correct Answer: b)

Make sure to:
- Number each question (1., 2., 3., etc.)
- Indicate question type in parentheses
- For multiple choice: use a), b), c), d) options and "Correct Answer: [letter])"
- For text answer: use "Answer: [detailed answer]" format
- Mix the question types throughout the quiz`
    }
    
    if (config.timeLimit > 0) {
      prompt += ` The quiz should be designed to be completed in approximately ${config.timeLimit} minutes.`
    }
    
    if (config.customPrompt) {
      prompt += ` Additional requirements: ${config.customPrompt}`
    }
    
    try {
      // Create new chat ID if this is the first message
      let chatId = localChatId || currentChatId
      if (!chatId) {
        chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        setLocalChatId(chatId)
      }
      
      // Call the API to generate the quiz using appropriate model based on processing mode
      const model = config.processingMode === 'quality' ? 'deepseek-reasoner' : 'deepseek-chat'
      const response = await callDeepSeekAPI(prompt, model)
      
      // Check if the response contains a quiz
      const quizData = detectAndParseQuiz(response, config)
      
      if (quizData && onStartQuiz) {
        // If a quiz is detected, show completion message and delay quiz start
        
        // Save quiz to sidebar immediately with proper type
        const quizTitle = `Quiz: ${quizData.title || config.subject || config.type}`
        const quizSidebarData = {
          id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: quizTitle,
          type: 'quiz',
          timestamp: new Date().toISOString(),
          quiz: quizData,
          results: null // Will be filled when quiz is completed
        }
        
        // Add to chat history for sidebar display
        const existingChats = JSON.parse(localStorage.getItem('cubic_chats') || localStorage.getItem('pquiz_chats') || '[]')
        existingChats.unshift(quizSidebarData)
        localStorage.setItem('cubic_chats', JSON.stringify(existingChats))
        localStorage.setItem('pquiz_chats', JSON.stringify(existingChats)) // legacy key for back-compat
        
        // Refresh sidebar if callback available
        if (onNewChat) {
          onNewChat(quizSidebarData)
        }
        
        // Mark quiz generation as complete
        setQuizGenerationComplete(true)
        
        // Delay the quiz start to allow loading indicator to be visible
        setTimeout(() => {
          onStartQuiz(quizData)
          // Clear loading states after quiz starts
          setIsLoading(false)
          setIsGeneratingQuiz(false)
          setQuizGenerationComplete(false)
        }, 1500) // 1.5 second delay to show the loading indicator
      } else {
        // If quiz detection failed, show an error message
        const errorMessage = {
          text: 'Failed to generate quiz. Please try again with different settings.',
          role: 'assistant',
          timestamp: Date.now()
        }
        
        setMessages(prev => [...prev, errorMessage])
        setIsLoading(false)
        setIsGeneratingQuiz(false)
        setQuizGenerationComplete(false)
      }
      
    } catch (error) {
      console.error('❌ Error generating quiz:', error)
      
      let errorText = error.message || 'Sorry, I encountered an error while generating your quiz. Please try again.'
      
      if (error.message.includes('API key not configured')) {
        errorText = '🔑 API key not configured. Please add your DeepSeek API key to the .env file and restart the server.'
      } else if (error.message.includes('Authentication failed')) {
        errorText = '🔐 Authentication failed. Please check your API key in the .env file.'
      } else if (error.message.includes('Rate limit exceeded')) {
        errorText = '⏱️ Rate limit exceeded. Please wait a moment and try again.'
      }
      
      const errorMessage = {
        text: errorText,
        role: 'assistant',
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
      setIsGeneratingQuiz(false)
      setQuizGenerationComplete(false)
    }
  }

  const handleQuizConfigCancel = () => {
    setShowQuizConfig(false)
    setPendingQuizConfig(null)
  }

  const showQuizConfiguration = () => {
    setShowQuizConfig(true)
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea with improved performance
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 128 // max-h-32 = 8rem = 128px
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // Timer for quiz generation
  useEffect(() => {
    let interval = null
    if (isGeneratingQuiz && quizGenerationStartTime) {
      interval = setInterval(() => {
        setQuizGenerationElapsed(Date.now() - quizGenerationStartTime)
      }, 100)
    } else {
      setQuizGenerationElapsed(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGeneratingQuiz, quizGenerationStartTime])

  const generateChatTitle = async (firstMessage) => {
    try {
      // Get language from localStorage since we can't use hooks inside async functions
      const savedLanguage = localStorage.getItem('cubic_language') || localStorage.getItem('pquiz_language') || 'en'
      const isArabic = savedLanguage === 'ar'
      
      const titlePrompt = isArabic 
        ? `قم بإنشاء عنوان قصير ووصفي (3-5 كلمات) للمحادثة التي تبدأ بـ: "${firstMessage}". أرجع العنوان فقط، لا شيء آخر. يجب أن يكون العنوان باللغة العربية.`
        : `Generate a short, descriptive title (3-5 words) for a chat that starts with: "${firstMessage}". Only return the title, nothing else.`
      
      const title = await callDeepSeekAPI(titlePrompt, 'deepseek-chat')
      return title.replace(/['"]/g, '').trim()
    } catch (error) {
      console.error('Error generating title:', error)
      // Get language from localStorage for fallback
      const savedLanguage = localStorage.getItem('cubic_language') || localStorage.getItem('pquiz_language') || 'en'
      const isArabic = savedLanguage === 'ar'
      return isArabic ? `محادثة ${new Date().toLocaleTimeString()}` : `Chat ${new Date().toLocaleTimeString()}`
    }
  }

  const saveChatToHistory = (chatId, title, messages) => {
    const chatData = {
      id: chatId,
      title: title,
      messages: messages,
      timestamp: new Date().toISOString(),
      type: 'chat'
    }
    
    // Get existing chats from localStorage
    const existingChats = JSON.parse(localStorage.getItem('cubic_chats') || localStorage.getItem('pquiz_chats') || '[]')
    
    // Update existing chat or add new one
    const chatIndex = existingChats.findIndex(chat => chat.id === chatId)
    if (chatIndex >= 0) {
      existingChats[chatIndex] = chatData
    } else {
      existingChats.unshift(chatData)
    }
    
    // Keep only last 50 chats
    const limitedChats = existingChats.slice(0, 50)
    localStorage.setItem('cubic_chats', JSON.stringify(limitedChats))
    localStorage.setItem('pquiz_chats', JSON.stringify(limitedChats)) // legacy key for back-compat
    
    // Return chat data for real-time updates
    return chatData
  }
  const callDeepSeekAPI = async (userInput, model) => {
    try {
      // Check if API key is configured
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
      if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        throw new Error('API key not configured. Please add your DeepSeek API key to the .env file.')
      }

      // Format the message properly for the API
      const messages = [
        {
          role: 'user',
          content: userInput
        }
      ]

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4000
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', response.status, errorData)
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your API key in the .env file.')
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
        }
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid API response:', data)
        throw new Error('Invalid response from API')
      }

      return data.choices[0].message.content
    } catch (error) {
      console.error('DeepSeek API Error:', error)
      throw error
    }
  }

  // Quiz detection and parsing logic
  const detectAndParseQuiz = (responseText, config = null) => {
    console.log('=== QUIZ DETECTION DEBUG START ===')
    console.log('Input text length:', responseText.length)
    console.log('First 500 chars:', responseText.substring(0, 500))
    console.log('Config provided:', config)
    console.log('Config quizLanguage:', config?.quizLanguage)
    
    // Check if the response contains quiz-related keywords and structure
    const quizKeywords = [
      // English keywords
      'quiz', 'question', 'multiple choice', 'test', 'exam', 'assessment', 'mcq', 'correct answer',
      // Arabic keywords
      'اختبار', 'سؤال', 'أسئلة', 'اختيار متعدد', 'امتحان', 'تقييم', 'الإجابة الصحيحة', 'إجابة صحيحة'
    ]
    console.log('Checking for quiz keywords...')
    const foundKeywords = quizKeywords.filter(keyword => 
      responseText.toLowerCase().includes(keyword.toLowerCase())
    )
    console.log('Found keywords:', foundKeywords)
    
    const hasQuizKeywords = foundKeywords.length > 0

    // Also check for numbered questions pattern
    const hasNumberedQuestions = /\d+\.\s*.*\?/.test(responseText)
    const hasOptions = /[a-d]\)\s*/.test(responseText) || /[أبجد]\)\s*/.test(responseText)
    const hasCorrectAnswers = /correct answer:/i.test(responseText) || /الإجابة الصحيحة:/i.test(responseText)

    console.log('Pattern checks:')
    console.log('- hasQuizKeywords:', hasQuizKeywords)
    console.log('- hasNumberedQuestions:', hasNumberedQuestions)
    console.log('- hasOptions:', hasOptions)
    console.log('- hasCorrectAnswers:', hasCorrectAnswers)

    if (!hasQuizKeywords && !hasNumberedQuestions) {
      console.log('❌ No quiz indicators found - returning null')
      return null
    }
    
    console.log('✅ Quiz indicators found, proceeding with parsing...')

    try {
      // Try to extract JSON quiz format first
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          const quizData = JSON.parse(jsonMatch[1])
          if (quizData.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
            // Validate question structure
            const validQuestions = quizData.questions.filter(q => 
              q.question && 
              q.options && 
              Array.isArray(q.options) && 
              q.options.length >= 2 &&
              typeof q.correctAnswer === 'number' &&
              q.correctAnswer >= 0 &&
              q.correctAnswer < q.options.length
            )

            if (validQuestions.length > 0) {
              return {
                title: quizData.title || (config ? `${config.subject || config.type} Quiz` : 'Generated Quiz'),
                description: quizData.description || (config ? `AI-generated ${config.difficulty} difficulty quiz about ${config.subject || config.type}` : 'AI-generated quiz based on your request'),
                questions: validQuestions,
                difficulty: config?.difficulty || quizData.difficulty || 'medium',
                category: 'AI Generated',
                subject: config?.subject || quizData.subject || 'General Knowledge',
                maxScore: validQuestions.length
              }
            }
          }
        } catch (jsonError) {
          console.warn('JSON parsing failed, trying text parsing:', jsonError)
        }
      }

      // Enhanced text parsing for the specific format shown
      const lines = responseText.split('\n').map(line => line.trim()).filter(line => line)
      
      const questions = []
      let currentQuestion = null
      let questionIndex = 0
      let collectingOptions = false
      let correctAnswerFound = false

      // Use config values if provided, otherwise try to extract from text
      // Get language from localStorage since we can't use hooks inside this function
      const savedLanguage = localStorage.getItem('cubic_language') || localStorage.getItem('pquiz_language') || 'en'
      const isArabic = savedLanguage === 'ar'
      
      let quizTitle = isArabic ? 'اختبار مُولد' : 'Generated Quiz'
      let quizSubject = isArabic ? 'معرفة عامة' : 'General Knowledge'
      let quizDifficulty = 'medium'

      if (config) {
        if (isArabic) {
          quizTitle = config.subject ? `اختبار ${config.subject}` : `اختبار ${config.type === 'multiple-choice' ? 'اختيار متعدد' : config.type === 'text-answer' ? 'إجابة نصية' : 'مختلط'}`
        } else {
          quizTitle = config.subject ? `${config.subject} Quiz` : `${config.type} Quiz`
        }
        quizSubject = config.subject || config.type
        quizDifficulty = config.difficulty
      } else {
        // Fallback to text extraction
        const titleMatch = responseText.match(/###?\s*\*?\*?([^*\n]+(?:Quiz|Test|Assessment)[^*\n]*)\*?\*?/i)
        if (titleMatch) {
          quizTitle = titleMatch[1].trim()
        }

        const subjectMatch = responseText.match(/about\s+([^,\n]+)/i) || responseText.match(/quiz:\s*([^,\n(]+)/i)
        if (subjectMatch) {
          quizSubject = subjectMatch[1].trim()
        }

        const difficultyMatch = responseText.match(/(easy|medium|hard|expert)\s+difficulty/i)
        if (difficultyMatch) {
          quizDifficulty = difficultyMatch[1].toLowerCase()
        }
      }

      console.log('Starting line-by-line parsing...')
      console.log('Total lines to process:', lines.length)
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        console.log(`Line ${i + 1}: "${line}"`)
        
        // Skip markdown headers, instructions, and separators
        if (line.startsWith('#') || line.startsWith('**Instructions') || line === '---' || line.startsWith('**How did you do')) {
          console.log('  → Skipping header/instruction line')
          continue
        }

        // Detect question start patterns - more flexible (support both English ? and Arabic ؟)
        const questionPatterns = [
          /^(\d+)\.\s*(.+[؟?])\s*$/,                    // 1. Question text? or ؟
          /^#{1,4}\s*\*?\*?(\d+)\.\s*(.+[؟?])\s*\*?\*?$/,  // #### **1. Question text?** or ؟
          /^Q(\d+)\.?\s*(.+[؟?])\s*$/i,                 // Q1. Question text? or ؟
          /^Question\s*(\d+)\.?\s*(.+[؟?])\s*$/i,       // Question 1. Text? or ؟
          /^سؤال\s*(\d+)\.?\s*(.+[؟?])\s*$/i           // Arabic: سؤال 1. Text؟
        ]

        let questionMatch = null
        for (const pattern of questionPatterns) {
          questionMatch = line.match(pattern)
          if (questionMatch) break
        }

        if (questionMatch) {
          console.log('  ✅ Found question:', questionMatch[0])
          
          // Save previous question if it's complete
          // Text answers only need 1 option, multiple choice needs 2+
          const isPreviousQuestionValid = currentQuestion && 
            ((currentQuestion.type === 'text-answer' && currentQuestion.options.length === 1 && currentQuestion.correctAnswer === 0) || // Text answer
             (currentQuestion.type === 'multiple-choice' && currentQuestion.options.length >= 2 && currentQuestion.correctAnswer !== -1) || // Multiple choice
             (currentQuestion.options.length === 1 && currentQuestion.correctAnswer === 0) || // Legacy text answer
             (currentQuestion.options.length >= 2 && currentQuestion.correctAnswer !== -1))   // Legacy multiple choice
          
          if (currentQuestion) {
            console.log('  → Previous question validity:', isPreviousQuestionValid)
            console.log('  → Previous question:', currentQuestion)
          }
          
          if (isPreviousQuestionValid) {
            questions.push(currentQuestion)
            console.log('  → Added previous question to quiz')
          }
          
          const questionText = (questionMatch[2] || questionMatch[1]).trim()
          currentQuestion = {
            question: questionText,
            options: [],
            correctAnswer: -1,
            explanation: null
          }
          console.log('  → Created new question:', questionText)
          collectingOptions = true
          correctAnswerFound = false
          continue
        }

        // Detect correct answer patterns FIRST - handle multiple choice, text answer, and mixed formats
        if (currentQuestion && !correctAnswerFound) {
          // Text answer format: "Answer: text" (for text-answer and mixed quizzes)
          const textAnswerPatterns = [
            /^Answer:\s*(.+)$/i,           // English: Answer: text
            /^الإجابة:\s*(.+)$/i,          // Arabic: الإجابة: text
            /^إجابة:\s*(.+)$/i            // Arabic: إجابة: text
          ]
          
          for (const pattern of textAnswerPatterns) {
            const textAnswerMatch = line.match(pattern)
            if (textAnswerMatch) {
              console.log('  ✅ Found text answer:', textAnswerMatch[1])
              // For text answers, we store the answer as a single option and set correctAnswer to 0
              // Also mark this as a text answer question
              currentQuestion.options = [textAnswerMatch[1].trim()]
              currentQuestion.correctAnswer = 0
              currentQuestion.type = 'text-answer'
              correctAnswerFound = true
              collectingOptions = false
              console.log('  → Set as text-answer question')
              continue
            }
          }

          // Multiple choice format: "Correct Answer: a)" (for multiple-choice and mixed quizzes)
          if (currentQuestion.options.length > 0) {
            const answerPatterns = [
              // English patterns
              /✅\s*\*?\*?Correct\s+Answer:\s*([a-dA-D])\)/i,
              /\*?\*?Correct\s+Answer:\s*([a-dA-D])\)/i,
              /Answer:\s*([a-dA-D])\)/i,
              /Correct:\s*([a-dA-D])\)/i,
              /✅.*?([a-dA-D])\)/i,
              // Arabic patterns
              /الإجابة\s+الصحيحة:\s*([a-dA-Dأبجد])\)/i,
              /إجابة\s+صحيحة:\s*([a-dA-Dأبجد])\)/i,
              /الصحيحة:\s*([a-dA-Dأبجد])\)/i,
              /الإجابة:\s*([a-dA-Dأبجد])\)/i
            ]

            for (const pattern of answerPatterns) {
              const answerMatch = line.match(pattern)
              if (answerMatch) {
                console.log('  ✅ Found correct answer pattern:', answerMatch[0])
                const answerLetter = answerMatch[1].toLowerCase()
                console.log('  → Answer letter:', answerLetter)
                let answerIndex = -1
                
                // Handle English letters (a-d)
                if (answerLetter >= 'a' && answerLetter <= 'd') {
                  answerIndex = answerLetter.charCodeAt(0) - 97
                  console.log('  → English letter mapped to index:', answerIndex)
                }
                // Handle Arabic letters (أ، ب، ج، د)
                else if (answerLetter === 'أ') {
                  answerIndex = 0
                  console.log('  → Arabic letter أ mapped to index:', answerIndex)
                } else if (answerLetter === 'ب') {
                  answerIndex = 1
                  console.log('  → Arabic letter ب mapped to index:', answerIndex)
                } else if (answerLetter === 'ج') {
                  answerIndex = 2
                  console.log('  → Arabic letter ج mapped to index:', answerIndex)
                } else if (answerLetter === 'د') {
                  answerIndex = 3
                  console.log('  → Arabic letter د mapped to index:', answerIndex)
                }
                
                if (answerIndex >= 0 && answerIndex <= 3) {
                  currentQuestion.correctAnswer = answerIndex
                  currentQuestion.type = 'multiple-choice'
                  correctAnswerFound = true
                  collectingOptions = false
                  console.log('  → Set correct answer index:', answerIndex)
                  continue // Skip to next line after finding correct answer
                } else {
                  console.log('  ❌ Invalid answer index:', answerIndex)
                }
              }
            }
          }
        }

        // Detect options - handle various formats (only if not a correct answer line)
        if (collectingOptions && currentQuestion && !correctAnswerFound) {
          const optionPatterns = [
            // English patterns
            /^([a-dA-D])\)\s*(.+)$/,              // a) Option text
            /^([a-dA-D])\.?\s*(.+)$/,             // a. Option text
            /^-\s*([a-dA-D])\)\s*(.+)$/,         // - a) Option text
            /^\*\s*([a-dA-D])\)\s*(.+)$/,        // * a) Option text
            // Arabic patterns
            /^([أبجد])\)\s*(.+)$/,                // أ) Option text
            /^([أبجد])\.?\s*(.+)$/,               // أ. Option text
            /^-\s*([أبجد])\)\s*(.+)$/,           // - أ) Option text
            /^\*\s*([أبجد])\)\s*(.+)$/           // * أ) Option text
          ]

          let optionMatch = null
          for (const pattern of optionPatterns) {
            optionMatch = line.match(pattern)
            if (optionMatch) break
          }

          if (optionMatch) {
            console.log('  ✅ Found option:', optionMatch[0])
            currentQuestion.options.push(optionMatch[2].trim())
            console.log('  → Added option:', optionMatch[2].trim())
            console.log('  → Total options so far:', currentQuestion.options.length)
            continue
          } else {
            console.log('  → No option pattern matched')
          }
        }
      }

      console.log('Finished parsing lines. Processing final question...')
      
      // Add the last question if it's complete
      // Text answers only need 1 option, multiple choice needs 2+
      const isValidQuestion = currentQuestion && 
        ((currentQuestion.type === 'text-answer' && currentQuestion.options.length === 1 && currentQuestion.correctAnswer === 0) || // Text answer
         (currentQuestion.type === 'multiple-choice' && currentQuestion.options.length >= 2 && currentQuestion.correctAnswer !== -1) || // Multiple choice
         (currentQuestion.options.length === 1 && currentQuestion.correctAnswer === 0) || // Legacy text answer
         (currentQuestion.options.length >= 2 && currentQuestion.correctAnswer !== -1))   // Legacy multiple choice
      
      console.log('Final question validity:', isValidQuestion)
      if (currentQuestion) {
        console.log('Final question details:', currentQuestion)
      }
      
      if (isValidQuestion) {
        questions.push(currentQuestion)
        console.log('✅ Added final question to quiz')
      }

      console.log('Total questions parsed:', questions.length)
      console.log('All questions:', questions)

      // Validate and return quiz if we have valid questions
      if (questions.length > 0) {
        console.log('✅ Creating quiz object with', questions.length, 'questions')
        const difficultyArabic = {
          'easy': 'سهل',
          'medium': 'متوسط', 
          'hard': 'صعب',
          'expert': 'خبير'
        }
        
        const description = isArabic 
          ? `اختبار مُولد بالذكاء الاصطناعي بمستوى ${difficultyArabic[quizDifficulty] || 'متوسط'} حول ${quizSubject}`
          : `AI-generated ${quizDifficulty} difficulty quiz about ${quizSubject}`
        
        const category = isArabic ? 'مُولد بالذكاء الاصطناعي' : 'AI Generated'
        
        const quizResult = {
          title: quizTitle,
          description: description,
          questions: questions,
          difficulty: quizDifficulty,
          category: category,
          subject: quizSubject,
          maxScore: questions.length,
          timeLimit: config?.timeLimit || Math.max(questions.length * 60, 300) // Use config time limit or default
        }
        
        console.log('✅ QUIZ SUCCESSFULLY CREATED:', quizResult)
        console.log('=== QUIZ DETECTION DEBUG END ===')
        return quizResult
      } else {
        console.log('❌ No valid questions found - returning null')
        console.log('=== QUIZ DETECTION DEBUG END ===')
      }
    } catch (error) {
      console.error('❌ Error parsing quiz:', error)
      console.log('=== QUIZ DETECTION DEBUG END ===')
    }

    console.log('❌ Returning null - quiz detection failed')
    console.log('=== QUIZ DETECTION DEBUG END ===')
    return null
  }

  const handleFileUpload = useCallback((file) => {
    if (file && file.type === 'application/pdf') {
      setIsUploading(true)
      setUploadProgress(0)
      
      // Simulate upload progress with smooth animation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            setUploadProgress(100)
            setTimeout(() => {
              setUploadedFile(file)
              setIsUploading(false)
              setUploadProgress(0)
            }, 300)
            return 100
          }
          return Math.min(prev + Math.random() * 15 + 5, 95)
        })
      }, 100)
      
    } else {
      // Show error animation
      const uploadButton = document.querySelector('[data-upload-button]')
      if (uploadButton) {
        uploadButton.classList.add('animate-pulse')
        setTimeout(() => {
          uploadButton.classList.remove('animate-pulse')
        }, 1000)
      }
      alert('Please upload a PDF file only.')
    }
  }, [])

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file)
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFileUpload])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find(file => file.type === 'application/pdf')
    
    if (pdfFile) {
      handleFileUpload(pdfFile)
    } else if (files.length > 0) {
      alert('Please upload a PDF file only.')
    }
  }, [handleFileUpload])



  const handleSubmit = useCallback(async (e, useReasoning = false) => {
    e.preventDefault()
    
    // Use the reasoning mode state if no explicit parameter is passed
    const shouldUseReasoning = useReasoning || isReasoningMode
    
    if ((!input.trim() && !uploadedFile) || isLoading) return

    const userInput = input.trim() || `Please analyze this uploaded file: ${uploadedFile?.name}`
    
    // Create new chat ID if this is the first message
    let chatId = localChatId || currentChatId
    if (!chatId) {
      chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setLocalChatId(chatId)
    }
    
    const userMessage = {
      text: userInput,
      role: 'user',
      timestamp: Date.now(),
      isFile: !!uploadedFile && !input.trim(),
      fileName: uploadedFile?.name,
      fileSize: uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : null
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setUploadedFile(null)
    setIsLoading(true)

    let botMessage = null
    let updatedMessages = []

    try {
      // Use reasoner model if in reasoning mode, otherwise use chat model
      const model = shouldUseReasoning ? 'deepseek-reasoner' : 'deepseek-chat'
      const response = await callDeepSeekAPI(userInput, model)
      
      // Check if the response contains a quiz
      const quizData = detectAndParseQuiz(response, null) // null config for regular chat
      console.log('Quiz detection result:', quizData)
      console.log('Response text:', response.substring(0, 500) + '...')
      
      if (quizData && onStartQuiz) {
        // If a quiz is detected, start the quiz interface immediately
        console.log('Starting quiz with data:', quizData)
        onStartQuiz(quizData)
        
        // Create a bot message indicating the quiz was generated (without the full quiz content)
        botMessage = {
          text: `✅ Quiz generated successfully! The quiz interface has been opened with ${quizData.questions.length} questions about "${quizData.subject}" at ${quizData.difficulty} difficulty level.`,
          role: 'assistant',
          timestamp: Date.now(),
          isReasoning: shouldUseReasoning,
          isQuizGenerated: true // Flag to indicate this was a quiz generation
        }
      } else {
        // Regular response without quiz
        botMessage = {
          text: response,
          role: 'assistant',
          timestamp: Date.now(),
          isReasoning: shouldUseReasoning
        }
      }

      updatedMessages = [...messages, userMessage, botMessage]
      setMessages(updatedMessages)

    } catch (error) {
      console.error('Error calling DeepSeek API:', error)
      
      // Use the specific error message from the API function
      let errorText = error.message || 'Sorry, I encountered an error while processing your request. Please try again.'
      
      // Add helpful context for common errors
      if (error.message.includes('API key not configured')) {
        errorText = '🔑 API key not configured. Please add your DeepSeek API key to the .env file and restart the server.'
      } else if (error.message.includes('Authentication failed')) {
        errorText = '🔐 Authentication failed. Please check your API key in the .env file.'
      } else if (error.message.includes('Rate limit exceeded')) {
        errorText = '⏱️ Rate limit exceeded. Please wait a moment and try again.'
      } else if (error.message.includes('Server error')) {
        errorText = '🔧 Server error. Please try again later.'
      }
      
      botMessage = {
        text: errorText,
        role: 'assistant',
        timestamp: Date.now(),
        isReasoning: shouldUseReasoning
      }
      
      updatedMessages = [...messages, userMessage, botMessage]
      setMessages(prev => [...prev, botMessage])
    } finally {
      setIsLoading(false)
    }

    // Generate title for the first message and save to history (after loading is done)
    if (botMessage && !hasGeneratedTitle && updatedMessages.length >= 2) {
      setHasGeneratedTitle(true)
      // Don't show loading indicator for title generation
      try {
        const title = await generateChatTitle(userInput)
        const chatData = saveChatToHistory(chatId, title, updatedMessages)
        // Trigger real-time update in sidebar
        if (onNewChat) {
          onNewChat(chatData)
        }
      } catch (error) {
        console.error('Error generating title:', error)
        // Save with default title if generation fails
        const defaultTitle = `Chat ${new Date().toLocaleTimeString()}`
        const chatData = saveChatToHistory(chatId, defaultTitle, updatedMessages)
        if (onNewChat) {
          onNewChat(chatData)
        }
      }
    } else if (hasGeneratedTitle && botMessage) {
      // Update existing chat in history
      const existingChats = JSON.parse(localStorage.getItem('cubic_chats') || localStorage.getItem('pquiz_chats') || '[]')
      const existingChat = existingChats.find(chat => chat.id === chatId)
      if (existingChat) {
        const chatData = saveChatToHistory(chatId, existingChat.title, updatedMessages)
        if (onNewChat) {
          onNewChat(chatData)
        }
      }
    }
  }, [input, uploadedFile, callDeepSeekAPI, isReasoningMode, isLoading, messages, localChatId, hasGeneratedTitle, generateChatTitle, saveChatToHistory])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value)
  }, [])

  const removeUploadedFile = useCallback(() => {
    setUploadedFile(null)
  }, [])

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])



  return (
    <div 
      className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-300 relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Elegant Loading Indicator */}
      {(isLoading || isGeneratingQuiz || quizGenerationStartTime > 0) && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-300 dark:border-gray-600 rounded-xl shadow-xl px-6 py-4 transition-all duration-300 animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                {quizGenerationComplete ? (
                  <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : isGeneratingQuiz ? (
                  <Zap className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse"></div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isGeneratingQuiz ? (
                    quizGenerationComplete ? (isRTL ? 'تم إنشاء الاختبار بنجاح!' : 'Quiz generated successfully!') : (isRTL ? 'جاري إنشاء الاختبار...' : 'Generating your quiz...')
                  ) : (
                    isRTL ? 'جاري المعالجة...' : 'Processing...'
                  )}
                </span>
                {isGeneratingQuiz && quizGenerationElapsed > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {Math.floor(quizGenerationElapsed / 1000)}s
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {quizGenerationComplete ? (isRTL ? 'بدء الاختبار...' : 'Starting quiz...') : (isRTL ? 'يرجى الانتظار' : 'Please wait')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center z-50 transition-colors duration-200">
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{isRTL ? 'اسحب ملف PDF هنا' : 'Drop your PDF file here'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'ملفات PDF فقط مدعومة' : 'Only PDF files are supported'}</p>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95 flex items-center justify-center z-40 transition-colors duration-200">
          <div className="text-center">
            <div className="w-32 h-32 relative mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - uploadProgress / 100)}`}
                  className="text-gray-600 dark:text-gray-300 transition-all duration-300 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">{Math.round(uploadProgress)}%</span>
              </div>
            </div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{isRTL ? 'جاري رفع ملف PDF...' : 'Uploading PDF...'}</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">

              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const isBot = message.role === 'assistant';
                
                return (
                  <div key={`${message.timestamp}-${index}`} className={`flex ${isRTL ? (isUser ? 'justify-start' : 'justify-end') : (isUser ? 'justify-end' : 'justify-start')} mb-6`}>
                    <div className={`flex max-w-[85%] items-start gap-3 ${isRTL ? (isUser ? 'flex-row' : 'flex-row-reverse') : (isUser ? 'flex-row-reverse' : 'flex-row')}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isUser 
                          ? 'bg-gray-600 dark:bg-gray-700' 
                          : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      } transition-colors duration-200`}>
                        {isUser ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Box className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`rounded-2xl px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} ${
                        isUser 
                          ? 'bg-gray-600 dark:bg-gray-700 text-white' 
                          : `bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border ${message.isReasoning ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-750' : 'border-gray-200 dark:border-gray-700'}`
                      } transition-colors duration-200`}>
                        {/* File attachment indicator */}
                        {message.isFile ? (
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 flex-shrink-0" />
                            <div>
                              <p className="text-base font-medium">{message.fileName}</p>
                              <p className="text-sm opacity-75">{message.fileSize}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Check if this is a quiz message */}
                             {isBot && message.quizData ? (
                               <QuizMessage 
                                 quiz={message.quizData} 
                                 onStartQuiz={onStartQuiz}
                               />
                             ) : (
                              <>
                                {isBot ? (
                                  <div 
                                    className="text-base leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content || message.text) }}
                                  />
                                ) : (
                                  <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content || message.text}</p>
                                )}
                                {message.isReasoning && (
                                  <div className="mt-2">
                                    <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                                      Reasoning Mode
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}


              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Quiz Configuration Modal */}
       {showQuizConfig && (
         <QuizConfig
           onConfigSubmit={handleQuizConfigSubmit}
           onCancel={handleQuizConfigCancel}
         />
       )}

      {/* Input Area */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-6 transition-colors duration-300">
        <div className="w-full">
          {/* File Upload Indicator */}
          {uploadedFile && (
            <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {isRTL ? 'جاهز للإرسال' : 'Ready to send'}</p>
                </div>
              </div>
              <button
                onClick={removeUploadedFile}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                aria-label="Remove file"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="relative bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus-within:border-gray-500 dark:focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-500 dark:focus-within:ring-gray-400 transition-all duration-200 input-container">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={t('sendMessage')}
                className={`w-full px-6 py-4 ${isRTL ? 'pl-24 pr-6' : 'pr-24 pl-6'} bg-transparent border-none outline-none resize-none text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[56px] max-h-32 scrollbar-hidden transition-colors duration-200`}
                rows={1}
                aria-label="Message input"
                disabled={isLoading}
              />
              
              {/* Action Buttons */}
              <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} bottom-3 flex ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                <button
                   type="button"
                   onClick={showQuizConfiguration}
                   className={`p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 ${isGeneratingQuiz ? 'animate-pulse' : ''}`}
                   aria-label={t('generateQuiz')}
                   title={t('generateQuiz')}
                   disabled={isLoading || isGeneratingQuiz}
                 >
                   <GraduationCap className="w-4 h-4" />
                 </button>

                <button
                  type="button"
                  onClick={() => setIsReasoningMode(!isReasoningMode)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isReasoningMode 
                      ? 'bg-gray-600 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  aria-label={isReasoningMode ? t('reasoningModeEnabled') : t('normalMode')}
                  title={isReasoningMode ? t('reasoningModeEnabled') : t('normalMode')}
                >
                  <Loader className={`w-4 h-4 ${isReasoningMode ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={triggerFileUpload}
                  data-upload-button
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  aria-label={t('uploadPDF')}
                  title={t('uploadPDF')}
                  disabled={isLoading || isUploading}
                >
                  <Upload className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="submit"
                  className="p-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50"
                  disabled={(!input.trim() && !uploadedFile) || isLoading}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Model indicator */}
          <div className="mt-2 flex justify-end">
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {isReasoningMode ? 'deepseek-reasoner' : 'deepseek-chat'}
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="PDF file upload"
          />
        </div>
      </footer>
    </div>
  )
})

export default ChatInterface