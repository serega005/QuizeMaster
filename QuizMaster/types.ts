
export interface Answer {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  text: string;
  answers: Answer[];
  shuffledAnswers: Answer[];
  correctIndex: number;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  score: number;
  selectedAnswerIndex: number | null;
  isAnswerChecked: boolean;
  status: 'idle' | 'loading' | 'quiz' | 'result';
}
