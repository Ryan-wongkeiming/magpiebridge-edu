'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { QuizQuestion } from '@/types/api'

interface QuizBuilderProps {
  quiz: any
  onSave: (quiz: any) => void
  onCancel: () => void
}

export default function QuizBuilder({ quiz, onSave, onCancel }: QuizBuilderProps) {
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description || '')
  const [passingScore, setPassingScore] = useState(quiz.passingScore || 70)
  const [attemptLimit, setAttemptLimit] = useState(quiz.attemptLimit || null)
  const [timeLimit, setTimeLimit] = useState(quiz.timeLimit || null)
  const [requiredForCompletion, setRequiredForCompletion] = useState(quiz.requiredForCompletion || true)
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz.questions || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `new-${Date.now()}`,
        questionText: '',
        questionType: 'multiple_choice',
        answerOptions: [],
        correctAnswer: [],
        points: 1,
        sortOrder: questions.length + 1,
        explanation: ''
      }
    ])
  }

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = [...questions]
    newQuestions.splice(index, 1)
    setQuestions(newQuestions)
  }

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value
    }
    setQuestions(newQuestions)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Save quiz
      const quizResponse = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          passingScore,
          attemptLimit,
          timeLimit,
          requiredForCompletion
        })
      })
      
      const quizData = await quizResponse.json()
      
      if (!quizResponse.ok) {
        throw new Error(quizData.error || 'Failed to save quiz')
      }
      
      // Save questions
      for (const question of questions) {
        const questionResponse = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId: quizData.id,
            questionText: question.questionText,
            questionType: question.questionType,
            answerOptions: question.answerOptions,
            correctAnswer: question.correctAnswer,
            points: question.points,
            sortOrder: question.sortOrder,
            explanation: question.explanation
          })
        })
        
        const questionData = await questionResponse.json()
        
        if (!questionResponse.ok) {
          throw new Error(questionData.error || 'Failed to save question')
        }
      }
      
      onSave(quizData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz')
    } finally {
      setSaving(false)
    }
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attempt Limit</label>
            <input
              type="number"
              min="1"
              value={attemptLimit || ''}
              onChange={(e) => setAttemptLimit(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Unlimited"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
            <input
              type="number"
              min="1"
              value={timeLimit || ''}
              onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="No time limit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required for Completion</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={requiredForCompletion}
                onChange={(e) => setRequiredForCompletion(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                Learners must pass this quiz to complete the course
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Questions</h3>
            <Button onClick={handleAddQuestion}>Add Question</Button>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Question {index + 1}</h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRemoveQuestion(index)}
                  >
                    Remove
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                    <textarea
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                    <select
                      value={question.questionType}
                      onChange={(e) => handleQuestionChange(index, 'questionType', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="single_choice">Single Choice</option>
                      <option value="true_false">True/False</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                    <input
                      type="number"
                      min="0"
                      value={question.points}
                      onChange={(e) => handleQuestionChange(index, 'points', Number(e.target.value))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {question.questionType !== 'short_answer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Answer Options</label>
                      <div className="space-y-2">
                        {question.answerOptions.map((option: string, optionIndex: number) => (
                          <div key={optionIndex} className="flex items-center">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...question.answerOptions]
                                newOptions[optionIndex] = e.target.value
                                handleQuestionChange(index, 'answerOptions', newOptions)
                              }}
                              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newOptions = [...question.answerOptions]
                                newOptions.splice(optionIndex, 1)
                                handleQuestionChange(index, 'answerOptions', newOptions)
                              }}
                              className="ml-2"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOptions = [...question.answerOptions, '']
                            handleQuestionChange(index, 'answerOptions', newOptions)
                          }}
                        >
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}

                  {question.questionType === 'short_answer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                      <input
                        type="text"
                        value={question.correctAnswer || ''}
                        onChange={(e) => handleQuestionChange(index, 'correctAnswer', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                    <textarea
                      value={question.explanation || ''}
                      onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Explanation shown after answering (optional)"
                    />
                  </div>
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No questions added yet. Click "Add Question" to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>
    </div>
  )
}