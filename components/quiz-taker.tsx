'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface QuizTakerProps {
  quiz: any
  enrollmentId: string
  onSubmit: (answers: any[]) => void
}

export default function QuizTaker({ quiz, enrollmentId, onSubmit }: QuizTakerProps) {
  const [answers, setAnswers] = useState<any[]>([])
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Initialize answers array
  useEffect(() => {
    const initialAnswers = quiz.questions.map((question: any) => ({
      questionId: question.id,
      answer: question.questionType === 'multiple_choice' ? [] : ''
    }))
    setAnswers(initialAnswers)
    
    // Set timer if time limit is specified
    if (quiz.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60) // Convert minutes to seconds
    }
  }, [quiz])

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null) return prev
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit() // Auto-submit when time runs out
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [timeRemaining])

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => 
      prev.map(a => 
        a.questionId === questionId ? { ...a, answer } : a
      )
    )
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      
      // Calculate time spent (if timer was used)
      const timeSpent = quiz.timeLimit ? (quiz.timeLimit * 60 - (timeRemaining || 0)) : null
      
      // Submit quiz attempt
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          enrollmentId: enrollmentId,
          submittedAnswers: answers,
          timeSpent: timeSpent
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        onSubmit(data)
      } else {
        throw new Error(data.error || 'Failed to submit quiz')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          {timeRemaining !== null && (
            <div className="text-lg font-medium text-red-600">
              Time remaining: {formatTime(timeRemaining)}
            </div>
          )}
        </div>
        
        {quiz.description && (
          <p className="text-gray-600 mb-6">{quiz.description}</p>
        )}

        <div className="space-y-8">
          {quiz.questions.map((question: any, index: number) => (
            <div key={question.id} className="border-b pb-6">
              <h3 className="text-lg font-medium mb-3">
                {index + 1}. {question.questionText}
              </h3>
              
              {question.questionType === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.answerOptions.map((option: string, optionIndex: number) => (
                    <div key={optionIndex} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`q${index}-o${optionIndex}`}
                        checked={answers.find(a => a.questionId === question.id)?.answer?.includes(option) || false}
                        onChange={(e) => {
                          const currentAnswers = answers.find(a => a.questionId === question.id)?.answer || []
                          let newAnswers
                          
                          if (e.target.checked) {
                            newAnswers = [...currentAnswers, option]
                          } else {
                            newAnswers = currentAnswers.filter((a: string) => a !== option)
                          }
                          
                          handleAnswerChange(question.id, newAnswers)
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label 
                        htmlFor={`q${index}-o${optionIndex}`} 
                        className="ml-3 block text-gray-700"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {question.questionType === 'single_choice' && (
                <div className="space-y-2">
                  {question.answerOptions.map((option: string, optionIndex: number) => (
                    <div key={optionIndex} className="flex items-center">
                      <input
                        type="radio"
                        id={`q${index}-o${optionIndex}`}
                        name={`question-${question.id}`}
                        checked={answers.find(a => a.questionId === question.id)?.answer === option}
                        onChange={(e) => handleAnswerChange(question.id, option)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <label 
                        htmlFor={`q${index}-o${optionIndex}`} 
                        className="ml-3 block text-gray-700"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {question.questionType === 'true_false' && (
                <div className="space-y-2">
                  {['True', 'False'].map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center">
                      <input
                        type="radio"
                        id={`q${index}-o${optionIndex}`}
                        name={`question-${question.id}`}
                        checked={answers.find(a => a.questionId === question.id)?.answer === option}
                        onChange={(e) => handleAnswerChange(question.id, option)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <label 
                        htmlFor={`q${index}-o${optionIndex}`} 
                        className="ml-3 block text-gray-700"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {question.questionType === 'short_answer' && (
                <div>
                  <input
                    type="text"
                    value={answers.find(a => a.questionId === question.id)?.answer || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your answer"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="px-8 py-3"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </div>
    </div>
  )
}