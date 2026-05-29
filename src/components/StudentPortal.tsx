/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  GraduationCap, AlertTriangle, CheckCircle, BookOpen, 
  Sparkles, Check, ChevronDown, ChevronUp, PlayCircle 
} from 'lucide-react';
import { Student, ErrorQuestion } from '../types';

interface StudentPortalProps {
  students: Student[];
  errors: ErrorQuestion[];
  onUpdateErrorStatus: (errorId: string, status: 'PENDING' | 'MASTERED') => void;
  assignedStudentId?: string | null;
  userRole?: string | null;
}

export function StudentPortal({ 
  students, 
  errors,
  onUpdateErrorStatus,
  assignedStudentId,
  userRole
}: StudentPortalProps) {
  const isLinkedStudent = userRole === 'student' && assignedStudentId;
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (isLinkedStudent && assignedStudentId) return assignedStudentId;
    return 'student-1';
  });

  // Sync if props update
  React.useEffect(() => {
    if (isLinkedStudent && assignedStudentId) {
      setSelectedStudentId(assignedStudentId);
    }
  }, [assignedStudentId, isLinkedStudent]);

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0] || {
    name: '學生',
    grade: '國二',
    subject: '數學'
  };

  const studentErrors = errors.filter(e => e.studentId === selectedStudentId);
  const pendingErrors = studentErrors.filter(e => e.status === 'PENDING');
  const masteredErrors = studentErrors.filter(e => e.status === 'MASTERED');

  // Interactive Quiz state
  const [quizMode, setQuizMode] = useState<boolean>(false);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [studentAnswerInput, setStudentAnswerInput] = useState<string>('');
  const [quizResults, setQuizResults] = useState<{ [key: string]: 'CORRECT' | 'WRONG' | null }>({});
  const [showQuizExplanation, setShowQuizExplanation] = useState<boolean>(false);

  // Toggle reveal solution per item in regular error book view
  const [revealSolutions, setRevealSolutions] = useState<{ [key: string]: boolean }>({});

  const toggleRevealSolution = (id: string) => {
    setRevealSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startMiniQuiz = () => {
    if (pendingErrors.length === 0) return;
    setQuizMode(true);
    setQuizIndex(0);
    setStudentAnswerInput('');
    setShowQuizExplanation(false);
  };

  const handleQuizSubmit = () => {
    setShowQuizExplanation(true);
  };

  const handleMarkAsMasteredInQuiz = (errorId: string) => {
    onUpdateErrorStatus(errorId, 'MASTERED');
    
    // Jump to next or close
    if (quizIndex < pendingErrors.length - 1) {
      setTimeout(() => {
        setQuizIndex(prev => prev + 1);
        setStudentAnswerInput('');
        setShowQuizExplanation(false);
      }, 1500);
    } else {
      setTimeout(() => {
        setQuizMode(false);
      }, 1500);
    }
  };

  // Custom visual badges/milestones
  const hasMilestone1 = masteredErrors.length >= 1;
  const hasMilestone2 = masteredErrors.length >= 3;
  const hasMilestone3 = pendingErrors.length === 0 && studentErrors.length > 0;

  return (
    <div className="space-y-6" id="student-portal-root">
      
      {/* Visual greeting card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <GraduationCap className="w-64 h-64" />
        </div>

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-white/20 text-white text-[10px] font-black tracking-widest uppercase rounded-full">
              Student Space 學生端複習基地
            </span>
            <span className="px-2 py-0.5 bg-orange-400 text-amber-950 text-[9px] font-black rounded-full animate-pulse flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              段考高分複習模式
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black">嗨，{activeStudent.name}同學！</h2>
          <p className="text-xs text-indigo-100 max-w-xl leading-relaxed">
            系統已自動幫你彙整過去在【{activeStudent.subject}】中寫錯的題目，不需要在厚厚課本跟一堆考卷中翻找，我們今天就一起來消滅牠們吧！
          </p>
        </div>

        {/* Quick Quiz Summon trigger */}
        <div className="shrink-0 relative z-10">
          <button
            onClick={startMiniQuiz}
            disabled={pendingErrors.length === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-md ${
              pendingErrors.length > 0
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-900 border border-amber-300'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 cursor-not-allowed'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            啟動「錯題終結」隨堂小挑戰
          </button>
          {pendingErrors.length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-rose-500 text-white text-[9px] font-mono px-2 py-0.5 rounded-full border-2 border-indigo-600 font-extrabold animate-bounce">
              {pendingErrors.length} 題
            </span>
          )}
        </div>
      </div>

      {/* Selector for student profile (to demonstrate switching works for mock accounts) */}
      {!isLinkedStudent ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 justify-end">
          <span className="font-semibold text-slate-400">登入端身份切換 / 核對其他帳號：</span>
          <select 
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="p-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-bold outline-hidden shadow-xs cursor-pointer focus:border-indigo-505"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.grade} - {s.subject})</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-400 justify-end">
          <span>鎖定儲存於 Firebase 雲端之個人載具帳號：</span>
          <span className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-black text-xs">
            🎓 {activeStudent.name} ({activeStudent.grade} - {activeStudent.subject})
          </span>
        </div>
      )}

      {/* QUIZ ACTIVE MODE INTERACTIVE PANEL */}
      {quizMode && pendingErrors.length > 0 && (
        <div className="p-5 md:p-6 rounded-2xl border-2 border-amber-300 bg-amber-50/15 shadow-lg space-y-4 animate-zoom-in" id="active-quiz-panel">
          <div className="flex items-center justify-between border-b pb-3 border-amber-200 text-xs">
            <span className="font-extrabold text-amber-700 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              正在進行：錯題複習小挑戰
            </span>
            <span className="font-mono text-slate-500">
              當前題度: {quizIndex + 1} / {pendingErrors.length}
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-xs">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                {pendingErrors[quizIndex].unit}
              </span>
              <p className="font-sans text-sm md:text-base font-semibold text-slate-800 mt-2.5 leading-relaxed">
                {pendingErrors[quizIndex].questionText}
              </p>
            </div>

            {/* Student workspace input */}
            <div className="space-y-3">
              <label className="block text-xs text-slate-400 font-medium font-mono uppercase">我的答案或解題想法：</label>
              <textarea
                rows={2}
                value={studentAnswerInput}
                onChange={(e) => setStudentAnswerInput(e.target.value)}
                placeholder="在此填寫你得出的最終答案，或大致答題思路（例如：兩相似三角形面積比9:16，邊長比應該是3:4...）"
                className="w-full p-3 rounded-lg border border-slate-200 text-xs shadow-inner outline-hidden bg-white"
              ></textarea>
            </div>

            {/* Answer check reveal */}
            {showQuizExplanation ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fade-in">
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
                  <span className="font-bold block mb-1">❌ 之前你的錯題盲點：</span>
                  <p className="text-slate-600">{pendingErrors[quizIndex].wrongAnswer}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <span className="font-bold flex items-center gap-1 block mb-1">
                    <Check className="w-4 h-4" />
                    💡 正確解與公式分析：
                  </span>
                  <p className="text-slate-600 font-sans">{pendingErrors[quizIndex].correctAnswer}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setQuizMode(false)}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              暫停小測驗
            </button>

            <div className="flex items-center gap-3">
              {!showQuizExplanation ? (
                <button
                  onClick={handleQuizSubmit}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition shadow-sm"
                >
                  看解析對答案
                </button>
              ) : (
                <button
                  onClick={() => handleMarkAsMasteredInQuiz(pendingErrors[quizIndex].id)}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  我已經澈底學會了！ (消滅此錯題)
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Main Review Base structure (Page 3 student target layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Portable list of questions */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-100 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-50">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-800">📖 我的隨身錯題本 ({studentErrors.length} 題)</h3>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase">待複習: {pendingErrors.length} / 已複習: {masteredErrors.length}</span>
            </div>
          </div>

          {studentErrors.length > 0 ? (
            <div className="space-y-4">
              {studentErrors.map(err => {
                const solutionRevealed = revealSolutions[err.id] || false;
                
                return (
                  <div 
                    key={err.id}
                    className={`p-4 rounded-xl border transition-all ${
                      err.status === 'MASTERED'
                        ? 'border-emerald-100 bg-emerald-50/10'
                        : 'border-slate-150 hover:border-slate-350 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">
                          {err.unit}
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">{err.date} 登錄</span>
                      </div>

                      {/* Solved Status tag */}
                      <div>
                        {err.status === 'MASTERED' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[9px] flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            已消滅
                          </span>
                        ) : (
                          <button
                            onClick={() => onUpdateErrorStatus(err.id, 'MASTERED')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[9px] border border-rose-100 font-black transition-colors"
                          >
                            標記為：我搞懂了！
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="font-semibold text-slate-800 text-xs md:text-sm mb-3">
                      {err.questionText}
                    </p>

                    {/* Accordion trigger for solution steps */}
                    <button
                      onClick={() => toggleRevealSolution(err.id)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-slate-50/80 hover:bg-slate-50 text-[11px] font-bold text-slate-500 rounded-lg transition"
                    >
                      {solutionRevealed ? (
                        <>
                          收起解答與錯誤點
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          查看解題公式與錯誤盲點
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    {solutionRevealed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3 pt-3 border-t border-slate-100 text-xs animate-fade-in-down">
                        <div className="p-3.5 bg-red-50 text-red-800 rounded-xl leading-relaxed">
                          <strong className="block text-red-700 mb-1">⚠️ 盲點反思：</strong>
                          {err.wrongAnswer}
                        </div>
                        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl leading-relaxed">
                          <strong className="block text-emerald-700 mb-1">💡 精準解答：</strong>
                          {err.correctAnswer}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              目前沒有任何錯題檔案。恭喜你暫無痛點！
            </div>
          )}
        </div>

        {/* Motivational Milestones */}
        <div className="p-5 rounded-2xl border border-slate-100 bg-white space-y-4 shadow-xs">
          <h3 className="text-sm font-black text-slate-800">🏆 我的成長里程碑</h3>
          <p className="text-xs text-slate-400">當你跟著家教克服的錯題件數越多，即能解鎖對應徽章！</p>

          <div className="space-y-3.5 pt-2">
            
            {/* Badge 1 */}
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
              hasMilestone1 
                ? 'border-indigo-100 bg-indigo-50/30' 
                : 'border-slate-100 bg-slate-50/50 grayscale opacity-45'
            }`}>
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                🎖️
              </div>
              <div className="text-xs">
                <h4 className="font-extrabold text-slate-800">消滅首座大山</h4>
                <p className="text-slate-400 mt-0.5">成功複習並融會貫通第一個錯題</p>
                {hasMilestone1 && <span className="text-[9px] text-indigo-600 font-extrabold mt-1 block">✓ 已解鎖</span>}
              </div>
            </div>

            {/* Badge 2 */}
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
              hasMilestone2 
                ? 'border-indigo-100 bg-indigo-50/30 font-semibold' 
                : 'border-slate-100 bg-slate-50/50 grayscale opacity-45'
            }`}>
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-cyan-400 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                🏹
              </div>
              <div className="text-xs">
                <h4 className="font-extrabold text-slate-800">弱點終結者 (3+)</h4>
                <p className="text-slate-400 mt-0.5">完成 3 題以上難點重組</p>
                {hasMilestone2 && <span className="text-[9px] text-indigo-600 font-extrabold mt-1 block">✓ 已解鎖</span>}
              </div>
            </div>

            {/* Badge 3 */}
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
              hasMilestone3 
                ? 'border-indigo-100 bg-indigo-50/30 font-semibold' 
                : 'border-slate-100 bg-slate-50/50 grayscale opacity-45'
            }`}>
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-emerald-400 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                💎
              </div>
              <div className="text-xs">
                <h4 className="font-extrabold text-slate-800">黃金無暇考卷</h4>
                <p className="text-slate-400 mt-0.5">錯題全部封存，清空待審</p>
                {hasMilestone3 && <span className="text-[9px] text-indigo-600 font-bold mt-1 block">✓ 達成！</span>}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
