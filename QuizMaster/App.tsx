
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { parseDocxFile } from './services/docxParser';
import { Question, QuizState } from './types';
import { Button } from './components/Button';
import { CheckCircle2, XCircle, FileText, ChevronRight, Trophy, RefreshCcw, LogOut, Download } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>({
    questions: [],
    currentIndex: 0,
    score: 0,
    selectedAnswerIndex: null,
    isAnswerChecked: false,
    status: 'idle',
  });

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      const parsedQuestions = await parseDocxFile(file);
      if (parsedQuestions.length === 0) {
        alert("В документе не найдено подходящих вопросов. Проверьте формат.");
        setState(prev => ({ ...prev, status: 'idle' }));
        return;
      }
      setState({
        questions: parsedQuestions,
        currentIndex: 0,
        score: 0,
        selectedAnswerIndex: null,
        isAnswerChecked: false,
        status: 'quiz',
      });
    } catch (err) {
      alert("Ошибка: " + (err as Error).message);
      setState(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const checkAnswer = useCallback(() => {
    if (state.selectedAnswerIndex === null) return;
    
    const currentQuestion = state.questions[state.currentIndex];
    const isCorrect = state.selectedAnswerIndex === currentQuestion.correctIndex;

    setState(prev => ({
      ...prev,
      isAnswerChecked: true,
      score: isCorrect ? prev.score + 1 : prev.score
    }));
  }, [state.currentIndex, state.questions, state.selectedAnswerIndex]);

  const nextQuestion = useCallback(() => {
    if (state.currentIndex + 1 >= state.questions.length) {
      setState(prev => ({ ...prev, status: 'result' }));
    } else {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswerIndex: null,
        isAnswerChecked: false,
      }));
    }
  }, [state.currentIndex, state.questions.length]);

  const resetQuiz = () => {
    setState(prev => ({
      ...prev,
      currentIndex: 0,
      score: 0,
      selectedAnswerIndex: null,
      isAnswerChecked: false,
      status: 'quiz'
    }));
  };

  const goHome = () => {
    setState({
      questions: [],
      currentIndex: 0,
      score: 0,
      selectedAnswerIndex: null,
      isAnswerChecked: false,
      status: 'idle',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-indigo-100 p-6 rounded-full mb-8">
              <FileText className="w-16 h-16 text-indigo-600" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">QuizMaster Trainer</h1>
            <p className="text-xl text-slate-600 mb-10 max-w-lg mx-auto">
              Загрузите .docx файл с тестами и тренируйтесь в любое время.
            </p>
            
            <div className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="docx-upload"
                  ref={fileInputRef}
                />
                <label
                  htmlFor="docx-upload"
                  className="cursor-pointer inline-flex items-center px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
                >
                  Выбрать файл .docx
                </label>
              </div>

              {installPrompt && (
                <button 
                  onClick={handleInstall}
                  className="flex items-center justify-center gap-2 text-indigo-600 font-semibold hover:underline"
                >
                  <Download className="w-4 h-4" /> Установить как приложение
                </button>
              )}
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
              <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-2">Оффлайн доступ</h3>
                <p className="text-sm text-slate-500">После установки приложение работает без интернета.</p>
              </div>
              <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-2">Перемешивание</h3>
                <p className="text-sm text-slate-500">Вопросы и варианты ответов меняются местами.</p>
              </div>
              <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-2">Легко делиться</h3>
                <p className="text-sm text-slate-500">Просто отправьте ссылку или файлы другу.</p>
              </div>
            </div>
          </div>
        );

      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <p className="text-lg font-medium text-slate-600">Обработка документа...</p>
          </div>
        );

      case 'quiz':
        const q = state.questions[state.currentIndex];
        const progress = ((state.currentIndex + 1) / state.questions.length) * 100;
        
        return (
          <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
                  {state.currentIndex + 1}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Вопрос</h2>
                  <p className="text-xs text-slate-400">Всего {state.questions.length}</p>
                </div>
              </div>
              <div className="text-right">
                 <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Баллы</p>
                 <p className="text-indigo-600 font-bold text-lg">{state.score}</p>
              </div>
            </div>

            <div className="w-full bg-slate-200 h-2 rounded-full mb-10 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mb-8 min-h-[160px] flex items-center">
              <p className="text-xl md:text-2xl font-semibold text-slate-800 leading-relaxed">
                {q.text}
              </p>
            </div>

            <div className="space-y-3 mb-10">
              {q.shuffledAnswers.map((ans, idx) => {
                let buttonStyle = "border-2 border-slate-100 bg-white text-slate-700 hover:border-indigo-100 hover:bg-indigo-50/30";
                let icon = null;

                if (state.isAnswerChecked) {
                  if (idx === q.correctIndex) {
                    buttonStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-100";
                    icon = <CheckCircle2 className="w-6 h-6 text-emerald-600 ml-auto" />;
                  } else if (state.selectedAnswerIndex === idx) {
                    buttonStyle = "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-100";
                    icon = <XCircle className="w-6 h-6 text-rose-600 ml-auto" />;
                  } else {
                    buttonStyle = "bg-slate-50 border-slate-100 text-slate-400 opacity-60";
                  }
                } else if (state.selectedAnswerIndex === idx) {
                  buttonStyle = "bg-indigo-50 border-indigo-500 text-indigo-800 ring-2 ring-indigo-100";
                }

                return (
                  <button
                    key={idx}
                    disabled={state.isAnswerChecked}
                    onClick={() => setState(prev => ({ ...prev, selectedAnswerIndex: idx }))}
                    className={`w-full text-left p-5 rounded-xl flex items-center gap-4 transition-all group ${buttonStyle}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                      state.selectedAnswerIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-lg font-medium">{ans.text}</span>
                    {icon}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl sticky bottom-4 shadow-sm border border-slate-200">
               <Button variant="outline" onClick={goHome} className="flex items-center gap-2">
                 <LogOut className="w-4 h-4" /> Выход
               </Button>
               <div className="flex gap-4">
                 {!state.isAnswerChecked ? (
                   <Button 
                     size="lg" 
                     className="px-10"
                     disabled={state.selectedAnswerIndex === null}
                     onClick={checkAnswer}
                   >
                     Проверить
                   </Button>
                 ) : (
                   <Button 
                     size="lg" 
                     className="px-10 flex items-center gap-2"
                     onClick={nextQuestion}
                   >
                     {state.currentIndex + 1 === state.questions.length ? 'Результаты' : 'Дальше'}
                     <ChevronRight className="w-5 h-5" />
                   </Button>
                 )}
               </div>
            </div>
          </div>
        );

      case 'result':
        const percentage = (state.score / state.questions.length) * 100;
        const isPassed = percentage >= 50;

        return (
          <div className="max-w-2xl mx-auto py-16 px-4 text-center">
            <div className={`inline-flex p-8 rounded-full mb-8 ${isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              <Trophy className="w-24 h-24" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Тест завершен!</h1>
            <p className="text-xl text-slate-500 mb-10">Ваш результат:</p>

            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-semibold text-slate-400 uppercase mb-1">Процент</p>
                <p className={`text-5xl font-black ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {Math.round(percentage)}%
                </p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-semibold text-slate-400 uppercase mb-1">Правильно</p>
                <p className="text-5xl font-black text-slate-900">
                  {state.score}<span className="text-2xl text-slate-400 font-normal ml-1">/{state.questions.length}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="flex items-center gap-2" onClick={resetQuiz}>
                <RefreshCcw className="w-5 h-5" /> Повторить
              </Button>
              <Button variant="secondary" size="lg" onClick={goHome}>
                Новый файл
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">QuizMaster</span>
          </div>
        </div>
      </nav>

      <main>
        {renderContent()}
      </main>
      
      {state.status === 'idle' && (
        <footer className="py-8 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} QuizMaster Trainer. Поддержка .docx файлов.</p>
        </footer>
      )}
    </div>
  );
};

export default App;
