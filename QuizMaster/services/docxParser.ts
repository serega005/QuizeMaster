
import { Question, Answer } from '../types';

declare const mammoth: any;

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
    
    // Разбиваем на строки и очищаем от лишних пробелов в концах
    const rawLines = text.split('\n').map(l => l.trimEnd());

    const questions: Question[] = [];
    let currentQuestionText = "";
    let currentAnswers: { text: string; isCorrect: boolean }[] = [];
    let lastCorrectText: string | null = null;
    
    // Регулярные выражения:
    // Вопрос: начинается с <question> ИЛИ цифр с точкой/скобкой (например "1.", "12)", " 1. ")
    const regexQuestion = /^\s*(?:<question>|(\d+[\.\)]+))\s*(.*)/i;
    // Ответ: начинается с <variant> ИЛИ латиницы A-E ИЛИ кириллицы А-Д с точкой/скобкой
    const regexAnswer = /^\s*(?:<variant>|([a-eа-д][\.\)]+))\s*(.*)/i;

    const finalizeQuestion = () => {
      if (currentQuestionText && currentAnswers.length > 0) {
        // Первый найденный ответ считаем правильным (как в исходной логике пользователя)
        const answers: Answer[] = currentAnswers.map(a => ({
          text: a.text,
          isCorrect: a.text === lastCorrectText
        }));
        
        const shuffled = shuffle(answers);
        questions.push({
          id: `q-${questions.length}-${Date.now()}`,
          text: currentQuestionText.trim(),
          answers: answers,
          shuffledAnswers: shuffled,
          correctIndex: shuffled.findIndex(a => a.isCorrect)
        });
      }
    };

    for (const line of rawLines) {
      if (!line.trim()) continue;

      const matchQ = line.match(regexQuestion);
      const matchA = line.match(regexAnswer);

      if (matchQ) {
        // Нашли новый вопрос — сохраняем старый
        finalizeQuestion();
        
        // Сбрасываем состояние для нового вопроса
        currentQuestionText = matchQ[2] || ""; 
        currentAnswers = [];
        lastCorrectText = null;
      } else if (matchA) {
        // Нашли вариант ответа
        const answerText = (matchA[2] || "").trim();
        if (answerText) {
          if (currentAnswers.length === 0) lastCorrectText = answerText;
          currentAnswers.push({ text: answerText, isCorrect: false });
        }
      } else {
        // Если строка не похожа ни на вопрос, ни на ответ — 
        // это продолжение предыдущего текста (многострочность)
        if (currentAnswers.length > 0) {
          // Продолжение последнего ответа
          const lastIdx = currentAnswers.length - 1;
          const updatedText = (currentAnswers[lastIdx].text + " " + line.trim()).trim();
          // Если это был первый ответ, обновляем эталон правильного ответа
          if (lastIdx === 0) lastCorrectText = updatedText;
          currentAnswers[lastIdx].text = updatedText;
        } else if (currentQuestionText !== null) {
          // Продолжение текста вопроса
          currentQuestionText = (currentQuestionText + " " + line.trim()).trim();
        }
      }
    }

    // Не забываем добавить последний вопрос
    finalizeQuestion();

    return questions;
  } catch (error) {
    console.error("Error parsing docx:", error);
    throw new Error("Не удалось прочитать файл. Проверьте формат .docx");
  }
}
