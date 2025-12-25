
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { parseDocxFile } from './services/docxParser';
import { Question, QuizState, QuizMode } from './types';
import { Button } from './components/Button';
import { CheckCircle2, XCircle, FileText, ChevronRight, Trophy, RefreshCcw, LogOut, Download, BrainCircuit, ClipboardList, Info, Lightbulb, Zap, AlignLeft } from 'lucide-react';

const SESSION_SIZE = 25;

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>({
    allQuestions: [],
    currentSessionIndices: [],
    solvedIndices: new Set(),
    currentIndex: 0,
    score: 0,
    selectedAnswerIndex: null,
    isAnswerChecked: false,
    status: 'idle',
    mode: null,
    fileName: ''
  });

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.fileName && state.allQuestions.length > 0) {
      const saved = localStorage.getItem(`progress_${state.fileName}`);
      if (saved) {
        try {
          const indices = JSON.parse(saved);
          setState(prev => ({ ...prev, solvedIndices: new Set(indices) }));
        } catch (e) { console.error("Error loading progress", e); }
      }
    }
  }, [state.fileName, state.allQuestions.length]);

  useEffect(() => {
    if (state.fileName && state.solvedIndices.size > 0) {
      localStorage.setItem(`progress_${state.fileName}`, JSON.stringify(Array.from(state.solvedIndices)));
    }
  }, [state.solvedIndices, state.fileName]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, status: 'loading', fileName: file.name }));
    try {
      const parsedQuestions = await parseDocxFile(file);
      if (parsedQuestions.length === 0) {
        alert("Вопросы не найдены. Проверьте формат нумерации (например: 1. Вопрос, А. Ответ)");
        setState(prev => ({ ...prev, status: 'idle' }));
        return;
      }
      setState(prev => ({
        ...prev,
        allQuestions: parsedQuestions,
        status: 'mode_selection'
      }));
    } catch (err) {
      alert("Ошибка: " + (err as Error).message);
      setState(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const startSession = (mode: QuizMode) => {
    let indices: number[] = [];
    const allIndices = state.allQuestions.map((_, i) => i);
    
    if (mode === 'test') {
      indices = [...allIndices]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(SESSION_SIZE, state.allQuestions.length));
    } else if (mode === 'speedrun') {
      indices = [...allIndices].sort(() => Math.random() - 0.5);
    } else {
      const unsolved = allIndices.filter(i => !state.solvedIndices.has(i));
      if (unsolved.length === 0) {
        alert("Поздравляем! Вы изучили все вопросы в этом файле.");
        return;
      }
      indices = unsolved
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(SESSION_SIZE, unsolved.length));
    }

    setState(prev => ({
      ...prev,
      mode,
      currentSessionIndices: indices,
      currentIndex: 0,
      score: 0,
      selectedAnswerIndex: null,
      isAnswerChecked: false,
      status: 'quiz'
    }));
  };

  const checkAnswer = useCallback(() => {
    if (state.selectedAnswerIndex === null) return;
    
    const globalIdx = state.currentSessionIndices[state.currentIndex];
    const currentQuestion = state.allQuestions[globalIdx];
    const isCorrect = state.selectedAnswerIndex === currentQuestion.correctIndex;

    if (isCorrect && (state.mode === 'preparation' || state.mode === 'speedrun')) {
      setState(prev => {
        const newSolved = new Set(prev.solvedIndices);
        newSolved.add(globalIdx);
        return { ...prev, solvedIndices: newSolved };
      });
    }

    setState(prev => ({
      ...prev,
      isAnswerChecked: true,
      score: isCorrect ? prev.score + 1 : prev.score
    }));
  }, [state.currentIndex, state.currentSessionIndices, state.allQuestions, state.selectedAnswerIndex, state.mode]);

  const nextQuestion = useCallback(() => {
    if (state.currentIndex + 1 >= state.currentSessionIndices.length) {
      setState(prev => ({ ...prev, status: 'result' }));
    } else {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswerIndex: null,
        isAnswerChecked: false,
      }));
    }
  }, [state.currentIndex, state.currentSessionIndices.length]);

  const goHome = () => {
    setState({
      allQuestions: [],
      currentSessionIndices: [],
      solvedIndices: new Set(),
      currentIndex: 0,
      score: 0,
      selectedAnswerIndex: null,
      isAnswerChecked: false,
      status: 'idle',
      mode: null,
      fileName: ''
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const globalProgress = useMemo(() => {
    if (state.allQuestions.length === 0) return 0;
    return (state.solvedIndices.size / state.allQuestions.length) * 100;
  }, [state.solvedIndices.size, state.allQuestions.length]);

  // Статистика: вопросы, где САМЫЙ ДЛИННЫЙ вариант является ПРАВИЛЬНЫМ
  const longAnswersStats = useMemo(() => {
    if (state.allQuestions.length === 0) return { count: 0, total: 0, percentage: 0 };
    
    let count = 0;
    const total = state.allQuestions.length;

    state.allQuestions.forEach((q) => {
      const correctAns = q.answers.find(a => a.isCorrect);
      if (!correctAns) return;
      
      const correctLen = correctAns.text.length;
      // Правильный ответ должен быть не короче любого другого варианта
      const isLongest = q.answers.every(a => a.text.length <= correctLen);

      if (isLongest) count++;
    });

    return {
      count,
      total,
      percentage: Math.round((count / total) * 100)
    };
  }, [state.allQuestions]);

  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-500">
            <div className="bg-indigo-100 p-6 rounded-3xl mb-8 shadow-inner">
              <FileText className="w-16 h-16 text-indigo-600" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">QuizMaster Pro</h1>
            <p className="text-xl text-slate-600 mb-10 max-w-lg mx-auto">
              Интеллектуальная система подготовки к экзаменам из ваших документов.
            </p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs mb-16">
              <input type="file" accept=".docx" onChange={handleFileUpload} className="hidden" id="docx-upload" ref={fileInputRef} />
              <label htmlFor="docx-upload" className="cursor-pointer inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-200">
                Загрузить .docx
              </label>

              {installPrompt && (
                <button onClick={() => installPrompt.prompt()} className="flex items-center justify-center gap-2 text-indigo-600 font-semibold hover:bg-indigo-50 py-2 rounded-xl transition-colors">
                  <Download className="w-4 h-4" /> Установить PWA
                </button>
              )}
            </div>

            <div className="max-w-md w-full bg-amber-50 border border-amber-100 rounded-3xl p-6 text-left shadow-sm">
              <div className="flex items-center gap-3 mb-3 text-amber-700 font-bold uppercase text-xs tracking-widest">
                <Lightbulb className="w-5 h-5" />
                <span>Загрузились не все вопросы?</span>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed mb-4">
                Если программа видит меньше вопросов, чем есть в файле, возможно в документе используются «мягкие переносы» вместо абзацев.
              </p>
              <div className="bg-white/60 rounded-xl p-4 border border-amber-200/50">
                <p className="text-xs font-bold text-amber-800 mb-2 uppercase">Как исправить в Word:</p>
                <ol className="text-xs text-amber-900 space-y-2 list-decimal list-inside">
                  <li>Нажмите <kbd className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono shadow-sm">Ctrl + H</kbd></li>
                  <li>В поле <b>Найти:</b> введите <code className="bg-amber-100 px-1 font-mono font-bold">^l</code> (маленькая L)</li>
                  <li>В поле <b>Заменить на:</b> введите <code className="bg-amber-100 px-1 font-mono font-bold">^p</code></li>
                  <li>Нажмите <b>Заменить всё</b> и сохраните файл.</li>
                </ol>
              </div>
            </div>
          </div>
        );

      case 'mode_selection':
        const { count, total, percentage } = longAnswersStats;
        let statsColorClass = "bg-rose-50 border-rose-100 text-rose-700";
        if (percentage >= 66) statsColorClass = "bg-emerald-50 border-emerald-100 text-emerald-700";
        else if (percentage >= 33) statsColorClass = "bg-amber-50 border-amber-100 text-amber-700";

        return (
          <div className="max-w-5xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-12">
               <h2 className="text-2xl font-bold text-slate-900 mb-4">Файл: {state.fileName}</h2>
               <div className="flex flex-wrap items-center justify-center gap-3">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 font-bold shadow-sm">
                   <ClipboardList className="w-4 h-4" /> {total} вопросов в файле
                 </div>
                 <div className={`inline-flex items-center gap-2 px-4 py-2 border rounded-2xl font-bold shadow-sm transition-colors ${statsColorClass}`} title="Количество вопросов в файле, где правильный ответ — самый длинный">
                   <AlignLeft className="w-4 h-4" /> Длинные прав. ответы: {count} из {total} ({percentage}%)
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <button onClick={() => startSession('test')} className="group p-8 bg-white border-2 border-slate-100 rounded-3xl text-left hover:border-indigo-500 hover:shadow-2xl transition-all">
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ClipboardList className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Классический тест</h3>
                  <p className="text-sm text-slate-500">Случайная подборка из 25 вопросов для быстрой проверки.</p>
               </button>

               <button onClick={() => startSession('preparation')} className="group p-8 bg-white border-2 border-slate-100 rounded-3xl text-left hover:border-emerald-500 hover:shadow-2xl transition-all relative overflow-hidden">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BrainCircuit className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Режим подготовки</h3>
                  <p className="text-sm text-slate-500">Только неизученные вопросы. Идеально для запоминания.</p>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">
                      <span>Общий прогресс</span>
                      <span>{Math.round(globalProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-700" style={{width: `${globalProgress}%`}} />
                    </div>
                  </div>
               </button>

               <button onClick={() => startSession('speedrun')} className="group p-8 bg-white border-2 border-slate-100 rounded-3xl text-left hover:border-amber-500 hover:shadow-2xl transition-all">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Спидран</h3>
                  <p className="text-sm text-slate-500">Марафон по <b>всем</b> вопросам файла сразу. Для самых выносливых.</p>
               </button>
            </div>
            
            <div className="mt-12 text-center">
               <Button variant="outline" onClick={goHome}>Выбрать другой файл</Button>
            </div>
          </div>
        );

      case 'quiz':
        const globalIdx = state.currentSessionIndices[state.currentIndex];
        const q = state.allQuestions[globalIdx];
        const sessionProgress = ((state.currentIndex + 1) / state.currentSessionIndices.length) * 100;

        return (
          <div className="max-w-3xl mx-auto py-8 px-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                <span>{state.mode === 'test' ? 'Экзамен' : state.mode === 'speedrun' ? 'Спидран' : 'Подготовка'}</span>
                <span className="truncate ml-4 max-w-[200px]">{state.fileName}</span>
              </div>
              
              {(state.mode === 'preparation' || state.mode === 'speedrun') && (
                <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
                    <span>Изучено в файле</span>
                    <span>{Math.round(globalProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{width: `${globalProgress}%`}} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">
                  {state.currentIndex + 1}
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                  {state.mode === 'speedrun' ? 'Вопрос марафона' : 'Вопрос сессии'}: {state.currentIndex + 1} / {state.currentSessionIndices.length}
                </div>
              </div>
              <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-indigo-600 shadow-sm">
                Верно: {state.score}
              </div>
            </div>

            {state.mode !== 'test' && (
              <div className="w-full bg-slate-200 h-1.5 rounded-full mb-8 overflow-hidden">
                <div 
                  className={`${state.mode === 'speedrun' ? 'bg-amber-500' : 'bg-indigo-500'} h-full transition-all duration-300`} 
                  style={{width: `${sessionProgress}%`}} 
                />
              </div>
            )}

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 mb-6 flex items-center min-h-[140px]">
              <p className="text-xl md:text-2xl font-bold text-slate-800 leading-snug">{q.text}</p>
            </div>

            <div className="space-y-3 mb-12">
              {q.shuffledAnswers.map((ans, idx) => {
                let buttonStyle = "border-2 border-slate-100 bg-white text-slate-700 hover:border-indigo-200 hover:shadow-md";
                let icon = null;

                if (state.isAnswerChecked) {
                  if (idx === q.correctIndex) {
                    buttonStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-4 ring-emerald-100";
                    icon = <CheckCircle2 className="w-6 h-6 text-emerald-600 ml-auto" />;
                  } else if (state.selectedAnswerIndex === idx) {
                    buttonStyle = "bg-rose-50 border-rose-500 text-rose-900 ring-4 ring-rose-100";
                    icon = <XCircle className="w-6 h-6 text-rose-600 ml-auto" />;
                  } else {
                    buttonStyle = "opacity-40 grayscale-[0.5]";
                  }
                } else if (state.selectedAnswerIndex === idx) {
                  buttonStyle = "bg-indigo-50 border-indigo-600 text-indigo-900 ring-4 ring-indigo-100";
                }

                return (
                  <button key={idx} disabled={state.isAnswerChecked} onClick={() => setState(p => ({...p, selectedAnswerIndex: idx}))}
                    className={`w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${buttonStyle}`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black flex-shrink-0 ${
                      state.selectedAnswerIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-lg font-semibold">{ans.text}</span>
                    {icon}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center bg-white/80 backdrop-blur p-6 rounded-3xl sticky bottom-4 shadow-2xl border border-slate-200">
               <Button variant="outline" onClick={() => setState(p => ({...p, status: 'mode_selection'}))} className="gap-2">
                 <LogOut className="w-4 h-4" /> Выход
               </Button>
               {!state.isAnswerChecked ? (
                 <Button size="lg" className="px-12 rounded-xl shadow-lg" disabled={state.selectedAnswerIndex === null} onClick={checkAnswer}>
                   Проверить
                 </Button>
               ) : (
                 <Button size="lg" className="px-12 rounded-xl shadow-lg gap-2" onClick={nextQuestion}>
                   {state.currentIndex + 1 === state.currentSessionIndices.length ? 'Результаты' : 'Далее'}
                   <ChevronRight className="w-5 h-5" />
                 </Button>
               )}
            </div>
          </div>
        );

      case 'result':
        const totalResult = state.currentSessionIndices.length;
        const percentageResult = totalResult > 0 ? Math.round((state.score / totalResult) * 100) : 0;
        const isCompleted = state.mode === 'preparation' && state.solvedIndices.size === state.allQuestions.length;
        
        let colorClass = "text-rose-600 bg-rose-50 border-rose-100";
        if (percentageResult >= 80) colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
        else if (percentageResult >= 50) colorClass = "text-amber-600 bg-amber-50 border-amber-100";

        return (
          <div className="max-w-2xl mx-auto py-16 px-4 text-center animate-in zoom-in-95 duration-500">
            <div className={`inline-flex p-10 rounded-full mb-8 shadow-2xl ${isCompleted ? 'bg-indigo-600 text-white animate-bounce' : 'bg-white text-indigo-600 border-4 border-indigo-50'}`}>
              <Trophy className="w-24 h-24" />
            </div>
            
            {isCompleted ? (
              <>
                <h1 className="text-4xl font-black text-slate-900 mb-4">Блестящий результат!</h1>
                <p className="text-xl text-slate-500 mb-12">Вы полностью изучили все вопросы в этом файле ({state.allQuestions.length}).</p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-black text-slate-900 mb-2">Сессия завершена</h1>
                <p className="text-xl text-slate-500 mb-10">Ваш результат в этом раунде:</p>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
              <div className={`p-8 rounded-3xl shadow-xl border-2 transition-colors ${colorClass}`}>
                <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-70">Точность</p>
                <p className="text-6xl font-black tracking-tighter">
                  {percentageResult}%
                </p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Верных ответов</p>
                <p className="text-5xl font-black text-slate-900">
                  {state.score}<span className="text-xl text-slate-300 font-medium ml-1">/ {totalResult}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isCompleted && (
                <Button size="lg" className="gap-2 rounded-2xl shadow-xl" onClick={() => startSession(state.mode!)}>
                  <RefreshCcw className="w-5 h-5" /> {state.mode === 'test' ? 'Повторить тест' : state.mode === 'speedrun' ? 'Начать спидран снова' : 'Продолжить подготовку'}
                </Button>
              )}
              {isCompleted && (
                 <Button size="lg" className="gap-2 rounded-2xl shadow-xl" onClick={() => {
                   localStorage.removeItem(`progress_${state.fileName}`);
                   setState(p => ({...p, solvedIndices: new Set()}));
                   startSession('preparation');
                 }}>
                   Сбросить и начать заново
                 </Button>
              )}
              <Button variant="secondary" size="lg" className="rounded-2xl" onClick={() => setState(p => ({...p, status: 'mode_selection'}))}>
                К выбору режима
              </Button>
            </div>
          </div>
        );
      
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <p className="text-lg font-bold text-slate-600">Анализируем документ...</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={goHome}>
            <div className="bg-indigo-600 p-1.5 rounded-xl group-hover:rotate-12 transition-transform shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-slate-900">QuizMaster</span>
          </div>
          {state.status !== 'idle' && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-full max-w-[300px]">
               <Info className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{state.fileName}</span>
            </div>
          )}
        </div>
      </nav>

      <main className="pb-20">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
