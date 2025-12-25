
export interface Answer {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string; // Уникальный ID для отслеживания
  text: string;
  answers: Answer[];
  shuffledAnswers: Answer[];
  correctIndex: number;
}

export type QuizMode = 'test' | 'preparation' | 'speedrun';

export interface QuizState {
  allQuestions: Question[];
  currentSessionIndices: number[]; // Индексы вопросов в текущей сессии
  solvedIndices: Set<number>;      // Глобально решенные индексы (для подготовки)
  currentIndex: number;            // Текущий вопрос в сессии
  score: number;
  selectedAnswerIndex: number | null;
  isAnswerChecked: boolean;
  status: 'idle' | 'loading' | 'mode_selection' | 'quiz' | 'result';
  mode: QuizMode | null;
  fileName: string;
}
