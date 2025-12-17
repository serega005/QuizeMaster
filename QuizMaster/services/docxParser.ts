
import { Question, Answer } from '../types';

declare const mammoth: any;

const QUESTIONS_TO_SHOW = 25;

/**
 * Shuffles an array in place
 */
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function parseDocxFile(file: File): Promise<Question[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    const rawQuestions: { question: string; answers: string[]; correctText: string | null }[] = [];
    let currentQ: { question: string; answers: string[]; correctText: string | null } | null = null;

    // Regular expressions mirroring the Python logic
    const regexQuestion = /^(?:<question>|\d+[\.\)]?)\s*(.+)/i;
    const regexAnswer = /^(?:<variant>|[A-Ea-e][\.\)]?)\s*(.+)/i;

    for (const line of lines) {
      const matchQ = line.match(regexQuestion);
      if (matchQ) {
        if (currentQ && currentQ.answers.length > 0) {
          rawQuestions.push(currentQ);
        }
        currentQ = {
          question: matchQ[1].trim(),
          answers: [],
          correctText: null
        };
        continue;
      }

      const matchA = line.match(regexAnswer);
      if (matchA && currentQ) {
        const answerText = matchA[1].trim();
        // The Python logic: the first variant encountered for a question is the correct one
        if (currentQ.correctText === null) {
          currentQ.correctText = answerText;
        }
        currentQ.answers.push(answerText);
      }
    }

    // Push the last question
    if (currentQ && currentQ.answers.length > 0) {
      rawQuestions.push(currentQ);
    }

    const finalQuestions: Question[] = [];
    for (const q of rawQuestions) {
      if (!q.correctText || q.answers.length === 0) continue;

      const answers: Answer[] = q.answers.map(ans => ({
        text: ans,
        isCorrect: ans === q.correctText
      }));

      const shuffled = shuffle(answers);
      const correctIndex = shuffled.findIndex(a => a.isCorrect);

      finalQuestions.push({
        text: q.question,
        answers: answers,
        shuffledAnswers: shuffled,
        correctIndex: correctIndex
      });
    }

    // Limit and random sample
    const shuffledPool = shuffle(finalQuestions);
    return shuffledPool.slice(0, Math.min(QUESTIONS_TO_SHOW, shuffledPool.length));
  } catch (error) {
    console.error("Error parsing docx:", error);
    throw new Error("Failed to parse the Word document. Please ensure it follows the correct format.");
  }
}
