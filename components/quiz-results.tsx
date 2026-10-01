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