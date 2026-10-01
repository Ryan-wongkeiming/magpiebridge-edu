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