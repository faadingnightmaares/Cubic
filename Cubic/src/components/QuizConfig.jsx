/*
  Cubic — Quiz config: pick type/difficulty/lang, optional PDF extraction
  PDF parsing is chunked to keep things snappy.
*/
import React, { useState, useRef } from 'react'
import { ChevronDown, GraduationCap, ClipboardList, PenTool, Sparkles, Upload, FileText, X, Check, Zap, Award } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const QuizConfig = ({ onConfigSubmit, onCancel }) => {
  const { t, isRTL } = useTheme()
  const [config, setConfig] = useState({
    type: 'multiple-choice',
    difficulty: 'medium',
    questionCount: 10,
    timeLimit: 0, // 0 means no time limit
    subject: '',
    customPrompt: '',
    pdfFile: null,
    useCustomPDF: false,
    quizLanguage: 'english', // Default to English
    processingMode: 'speed' // 'speed' for chat, 'quality' for reasoner
  })
  const [isProcessingPDF, setIsProcessingPDF] = useState(false)
  const [pdfContent, setPdfContent] = useState('')
  const fileInputRef = useRef(null)

  const quizTypes = [
    {
      id: 'multiple-choice',
      name: t('multipleChoice'),
      description: t('multipleChoiceDesc'),
      icon: ClipboardList
    },
    {
      id: 'text-answer',
      name: t('textAnswer'),
      description: t('textAnswerDesc'),
      icon: PenTool
    },
    {
      id: 'mixed',
      name: t('mixedFormat'),
      description: t('mixedFormatDesc'),
      icon: Sparkles
    }
  ]

  const difficulties = [
    { id: 'easy', name: t('easy'), description: t('easyDesc') },
    { id: 'medium', name: t('medium'), description: t('mediumDesc') },
    { id: 'hard', name: t('hard'), description: t('hardDesc') },
    { id: 'expert', name: t('expert'), description: t('expertDesc') }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Include PDF content in the config if available
    const finalConfig = {
      ...config,
      pdfContent: config.useCustomPDF ? pdfContent : null
    }
    
    onConfigSubmit(finalConfig)
  }

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  // PDF Processing Functions
  const processPDF = async (file) => {
    setIsProcessingPDF(true)
    try {
      // Dynamic import to avoid build issues
      const pdfjsLib = await import('pdfjs-dist')
      
      // Configure PDF.js worker properly for Vite/React environment
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
      
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      })
      const pdf = await loadingTask.promise
      
      let fullText = ''
      const totalPages = pdf.numPages
      
      // Process pages in chunks to handle large PDFs efficiently
      const chunkSize = 5 // Process 5 pages at a time
      for (let i = 1; i <= totalPages; i += chunkSize) {
        const endPage = Math.min(i + chunkSize - 1, totalPages)
        const chunkPromises = []
        
        for (let pageNum = i; pageNum <= endPage; pageNum++) {
          chunkPromises.push(
            pdf.getPage(pageNum).then(page => 
              page.getTextContent().then(textContent => {
                const pageText = textContent.items
                  .map(item => item.str)
                  .join(' ')
                  .trim()
                return { pageNum, text: pageText }
              })
            )
          )
        }
        
        const chunkResults = await Promise.all(chunkPromises)
        chunkResults
          .sort((a, b) => a.pageNum - b.pageNum)
          .forEach(result => {
            if (result.text) {
              fullText += `\n\n--- Page ${result.pageNum} ---\n${result.text}`
            }
          })
      }
      
      // Clean and optimize the text
      const cleanedText = fullText
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim()
      
      setPdfContent(cleanedText)
      updateConfig('pdfFile', file)
      updateConfig('useCustomPDF', true)
      
      // Auto-fill subject if empty
      if (!config.subject) {
        const fileName = file.name.replace('.pdf', '').replace(/[_-]/g, ' ')
        updateConfig('subject', fileName)
      }
      
    } catch (error) {
      console.error('Error processing PDF:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Error processing PDF. Please try again with a different file.'
      
      if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The selected file appears to be corrupted or not a valid PDF. Please try a different file.'
      } else if (error.message.includes('password')) {
        errorMessage = 'This PDF is password-protected. Please use an unprotected PDF file.'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error while loading PDF processor. Please check your internet connection and try again.'
      }
      
      alert(errorMessage)
      
      // Reset PDF state on error
      updateConfig('pdfFile', null)
      updateConfig('useCustomPDF', false)
      setPdfContent('')
    } finally {
      setIsProcessingPDF(false)
    }
  }

  const handleFileUpload = (file) => {
    if (file && file.type === 'application/pdf') {
      processPDF(file)
    } else {
      alert('Please upload a PDF file only.')
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file)
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePDF = () => {
    updateConfig('pdfFile', null)
    updateConfig('useCustomPDF', false)
    updateConfig('subject', '') // Clear subject when removing PDF
    setPdfContent('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('configureQuiz')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('customizeQuizExperience')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quiz Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('quizType')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quizTypes.map((type) => {
                const IconComponent = type.icon
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => updateConfig('type', type.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      config.type === type.id
                        ? 'border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className="w-6 h-6 text-gray-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{type.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quiz Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('quizLanguage')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('quizLanguageDesc')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateConfig('quizLanguage', 'english')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  config.quizLanguage === 'english'
                    ? 'border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <h3 className="font-medium text-gray-900 dark:text-white">{t('english')}</h3>
              </button>
              <button
                type="button"
                onClick={() => updateConfig('quizLanguage', 'arabic')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  config.quizLanguage === 'arabic'
                    ? 'border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <h3 className="font-medium text-gray-900 dark:text-white">{t('arabic')}</h3>
              </button>
            </div>
          </div>

          {/* Processing Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('processingMode')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('processingModeDesc')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateConfig('processingMode', 'speed')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.processingMode === 'speed'
                    ? 'border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{t('speed')}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('speedDesc')}</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateConfig('processingMode', 'quality')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.processingMode === 'quality'
                    ? 'border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-purple-500" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{t('quality')}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('qualityDesc')}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* PDF Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('pdfSource')} <span className="text-xs text-gray-500">({t('optional')})</span>
            </label>
            
            {!config.useCustomPDF ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('uploadPDFForQuiz')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  {t('pdfQuizDescription')}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPDF}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isProcessingPDF ? t('processingPDF') : t('selectPDF')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                      {config.pdfFile?.name}
                    </h4>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {config.pdfFile ? `${(config.pdfFile.size / 1024 / 1024).toFixed(2)} MB` : ''} • 
                      {pdfContent ? ` ${Math.ceil(pdfContent.length / 1000)}K characters extracted` : ' Processing...'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {t('quizWillBeBasedOnPDF')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removePDF}
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('difficultyLevel')}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty.id}
                  type="button"
                  onClick={() => updateConfig('difficulty', difficulty.id)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    config.difficulty === difficulty.id
                      ? 'border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">{difficulty.name}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{difficulty.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('numberOfQuestions')}
            </label>
            <select
              value={config.questionCount}
              onChange={(e) => updateConfig('questionCount', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value={5}>{t('5Questions')}</option>
              <option value={10}>{t('10Questions')}</option>
              <option value={15}>{t('15Questions')}</option>
              <option value={20}>{t('20Questions')}</option>
              <option value={25}>{t('25Questions')}</option>
            </select>
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('timeLimit')}
            </label>
            <select
              value={config.timeLimit}
              onChange={(e) => updateConfig('timeLimit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value={0}>{t('noTimeLimit')}</option>
              <option value={5}>{t('5Minutes')}</option>
              <option value={10}>{t('10Minutes')}</option>
              <option value={15}>{t('15Minutes')}</option>
              <option value={20}>{t('20Minutes')}</option>
              <option value={30}>{t('30Minutes')}</option>
              <option value={45}>{t('45Minutes')}</option>
              <option value={60}>{t('60Minutes')}</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('subjectTopic')} {config.useCustomPDF && <span className="text-xs text-gray-500">({t('autoFilledFromPDF')})</span>}
            </label>
            <input
              type="text"
              value={config.subject}
              onChange={(e) => updateConfig('subject', e.target.value)}
              placeholder={t('subjectPlaceholder')}
              disabled={config.useCustomPDF}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                config.useCustomPDF 
                  ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-60' 
                  : 'bg-white dark:bg-gray-700'
              }`}
            />
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('customInstructions')}
            </label>
            <textarea
              value={config.customPrompt}
              onChange={(e) => updateConfig('customPrompt', e.target.value)}
              placeholder={t('customInstructionsPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-3 pt-4`}>
            <button
              type="submit"
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t('generateQuiz')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuizConfig