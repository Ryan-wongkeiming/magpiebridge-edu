# MagpieBridge-Edu Quiz and Assessment Implementation

Date: 2026-09-22  
Author: Grok  
Job: NEXT-012  
Output path: outputs/QUIZ_ASSESSMENT_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the quiz and assessment features implementation for MagpieBridge-Edu. These features allow instructors to create quizzes and assessments for their courses and enable learners to take these quizzes to demonstrate their knowledge.

## 2. Current Authentication Setup

The application uses Auth.js/NextAuth.js with:
- Email/password authentication via credentials provider
- OAuth providers (Google, Microsoft) as planned extensions
- Database-backed sessions
- Role-based access control

## 3. Quiz and Assessment Workflow

### Quiz Creation
1. Instructor navigates to course editor
2. Instructor creates a new quiz for the course
3. Instructor adds questions with answer options and correct answers
4. Instructor sets quiz parameters (passing score, time limit, attempt limit)
5. Instructor saves and publishes the quiz

### Quiz Taking
1. Learner navigates to an enrolled course with a quiz
2. Learner starts the quiz
3. Learner answers questions and submits the quiz
4. System automatically grades the quiz
5. System records the quiz attempt and score
6. System updates course completion status if required

### Quiz Results
1. Learner views quiz results and score
2. Learner sees which questions were answered correctly
3. Learner receives explanations for incorrect answers
4. System updates course progress based on quiz results

## 4. Implementation Details

### Database Schema Integration

The existing database schema includes the necessary entities for quiz and assessment functionality:

#### Quiz Model
```prisma
model Quiz {
  id              String   @id @default(cuid())
  courseId        String
  title           String
  description     String?
  passingScore    Float    @default(70) // Percentage required to pass
  attemptLimit    Int?     // Null = unlimited
  timeLimit       Int?     // In minutes, null = no time limit
  requiredForCompletion Boolean @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions       Question[]
  quizAttempts    QuizAttempt[]
}
```

#### Question Model
```prisma
model Question {
  id              String   @id @default(cuid())
  quizId          String
  questionText    String
  questionType    String   @default("multiple_choice") // multiple_choice, single_choice, true_false, short_answer
  answerOptions   Json?    // Array of possible answers
  correctAnswer   Json?    // Correct answer(s)
  points          Float    @default(1)
  sortOrder       Int
  explanation     String?  // Explanation shown after answering
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  quiz            Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
}
```

#### QuizAttempt Model
```prisma
model QuizAttempt {
  id              String   @id @default(cuid())
  quizId          String
  userId          String
  enrollmentId    String
  submittedAnswers Json     // Answers submitted by the user
  score           Float?   // Score as percentage
  passed          Boolean? // Whether the attempt passed
  startedAt       DateTime @default(now())
  submittedAt     DateTime?
  timeSpent       Int?     // Time spent in seconds
  attemptNumber   Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  quiz            Quiz     @relation(fields: [quizId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
  enrollment      Enrollment @relation(fields: [enrollmentId], references: [id])
}
```

### API Routes

#### Create Quiz Endpoint
`POST /api/quizzes`

```typescript
// app/api/quizzes/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { courseId, title, description, passingScore, attemptLimit, timeLimit, requiredForCompletion } = await request.json()
    
    // Verify user has permission to create quiz (instructor or admin)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        author: true,
        manager: true
      }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    const canEdit = course.authorId === session.user.id ||
      course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Create quiz
    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        passingScore,
        attemptLimit,
        timeLimit,
        requiredForCompletion,
        course: {
          connect: {
            id: courseId
          }
        }
      }
    })
    
    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Create quiz error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Get Quiz Endpoint
`GET /api/quizzes/[id]`

```typescript
// app/api/quizzes/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        questions: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    })
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    
    // Check if user can view this quiz (course instructor, admin, or enrolled learner)
    const canView = session.user.roles?.includes('admin') ||
      quiz.course.authorId === session.user.id ||
      quiz.course.managerId === session.user.id ||
      (await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: quiz.courseId
          }
        }
      }))
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // For learners, don't return correct answers
    const isLearner = !(session.user.roles?.includes('admin') ||
      quiz.course.authorId === session.user.id ||
      quiz.course.managerId === session.user.id)
    
    if (isLearner) {
      // Remove correct answers for learners
      const questionsWithoutAnswers = quiz.questions.map(question => ({
        ...question,
        correctAnswer: undefined
      }))
      
      return NextResponse.json({
        ...quiz,
        questions: questionsWithoutAnswers
      })
    }
    
    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Get quiz error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Create Question Endpoint
`POST /api/questions`

```typescript
// app/api/questions/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { quizId, questionText, questionType, answerOptions, correctAnswer, points, sortOrder, explanation } = await request.json()
    
    // Verify user has permission to create question (quiz owner or admin)
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          include: {
            author: true,
            manager: true
          }
        }
      }
    })
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    
    const canEdit = quiz.course.authorId === session.user.id ||
      quiz.course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get the next sort order if not provided
    let nextSortOrder = sortOrder
    if (nextSortOrder === undefined) {
      const maxSortOrder = await prisma.question.aggregate({
        _max: {
          sortOrder: true
        },
        where: {
          quizId: quizId
        }
      })
      
      nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1
    }
    
    // Create question
    const question = await prisma.question.create({
      data: {
        questionText,
        questionType,
        answerOptions,
        correctAnswer,
        points,
        sortOrder: nextSortOrder,
        explanation,
        quiz: {
          connect: {
            id: quizId
          }
        }
      }
    })
    
    return NextResponse.json(question)
  } catch (error) {
    console.error('Create question error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Submit Quiz Attempt Endpoint
`POST /api/quiz-attempts`

```typescript
// app/api/quiz-attempts/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { quizId, enrollmentId, submittedAnswers, timeSpent } = await request.json()
    
    // Verify enrollment belongs to user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    })
    
    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Verify quiz exists and user is enrolled in the course
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    })
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    
    // Check if enrollment is for the correct course
    if (enrollment.courseId !== quiz.courseId) {
      return NextResponse.json({ error: 'Invalid enrollment for this quiz' }, { status: 400 })
    }
    
    // Check attempt limit
    if (quiz.attemptLimit) {
      const attemptCount = await prisma.quizAttempt.count({
        where: {
          quizId: quizId,
          enrollmentId: enrollmentId
        }
      })
      
      if (attemptCount >= quiz.attemptLimit) {
        return NextResponse.json({ error: 'Attempt limit reached' }, { status: 400 })
      }
    }
    
    // Calculate score by comparing submitted answers with correct answers
    let totalPoints = 0
    let earnedPoints = 0
    
    for (const question of quiz.questions) {
      totalPoints += question.points
      
      const submittedAnswer = submittedAnswers.find((a: any) => a.questionId === question.id)
      
      if (submittedAnswer) {
        // Compare answers based on question type
        let isCorrect = false
        
        switch (question.questionType) {
          case 'multiple_choice':
            // For multiple choice, check if all correct answers are selected
            const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
            const submittedAnswersArray = Array.isArray(submittedAnswer.answer) ? submittedAnswer.answer : [submittedAnswer.answer]
            isCorrect = correctAnswers.every((answer: any) => submittedAnswersArray.includes(answer)) &&
                         submittedAnswersArray.every((answer: any) => correctAnswers.includes(answer))
            break
            
          case 'single_choice':
          case 'true_false':
            // For single choice and true/false, check if answer matches
            isCorrect = submittedAnswer.answer === question.correctAnswer
            break
            
          case 'short_answer':
            // For short answer, check if answer matches (case insensitive)
            isCorrect = submittedAnswer.answer.toLowerCase() === (question.correctAnswer as string).toLowerCase()
            break
        }
        
        if (isCorrect) {
          earnedPoints += question.points
        }
      }
    }
    
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
    const passed = score >= quiz.passingScore
    
    // Get attempt number
    const attemptCount = await prisma.quizAttempt.count({
      where: {
        quizId: quizId,
        enrollmentId: enrollmentId
      }
    })
    
    // Create quiz attempt
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        quiz: {
          connect: {
            id: quizId
          }
        },
        user: {
          connect: {
            id: session.user.id
          }
        },
        enrollment: {
          connect: {
            id: enrollmentId
          }
        },
        submittedAnswers: submittedAnswers,
        score: score,
        passed: passed,
        timeSpent: timeSpent,
        attemptNumber: attemptCount + 1,
        submittedAt: new Date()
      }
    })
    
    return NextResponse.json({
      ...quizAttempt,
      score: score,
      passed: passed
    })
  } catch (error) {
    console.error('Submit quiz attempt error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

### Frontend Components

#### Quiz Builder Component
`components/quiz-builder.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
  const [questions, setQuestions] = useState(quiz.questions || [])
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
      setError(err.message || 'Failed to save quiz')
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
```

#### Quiz Taker Component
`components/quiz-taker.tsx`

```typescript
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
      setError(err.message || 'Failed to submit quiz')
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
```

#### Quiz Results Component
`components/quiz-results.tsx`

```typescript
'use client'

import { Button } from '@/components/ui/button'

interface QuizResultsProps {
  quizAttempt: any
  quiz: any
  onRetake?: () => void
  onClose?: () => void
}

export default function QuizResults({ quizAttempt, quiz, onRetake, onClose }: QuizResultsProps) {
  const calculateTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
          <h2 className="text-xl font-semibold">
            Quiz Results
          </h2>
        </div>

        <div className="text-center mb-8">
          <div className={`text-4xl font-bold ${quizAttempt.passed ? 'text-green-600' : 'text-red-600'}`}>
            {Math.round(quizAttempt.score)}%
          </div>
          <div className="text-lg mt-2">
            {quizAttempt.passed ? 'Passed' : 'Failed'}
          </div>
          <div className="text-gray-600 mt-1">
            Passing score: {quiz.passingScore}%
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{quizAttempt.score.toFixed(1)}%</div>
            <div className="text-gray-600">Score</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">
              {quizAttempt.timeSpent ? calculateTime(quizAttempt.timeSpent) : 'N/A'}
            </div>
            <div className="text-gray-600">Time Spent</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">#{quizAttempt.attemptNumber}</div>
            <div className="text-gray-600">Attempt</div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Question Breakdown</h3>
          
          {quiz.questions.map((question: any, index: number) => {
            const submittedAnswer = quizAttempt.submittedAnswers.find((a: any) => a.questionId === question.id)
            const isCorrect = submittedAnswer ? 
              (question.questionType === 'multiple_choice' ?
                JSON.stringify(submittedAnswer.answer.sort()) === JSON.stringify(question.correctAnswer.sort()) :
                submittedAnswer.answer === question.correctAnswer) :
              false
            
            return (
              <div 
                key={question.id} 
                className={`border rounded-lg p-4 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">
                    {index + 1}. {question.questionText}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                
                <div className="mt-2">
                  <div className="text-sm font-medium text-gray-700">Your answer:</div>
                  <div className="ml-2 text-gray-600">
                    {Array.isArray(submittedAnswer?.answer) ? 
                      submittedAnswer.answer.join(', ') : 
                      submittedAnswer?.answer || 'No answer'}
                  </div>
                </div>
                
                {!isCorrect && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-gray-700">Correct answer:</div>
                    <div className="ml-2 text-gray-600">
                      {Array.isArray(question.correctAnswer) ? 
                        question.correctAnswer.join(', ') : 
                        question.correctAnswer}
                    </div>
                  </div>
                )}
                
                {question.explanation && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-gray-700">Explanation:</div>
                    <div className="ml-2 text-gray-600">{question.explanation}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          {onRetake && (
            <Button variant="outline" onClick={onRetake}>
              Retake Quiz
            </Button>
          )}
          {onClose && (
            <Button onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Frontend Pages

#### Quiz Editor Page
`app/quizzes/[id]/edit/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import QuizBuilder from '@/components/quiz-builder'

export default function QuizEditorPage() {
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchQuiz()
  }, [session, status])

  const fetchQuiz = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/quizzes/${params.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setQuiz(data)
      } else {
        setError(data.error || 'Failed to fetch quiz')
      }
    } catch (err) {
      setError('Failed to fetch quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedQuiz) => {
    setQuiz(updatedQuiz)
    // Show success message or redirect as needed
  }

  const handleCancel = () => {
    router.push(`/courses/${quiz?.courseId}/edit`)
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz Not Found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Editing: {quiz.title}</h1>
          <p className="text-gray-600 mt-1">
            Course: {quiz.course?.title}
          </p>
        </div>
        <Button onClick={handleCancel}>Back to Course</Button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <QuizBuilder 
          quiz={quiz} 
          onSave={handleSave} 
          onCancel={handleCancel} 
        />
      </div>
    </div>
  )
}
```

#### Quiz Taker Page
`app/quizzes/[id]/take/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import QuizTaker from '@/components/quiz-taker'
import QuizResults from '@/components/quiz-results'

export default function QuizTakerPage() {
  const [quiz, setQuiz] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [quizAttempt, setQuizAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchQuizAndEnrollment()
  }, [session, status])

  const fetchQuizAndEnrollment = async () => {
    try {
      setLoading(true)
      
      // Fetch quiz
      const quizResponse = await fetch(`/api/quizzes/${params.id}`)
      const quizData = await quizResponse.json()
      
      if (!quizResponse.ok) {
        setError(quizData.error || 'Failed to fetch quiz')
        return
      }
      
      setQuiz(quizData)
      
      // Fetch enrollment for this quiz's course
      const enrollmentResponse = await fetch(`/api/enrollments?courseId=${quizData.courseId}`)
      const enrollmentData = await enrollmentResponse.json()
      
      if (enrollmentResponse.ok && enrollmentData.length > 0) {
        setEnrollment(enrollmentData[0])
      }
    } catch (err) {
      setError('Failed to fetch quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (answers) => {
    try {
      // Submit quiz attempt
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          enrollmentId: enrollment.id,
          submittedAnswers: answers
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setQuizAttempt(data)
      } else {
        setError(data.error || 'Failed to submit quiz')
      }
    } catch (err) {
      setError('Failed to submit quiz')
    }
  }

  const handleRetake = () => {
    setQuizAttempt(null)
  }

  const handleClose = () => {
    router.push(`/enrollments/${enrollment.id}`)
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz Not Found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="text-gray-600 mt-1">
            Course: {quiz.course?.title}
          </p>
        </div>
        <Button onClick={() => router.push(`/enrollments/${enrollment?.id}`)}>
          Back to Course
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {quizAttempt ? (
        <QuizResults 
          quizAttempt={quizAttempt} 
          quiz={quiz} 
          onRetake={handleRetake}
          onClose={handleClose}
        />
      ) : (
        <QuizTaker 
          quiz={quiz} 
          enrollmentId={enrollment?.id} 
          onSubmit={handleSubmit} 
        />
      )}
    </div>
  )
}
```

### Utility Functions

#### Quiz Scoring Utilities
`lib/quiz-utils.ts`

```typescript
// Utility functions for quiz scoring and validation

export function calculateQuizScore(quiz: any, submittedAnswers: any[]): number {
  let totalPoints = 0
  let earnedPoints = 0
  
  for (const question of quiz.questions) {
    totalPoints += question.points
    
    const submittedAnswer = submittedAnswers.find(a => a.questionId === question.id)
    
    if (submittedAnswer) {
      // Compare answers based on question type
      let isCorrect = false
      
      switch (question.questionType) {
        case 'multiple_choice':
          // For multiple choice, check if all correct answers are selected
          const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
          const submittedAnswersArray = Array.isArray(submittedAnswer.answer) ? submittedAnswer.answer : [submittedAnswer.answer]
          isCorrect = correctAnswers.every((answer: any) => submittedAnswersArray.includes(answer)) &&
                       submittedAnswersArray.every((answer: any) => correctAnswers.includes(answer))
          break
          
        case 'single_choice':
        case 'true_false':
          // For single choice and true/false, check if answer matches
          isCorrect = submittedAnswer.answer === question.correctAnswer
          break
          
        case 'short_answer':
          // For short answer, check if answer matches (case insensitive)
          isCorrect = submittedAnswer.answer.toLowerCase() === (question.correctAnswer as string).toLowerCase()
          break
      }
      
      if (isCorrect) {
        earnedPoints += question.points
      }
    }
  }
  
  return totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
}

export function validateQuizSubmission(quiz: any, submittedAnswers: any[]): boolean {
  // Check if all required questions have been answered
  for (const question of quiz.questions) {
    const submittedAnswer = submittedAnswers.find(a => a.questionId === question.id)
    
    if (!submittedAnswer) {
      return false // Missing answer
    }
    
    // Check if answer is valid based on question type
    switch (question.questionType) {
      case 'multiple_choice':
        if (!Array.isArray(submittedAnswer.answer) || submittedAnswer.answer.length === 0) {
          return false // Must have at least one selection
        }
        break
        
      case 'single_choice':
      case 'true_false':
        if (!submittedAnswer.answer) {
          return false // Must have an answer
        }
        break
        
      case 'short_answer':
        if (!submittedAnswer.answer) {
          return false // Must have an answer
        }
        break
    }
  }
  
  return true
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function canRetakeQuiz(quiz: any, attemptCount: number): boolean {
  // Check if user can retake the quiz based on attempt limit
  if (quiz.attemptLimit === null) {
    return true // Unlimited attempts
  }
  
  return attemptCount < quiz.attemptLimit
}
```

## 5. Security Considerations

### Quiz Creation Security
- Verify user authorization before creating quizzes
- Check course ownership and permissions
- Validate all input data
- Prevent unauthorized access to correct answers

### Quiz Taking Security
- Verify enrollment ownership before taking quizzes
- Validate submitted answers
- Prevent cheating through server-side validation
- Implement rate limiting for quiz submissions

### Data Privacy
- Only expose quiz data to authorized users
- Protect correct answers from learners during quiz taking
- Implement proper session management
- Sanitize and validate all input data

## 6. Database Integration

### Quiz Creation
1. Validate user permissions for course
2. Create quiz record with specified parameters
3. Create associated questions with answer options
4. Link questions to quiz with proper ordering

### Quiz Taking
1. Validate enrollment and quiz association
2. Record quiz attempt with submitted answers
3. Calculate and store quiz score
4. Update course completion status if required

### Data Consistency
1. Maintain referential integrity between entities
2. Use database transactions for critical operations
3. Implement proper error handling and rollback mechanisms

## 7. Testing

### Unit Tests
- Quiz creation and validation functions
- Question creation and management
- Quiz scoring and grading algorithms
- API endpoint responses

### Integration Tests
- Full quiz creation workflow
- Quiz taking and submission
- Quiz results and scoring
- Role-based access control

### Manual Testing
- End-to-end quiz creation experience
- Quiz taking and results viewing
- Cross-browser compatibility
- Mobile responsiveness

## 8. Customization Options

### Quiz Types
- Timed quizzes with countdown timers
- Randomized question ordering
- Randomized answer option ordering
- Adaptive quizzes based on learner performance

### Question Types
- Image-based questions
- Audio/video questions
- Interactive questions with drag-and-drop
- Code snippet questions for programming courses

### Advanced Features
- Quiz categories and tags
- Quiz sharing and collaboration
- Peer review and collaborative grading
- Analytics and reporting dashboards

## 9. Troubleshooting

### Common Issues

1. **Quiz Creation Failure**
   - Check user permissions for course
   - Verify database connectivity
   - Ensure all required fields are filled

2. **Quiz Submission Failure**
   - Check enrollment validity
   - Verify quiz attempt limits
   - Ensure all questions are answered

3. **Scoring Inconsistencies**
   - Check answer validation logic
   - Verify correct answers in database
   - Ensure question type matching

### Debugging Steps
1. Check server logs
2. Verify database records
3. Test API endpoints individually
4. Validate user permissions
5. Check environment variables

## 10. Next Steps

After implementing quiz and assessment features:

1. **Test Quiz Workflow**: Verify all quiz creation and taking scenarios work correctly
2. **Implement Quiz Analytics**: Add detailed quiz performance reporting
3. **Add Certificate Integration**: Connect quiz results to certificate generation
4. **Enhance Question Types**: Add support for more advanced question types
5. **Implement Peer Review**: Add peer review and collaborative grading features

This quiz and assessment implementation provides instructors with tools to create quizzes and assessments, and learners with the ability to take these quizzes to demonstrate their knowledge, forming a core component of the MagpieBridge-Edu platform.