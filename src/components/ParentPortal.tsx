/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LineChart, Sparkles, Heart, CheckCircle2, Award, 
  MessageSquare, User, Calendar, BookOpen, Clock, PenTool 
} from 'lucide-react';
import { Student, ProgressRecord, ErrorQuestion, ParentComment } from '../types';
import { RadarChart, TrendChart } from './VisualCharts';
import { auth } from '../firebase';

interface ParentPortalProps {
  students: Student[];
  records: ProgressRecord[];
  errors: ErrorQuestion[];
  comments: ParentComment[];
  onAddComment: (comment: ParentComment) => void;
  assignedStudentId?: string | null;
  userRole?: string | null;
}

export function ParentPortal({ 
  students, 
  records, 
  errors, 
  comments,
  onAddComment,
  assignedStudentId,
  userRole
}: ParentPortalProps) {
  // Let the parent select which child
  const isLinkedParent = userRole === 'parent' && assignedStudentId;
  const iparentStudents = isLinkedParent
    ? students.filter(s => s.id === assignedStudentId)
    : students; // Admin/Teacher sees all students

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (isLinkedParent && assignedStudentId) return assignedStudentId;
    return iparentStudents[0]?.id || 'student-1';
  });

  // Keep state synced if props update
  React.useEffect(() => {
    if (isLinkedParent && assignedStudentId) {
      setSelectedStudentId(assignedStudentId);
    }
  }, [assignedStudentId, isLinkedParent]);

  // New Comment input
  const [commentText, setCommentText] = useState('');
  const [showCommentSuccess, setShowCommentSuccess] = useState(false);

  const activeStudent: Student = students.find(s => s.id === selectedStudentId) || students[0] || {
    id: 'draft',
    name: '學生',
    grade: '國二',
    subject: '數學',
    parentName: '家長',
    parentPhone: '',
    avatarSeed: 'avatar',
    radarSkills: {
      algebra: 50,
      geometry: 50,
      numberSense: 50,
      dataAnalysis: 50,
      functions: 50
    }
  };
  const studentRecords = records.filter(r => r.studentId === selectedStudentId);
  const studentErrors = errors.filter(e => e.studentId === selectedStudentId);
  const studentComments = comments.filter(c => c.studentId === selectedStudentId);

  // Stats calculation
  const pendingErrors = studentErrors.filter(e => e.status === 'PENDING').length;
  const masteredErrors = studentErrors.filter(e => e.status === 'MASTERED').length;
  
  const averageAccuracy = studentRecords.length > 0 
    ? Math.round(studentRecords.reduce((sum, r) => sum + r.accuracyRate, 0) / studentRecords.length)
    : 0;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: ParentComment = {
      id: `comment-gen-${Date.now()}`,
      studentId: selectedStudentId,
      parentId: auth.currentUser?.uid || 'parent-1',
      date: new Date().toISOString().split('T')[0],
      content: commentText,
      parentName: auth.currentUser?.displayName || activeStudent.parentName || '家長'
    };

    onAddComment(newComment);
    setCommentText('');
    setShowCommentSuccess(true);
    setTimeout(() => {
      setShowCommentSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-6" id="parent-portal-root">
      
      {/* Upper header with student toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-white">
        <div>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-extrabold rounded-full border border-amber-100 inline-flex items-center gap-1 mb-2">
            <Heart className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            家長端專屬平台 Parent Portal
          </span>
          <h2 className="text-md font-black text-slate-800">歡迎回來，{activeStudent.parentName} 家長！</h2>
          <p className="text-xs text-slate-400">以下為您彙整孩子長期的量化學習表現。隨時掌握，不再因單次考試起伏而焦慮。</p>
        </div>

        {/* Child Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-md">
          {iparentStudents.map(student => (
            <button
              key={student.id}
              onClick={() => setSelectedStudentId(student.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStudentId === student.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👩‍👦 {student.name} 的學習數據
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory visualization Section (Solves Page 2 key value) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trajectory growth line */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-100 bg-white space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-800">📈 長期學習軌跡折線圖</h3>
            <p className="text-xs text-slate-400">將每一次的隨堂數據轉化為量化線條，能更客觀地看見孩子的進步曲線與穩定度</p>
          </div>

          <div className="pt-2">
            <TrendChart records={studentRecords} />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-150 text-center text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-1 font-medium">累積評估次數</span>
              <span className="text-lg font-mono font-black text-slate-700">{studentRecords.length} 次</span>
            </div>
            <div className="p-3.5 bg-blue-50/50 rounded-xl">
              <span className="text-slate-400 block mb-1 font-medium">平均隨堂正確率</span>
              <span className="text-lg font-mono font-black text-blue-600">{averageAccuracy}%</span>
            </div>
            <div className="p-3.5 bg-emerald-50/50 rounded-xl">
              <span className="text-slate-400 block mb-1 font-medium">已克服錯題數</span>
              <span className="text-lg font-mono font-black text-emerald-600">{masteredErrors} 題</span>
            </div>
          </div>
        </div>

        {/* Radial skill coverage */}
        <div className="p-5 rounded-2xl border border-slate-100 bg-white flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-800">📊 當前科目知識核心掌握雷達</h3>
            <p className="text-xs text-slate-400">老師在後端每一次的錯題與答題紀錄，會自動加權計算出孩子的強弱單元。</p>
          </div>

          <div className="my-auto py-4">
            <RadarChart skills={activeStudent.radarSkills} />
          </div>

          <div className="p-3 rounded-xl bg-orange-50/70 text-[11px] text-slate-600 leading-relaxed border border-orange-100/50">
            💡 <strong>家長建議：</strong> 孩子目前在 <strong>【幾何圖形】</strong> 部分答對率較低（{activeStudent.radarSkills.geometry}%），建議段考前請老師安排加強，並提醒孩子重算累計的 {pendingErrors} 題錯題。
          </div>
        </div>

      </div>

      {/* Dynamic Digital Contact Book / Notes sent by Tutor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chronological Message feed of lesson reports */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-100 bg-white space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">👨‍🏫 家教生實時課後量化回報欄 (電子聯絡簿)</h3>
          </div>

          <div className="space-y-4 relative pl-4 border-l border-slate-150">
            {studentRecords.length > 0 ? (
              studentRecords.slice().reverse().map((rec, idx) => (
                <div key={rec.id} className="relative pb-2" id={`timeline-item-${idx}`}>
                  {/* Timeline dot */}
                  <div className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white ring-4 ring-indigo-50"></div>
                  
                  <div className="p-4 rounded-xl border border-slate-100/80 bg-slate-50/30 hover:bg-slate-50/80 transition-all text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[11px] font-bold">{rec.date}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm text-[10px] font-semibold border border-indigo-100/50">
                          答對率：{rec.accuracyRate}%
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.homeworkStatus === '已完成' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        今日作業：{rec.homeworkStatus}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm mb-1">{rec.title}</h4>
                    <p className="text-slate-600 leading-relaxed font-sans">{rec.notes}</p>

                    {/* Shared file / export simulator */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>導師：劉祐辰 / 楊子頡 簽章</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        量化分析無誤
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs">尚無任何課堂歷史聯絡回報。</p>
            )}
          </div>
        </div>

        {/* Parent sign-off leaving comment (Dynamic persistence) */}
        <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PenTool className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">✍️ 家長回饋與電子簽章</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              您在此留下的建議或簽收訊息，會即時反饋至老師的排程儀表板，讓彼此溝通在第一時間同步。
            </p>

            {/* Existing Comments list */}
            <div className="space-y-3 mt-4 max-h-[160px] overflow-y-auto pr-1">
              {studentComments.map(c => (
                <div key={c.id} className="p-3 bg-white rounded-xl border border-slate-100 text-xs shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">{c.parentName} 家長</span>
                    <span className="font-mono text-slate-400 text-[9px]">{c.date}</span>
                  </div>
                  <p className="text-slate-600 font-sans italic">「{c.content}」</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmitComment} className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-xs">
            {showCommentSuccess && (
              <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold text-center animate-fade-in">
                已成功簽章並回傳反饋！📩
              </div>
            )}
            
            <textarea
              rows={3}
              required
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="老師辛苦了！孩子這週有很認真做錯題，幾何概念我們今天會再陪他多看，謝謝你的用心整理！"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-hidden focus:ring-1 focus:ring-blue-500"
            ></textarea>
            
            <button
              type="submit"
              className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-900 transition flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              確認電子簽收並傳送
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
