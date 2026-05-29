/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, BookOpen, FileSpreadsheet, Percent, Plus, Trash2, 
  Send, CheckCircle, GraduationCap, AlertTriangle, ChevronRight, 
  FileText, Clock, Settings, Sparkles, Filter, Mail, RefreshCw 
} from 'lucide-react';
import { Student, ProgressRecord, ErrorQuestion } from '../types';
import { RadarChart, TrendChart } from './VisualCharts';

interface TeacherPortalProps {
  students: Student[];
  records: ProgressRecord[];
  errors: ErrorQuestion[];
  onAddRecord: (record: ProgressRecord, newErrors: ErrorQuestion[]) => void;
  onUpdateErrorStatus: (errorId: string, status: 'PENDING' | 'MASTERED') => void;
  onAddStudent: (student: Student) => void;
  accessToken?: string | null;
  onConnectGoogle?: () => Promise<void>;
}

export function TeacherPortal({ 
  students, 
  records, 
  errors, 
  onAddRecord, 
  onUpdateErrorStatus,
  onAddStudent,
  accessToken = null,
  onConnectGoogle
}: TeacherPortalProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'new-log' | 'errors' | 'stats' | 'settings'>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  
  // New Student State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('國二');
  const [newStudentSubject, setNewStudentSubject] = useState('數學');
  const [newStudentExamDate, setNewStudentExamDate] = useState('2026-06-25');
  const [newStudentParentName, setNewStudentParentName] = useState('');
  const [newStudentParentPhone, setNewStudentParentPhone] = useState('');

  // -------------------------------------------------------------
  // NEW PROGRESS LOG / REPORT FORM STATE
  // -------------------------------------------------------------
  const [logTitle, setLogTitle] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [correctCount, setCorrectCount] = useState<number>(8);
  const [homeworkStatus, setHomeworkStatus] = useState<string>('已完成');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [selectedWeakUnits, setSelectedWeakUnits] = useState<string[]>(['幾何']);
  
  // Log Error Questions state
  interface ErrorInput {
    unit: string;
    questionText: string;
    wrongAnswer: string;
    correctAnswer: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  }
  const [errorInputs, setErrorInputs] = useState<ErrorInput[]>([
    { unit: '幾何', questionText: '', wrongAnswer: '', correctAnswer: '', difficulty: 'MEDIUM' }
  ]);

  // Report creation success modal/state
  const [creationSuccess, setCreationSuccess] = useState<boolean>(false);
  const [generationTime, setGenerationTime] = useState<string>('2 鐘 15 秒'); // Simulates saving time!
  const [errorBookFilter, setErrorBookFilter] = useState<'ALL' | 'PENDING' | 'MASTERED'>('ALL');
  const [errorUnitFilter, setErrorUnitFilter] = useState<string>('ALL');

  // -------------------------------------------------------------
  // GOOGLE CLASSROOM & NOTIFICATION INTEGRATION STATES
  // -------------------------------------------------------------
  const [newStudentParentEmail, setNewStudentParentEmail] = useState('');
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [classroomCourses, setClassroomCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [classroomStudents, setClassroomStudents] = useState<any[]>([]);
  const [selectedClassroomStudents, setSelectedClassroomStudents] = useState<string[]>([]);
  const [isFetchingClassroom, setIsFetchingClassroom] = useState(false);
  const [classroomStatusMsg, setClassroomStatusMsg] = useState<string>('');

  const [sendGmailCheck, setSendGmailCheck] = useState<boolean>(true);
  const [sendLineCheck, setSendLineCheck] = useState<boolean>(true);
  const [lastSubmittedLineUrl, setLastSubmittedLineUrl] = useState<string>('');
  const [gmailStatus, setGmailStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [gmailErrorMsg, setGmailErrorMsg] = useState<string>('');

  // -------------------------------------------------------------
  // GOOGLE WORKSPACE & NOTIFICATION API LOGIC
  // -------------------------------------------------------------
  const handleFetchCourses = async () => {
    if (!accessToken) {
      setClassroomStatusMsg('請點擊「連結 Google 帳戶」進行 Google Workspace 授權。');
      return;
    }
    setIsFetchingClassroom(true);
    setClassroomStatusMsg('正在安全讀取您的 Google Classroom 班級列表...');
    try {
      const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        throw new Error(`Google API 回傳錯誤: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      const courses = data.courses || [];
      setClassroomCourses(courses);
      if (courses.length > 0) {
        setSelectedCourseId(courses[0].id);
        setClassroomStatusMsg(`成功載入 ${courses.length} 個活躍班級！`);
        handleFetchCourseStudents(courses[0].id);
      } else {
        setClassroomStatusMsg('您的 Google Classroom 中沒有搜尋到任何活躍 (ACTIVE) 班級。');
      }
    } catch (err) {
      console.error(err);
      setClassroomStatusMsg('讀取失敗，帳務 Workspace 權限或 Token 過期。請重新點選連結授權。');
    } finally {
      setIsFetchingClassroom(false);
    }
  };

  const handleFetchCourseStudents = async (courseId: string) => {
    if (!accessToken) return;
    setIsFetchingClassroom(true);
    setClassroomStatusMsg('正在安全抓取該 Classroom 班級的名冊中...');
    try {
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        throw new Error(`名冊讀取失敗: ${res.status}`);
      }
      const data = await res.json();
      const studentsFound = data.students || [];
      setClassroomStudents(studentsFound);
      setSelectedClassroomStudents(studentsFound.map((ps: any) => ps.userId));
      setClassroomStatusMsg(`此班級共有 ${studentsFound.length} 名學生。請勾選欲匯入的對象：`);
    } catch (err) {
      console.error(err);
      setClassroomStudents([]);
      setClassroomStatusMsg('該 Classroom 班級名冊讀取失敗。若您不是此 Classroom 授課教師或協同管理者，可能會受限。');
    } finally {
      setIsFetchingClassroom(false);
    }
  };

  const handleImportSelectedStudents = () => {
    if (selectedClassroomStudents.length === 0) {
      alert('請至少勾選一名學生！');
      return;
    }
    
    let count = 0;
    selectedClassroomStudents.forEach(userId => {
      const cs = classroomStudents.find((s: any) => s.userId === userId);
      if (cs) {
        const importedStudent: Student = {
          id: `classroom-st-${cs.userId}`,
          name: cs.profile?.name?.fullName || '未命名 Classroom 學生',
          grade: '國二',
          subject: '數學',
          examDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          parentName: `${cs.profile?.name?.fullName || '學生'}之家長`,
          parentPhone: '0900-000-000',
          parentEmail: cs.profile?.emailAddress || '',
          avatarSeed: `avatar-${Math.floor(Math.random() * 100)}`,
          radarSkills: {
            algebra: 60,
            geometry: 60,
            numberSense: 60,
            dataAnalysis: 60,
            functions: 60
          }
        };
        onAddStudent(importedStudent);
        count++;
      }
    });

    alert(`🎉 成功同步！已將 Google Classroom 班級中的 ${count} 名學生匯入本系統。`);
    setShowClassroomModal(false);
    setClassroomCourses([]);
    setClassroomStudents([]);
    setSelectedClassroomStudents([]);
  };

  const handleSendGmailReport = async (studentName: string, recipientEmail: string, rec: ProgressRecord) => {
    if (!accessToken) {
      setGmailStatus('ERROR');
      setGmailErrorMsg('尚未授權或缺少 Google Token，無法使用 Gmail 服務。');
      return;
    }
    setGmailStatus('SENDING');
    try {
      const subject = `【EduConnect Pro】${studentName} 學習成效進度日誌-${rec.date}`;
      const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
      
      const emailContent = `To: ${recipientEmail}
Subject: ${utf8Subject}
Content-Type: text/html; charset=utf-8

<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background-color: #ffffff;">
  <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px;">
    <h2 style="color: #1e3a8a; margin: 0; font-size: 24px;">EduConnect Pro 學習進度報告</h2>
    <p style="color: #64748b; margin: 4px 0 0; font-size: 14px;">您的孩子學業軌跡即時反饋</p>
  </div>
  
  <div style="margin-top: 20px;">
    <p style="font-size: 16px; color: #334155;">親愛的 <strong>家長</strong> 您好：</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6;">此信件為課堂老師為 <strong>${studentName}</strong> 在 <strong>${rec.date}</strong> 登錄之學習反饋，詳細成果摘要如下：</p>
  </div>
  
  <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #3b82f6;">
    <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">課程主題/測驗:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; border-bottom: 1px solid #f1f5f9;">${rec.title}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">課堂答對率:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981; font-size: 16px; border-bottom: 1px solid #f1f5f9;">${rec.accuracyRate}% (${rec.correctCount} / ${rec.totalQuestions} 題)</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">家庭作業狀態:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; border-bottom: 1px solid #f1f5f9;"><span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${rec.homeworkStatus}</span></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #475569;">弱點突破單元:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">${rec.weakUnits.join(', ') || '無特別弱點'}</td>
      </tr>
    </table>
  </div>
  
  <div style="margin-top: 20px;">
    <h4 style="color: #1e3a8a; margin: 0 0 8px; font-size: 14px;">👩‍🏫 老師上課總評與家長叮嚀：</h4>
    <p style="font-size: 14px; color: #334155; line-height: 1.6; background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin: 0; font-style: italic;">"${rec.notes}"</p>
  </div>
  
  <div style="margin-top: 24px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">此信件由 EduConnect Pro 雲端系統同步自動發送。請登入本平台之家長端查閱量化趨勢與消滅錯題歷程。</p>
  </div>
</div>`;

      const base64Safe = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64Safe })
      });
      
      if (!res.ok) {
        throw new Error(`Gmail API 傳送失敗: ${res.statusText}`);
      }
      setGmailStatus('SUCCESS');
    } catch (err: any) {
      console.error(err);
      setGmailStatus('ERROR');
      setGmailErrorMsg(err?.message || String(err));
    }
  };

  // Find currently active student
  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const studentRecords = records.filter(r => r.studentId === selectedStudentId);
  const studentErrors = errors.filter(e => e.studentId === selectedStudentId);

  // Helper arrays
  const unitsList = ['代數', '幾何', '數與式', '數據分析', '函數'];

  // Add an empty error input slot
  const handleAddErrorInputSlot = () => {
    setErrorInputs([
      ...errorInputs,
      { unit: '幾何', questionText: '', wrongAnswer: '', correctAnswer: '', difficulty: 'MEDIUM' }
    ]);
  };

  // Remove an error input slot
  const handleRemoveErrorInputSlot = (idx: number) => {
    setErrorInputs(errorInputs.filter((_, i) => i !== idx));
  };

  const handleUpdateErrorInput = (idx: number, field: keyof ErrorInput, value: string) => {
    const updated = [...errorInputs];
    if (field === 'difficulty') {
      updated[idx][field] = value as 'EASY' | 'MEDIUM' | 'HARD';
    } else {
      updated[idx][field] = value;
    }
    setErrorInputs(updated);
  };

  // Handle Multi-selection of weak units
  const handleToggleWeakUnit = (unit: string) => {
    if (selectedWeakUnits.includes(unit)) {
      setSelectedWeakUnits(selectedWeakUnits.filter(u => u !== unit));
    } else {
      setSelectedWeakUnits([...selectedWeakUnits, unit]);
    }
  };

  // Submit progress report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    // 1. Calculate rate
    const accuracyRate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 2. Build the progress record
    const newRecordId = `record-gen-${Date.now()}`;
    const newRecord: ProgressRecord = {
      id: newRecordId,
      studentId: selectedStudentId,
      date: logDate,
      title: logTitle || '課堂進度測驗與評估',
      accuracyRate,
      totalQuestions,
      correctCount,
      weakUnits: selectedWeakUnits,
      reportSent: true,
      notes: teacherNotes || '本次課堂理解狀態良好，已完成授課進度並發布了錯題本。',
      homeworkStatus
    };

    // 3. Build new error questions based on custom inputs (only those with text filled)
    const validErrors: ErrorQuestion[] = errorInputs
      .filter(input => input.questionText.trim() !== '')
      .map((input, idx) => ({
        id: `err-gen-${Date.now()}-${idx}`,
        studentId: selectedStudentId,
        date: logDate,
        subject: activeStudent?.subject || '數學',
        unit: input.unit,
        questionText: input.questionText,
        wrongAnswer: input.wrongAnswer || '未填寫',
        correctAnswer: input.correctAnswer || '未填寫',
        status: 'PENDING',
        difficulty: input.difficulty
      }));

    // Trigger parent callback
    onAddRecord(newRecord, validErrors);

    // Dynamic Notifications: Google Gmail
    if (sendGmailCheck) {
      const recipient = activeStudent?.parentEmail || '';
      if (recipient.trim()) {
        handleSendGmailReport(activeStudent?.name || '家庭學生', recipient, newRecord);
      } else {
        setGmailStatus('ERROR');
        setGmailErrorMsg('此學生未綁定專屬家長信箱。請完成資料維護後再予以傳送。');
      }
    } else {
      setGmailStatus('IDLE');
    }

    // Dynamic Notifications: LINE
    if (sendLineCheck) {
      const parentNameText = activeStudent?.parentName || '家長';
      const studentNameText = activeStudent?.name || '';
      const weakModulesStr = selectedWeakUnits.join(', ') || '無特別弱點';
      const scoreStr = `${correctCount} / ${totalQuestions} 題 (${accuracyRate}%)`;
      const noteStr = teacherNotes || '本次課堂理解狀態良好。';
      
      const lineMessage = `【EduConnect Pro 學習狀況反饋】\n` +
        `親愛的 ${parentNameText} 您好：\n` +
        `您的孩子 ${studentNameText} 在 ${logDate} 的隨堂表現摘要如下：\n\n` +
        `📚 課程單元：${logTitle || '隨堂測驗評估'}\n` +
        `🎯 測驗正確率：${scoreStr}\n` +
        `📝 作業完工度：${homeworkStatus}\n` +
        `⚠️ 弱點掌握度：${weakModulesStr}\n` +
        `👩‍🏫 導師評語：${noteStr}\n\n` +
        `EduConnect 智慧量化平台已自動分析此報告，您可以登入家長端隨時查看其雷達分析圖與專屬錯題本！`;
        
      const shareUrl = `https://line.me/R/share?text=${encodeURIComponent(lineMessage)}`;
      setLastSubmittedLineUrl(shareUrl);
    } else {
      setLastSubmittedLineUrl('');
    }

    // Track a random 2 to 3 minutes mock output time
    const timeTaken = `${Math.floor(Math.random() * 2) + 1} 分 ${Math.floor(Math.random() * 60)} 秒`;
    setGenerationTime(timeTaken);

    // Show success banner
    setCreationSuccess(true);
    
    // Clear form
    setLogTitle('');
    setTeacherNotes('');
    setCorrectCount(8);
    setTotalQuestions(10);
    setErrorInputs([{ unit: '幾何', questionText: '', wrongAnswer: '', correctAnswer: '', difficulty: 'MEDIUM' }]);

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const newStudent: Student = {
      id: `student-gen-${Date.now()}`,
      name: newStudentName,
      grade: newStudentGrade,
      subject: newStudentSubject,
      examDate: newStudentExamDate,
      parentName: newStudentParentName || `${newStudentName}家長`,
      parentPhone: newStudentParentPhone || '0900-000-000',
      parentEmail: newStudentParentEmail || '',
      avatarSeed: `avatar-${Math.floor(Math.random() * 100)}`,
      radarSkills: {
        algebra: 70,
        geometry: 70,
        numberSense: 70,
        dataAnalysis: 70,
        functions: 70
      }
    };

    onAddStudent(newStudent);
    setSelectedStudentId(newStudent.id);
    setNewStudentName('');
    setNewStudentParentName('');
    setNewStudentParentPhone('');
    setNewStudentParentEmail('');
    setShowAddStudentModal(false);
  };

  // Error statistics
  const pendingErrorsCount = studentErrors.filter(e => e.status === 'PENDING').length;
  // Compute unit with most errors
  const mostErrorUnit = () => {
    if (studentErrors.length === 0) return '暫無數據';
    const counts: { [key: string]: number } = {};
    studentErrors.forEach(e => {
      counts[e.unit] = (counts[e.unit] || 0) + 1;
    });
    let maxUnit = '暫無';
    let max = -1;
    Object.entries(counts).forEach(([unit, count]) => {
      if (count > max) {
        max = count;
        maxUnit = unit;
      }
    });
    return maxUnit;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8" id="teacher-portal-root">
      {/* 1. Left Sidebar Navigation - Midnight Slate Theme */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
        
        {/* Core Quick Toggle Panel - Dark Mode */}
        <div className="p-4 rounded-xl border border-slate-850 bg-slate-900 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">核對指導學生</h2>
          </div>
          <div className="relative">
            <select
              id="student-select"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-805 bg-slate-800 text-sm font-semibold text-white shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
            >
              {students.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.grade} - {s.subject})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Links - Midnight Slate */}
        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-850 shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2.5 px-4 py-3 text-xs duration-200 transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-blue-600/20 border-l-4 border-blue-500 text-blue-400 rounded-r-md font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800 rounded-md font-medium'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            首頁總覽 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2.5 px-4 py-3 text-xs duration-200 transition-all cursor-pointer ${
              activeTab === 'students' 
                ? 'bg-blue-600/20 border-l-4 border-blue-500 text-blue-400 rounded-r-md font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800 rounded-md font-medium'
            }`}
          >
            <Users className="w-4 h-4" />
            班級管理 Students
          </button>
          <button
            onClick={() => setActiveTab('new-log')}
            className={`flex items-center justify-between px-3 py-2.5 text-xs duration-200 transition-all cursor-pointer relative ${
              activeTab === 'new-log' 
                ? 'bg-emerald-600 text-white shadow-md rounded-md font-bold' 
                : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/60 rounded-md font-semibold'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 shrink-0" />
              <span>課程與成績登錄</span>
            </span>
            <span className="bg-rose-500 text-white text-[8px] font-mono px-1 rounded-full animate-bounce">
              New
            </span>
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex items-center justify-between px-4 py-3 text-xs duration-200 transition-all cursor-pointer ${
              activeTab === 'errors' 
                ? 'bg-blue-600/20 border-l-4 border-blue-500 text-blue-400 rounded-r-md font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800 rounded-md font-medium'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4" />
              <span>本班錯題系統</span>
            </span>
            {pendingErrorsCount > 0 && (
              <span className="bg-rose-500/10 text-rose-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                {pendingErrorsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2.5 px-4 py-3 text-xs duration-200 transition-all cursor-pointer ${
              activeTab === 'stats' 
                ? 'bg-blue-600/20 border-l-4 border-blue-500 text-blue-400 rounded-r-md font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800 rounded-md font-medium'
            }`}
          >
            <Percent className="w-4 h-4" />
            量化統計分析 Stats
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2.5 px-4 py-3 text-xs duration-200 transition-all cursor-pointer ${
              activeTab === 'settings' 
                ? 'bg-blue-600/20 border-l-4 border-blue-500 text-blue-400 rounded-r-md font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800 rounded-md font-medium'
            }`}
          >
            <Settings className="w-4 h-4" />
            系統設定 Settings
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Dynamic Area */}
      <div className="flex-1 min-w-0">
        
        {/* Banner notifying successful submission from Page 2 */}
        {creationSuccess && (
          <div className="mb-6 p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-slate-800 shadow-md relative animate-fade-in-down" id="success-banner">
            <button
              onClick={() => setCreationSuccess(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer font-bold text-xs"
              title="關閉"
            >
              ✕ 關閉
            </button>
            <div className="flex items-start gap-3.5">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-md font-bold text-slate-900 font-sans tracking-tight">課後日誌數據同步成功！🎉</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  系統已為 <strong>{activeStudent?.name}</strong> 更新雲端數據。為了維繫順暢的家教/補習班家長溝通，系統依照您的設定自動觸發下列管道：
                </p>

                {/* Notifications status list inside success area */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Gmail Notify Outcome card */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-100 flex items-start gap-2.5 shadow-xs">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800">1. Google Mail (Gmail) 自動遞送</h4>
                      {!sendGmailCheck ? (
                        <p className="text-[11px] text-slate-400 mt-1">未核取電子郵件發送選項。</p>
                      ) : gmailStatus === 'SENDING' ? (
                        <p className="text-[11px] text-yellow-600 mt-1 animate-pulse">正在安全呼叫您的 Gmail API 傳送量化圖表信件...</p>
                      ) : gmailStatus === 'SUCCESS' ? (
                        <p className="text-[11px] text-emerald-600 font-bold mt-1">
                          ✓ 郵件已成功寄出！<br/>
                          <span className="font-mono text-slate-500 font-normal">收件端：{activeStudent?.parentEmail || '未綁定'}</span>
                        </p>
                      ) : gmailStatus === 'ERROR' ? (
                        <p className="text-[11px] text-rose-500 font-medium mt-1">
                          ⚠️ 寄送失敗：{gmailErrorMsg}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1">無運行進度。</p>
                      )}
                    </div>
                  </div>

                  {/* LINE Notify Outcome card */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-100 flex items-start gap-2.5 shadow-xs">
                    <div className="p-1.5 rounded-lg bg-green-50 text-[#06C755] font-extrabold flex items-center justify-center text-xs w-7 h-7">
                      L
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800">2. LINE 家政聯絡簿一鍵分享</h4>
                      {!sendLineCheck ? (
                        <p className="text-[11px] text-slate-400 mt-1">未啟用 LINE 反饋機制。</p>
                      ) : lastSubmittedLineUrl ? (
                        <div className="mt-1">
                          <p className="text-[11px] text-slate-500 mb-2">已動態格式化學習摘要。請點擊按鈕直接發送給家長群組：</p>
                          <a
                            href={lastSubmittedLineUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05a647] text-white font-extrabold text-[11px] rounded-lg transition shadow-xs cursor-pointer"
                          >
                            <span>📲 啟動 LINE 帶入預設訊息</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1">尚未建立訊息模版。</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-emerald-100 pt-3">
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3" />
                    統計耗時：~{generationTime}
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    (原傳統手動謄寫與弱點比對需耗費 45 分鐘，教育通報效率提升 95%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 1: 進度看板 DASHBOARD */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'dashboard' && activeStudent && (
          <div className="space-y-6" id="dashboard-tab">
            
            {/* Upper layout: Student detail + Skill Mastery Radar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Card A: 學生資訊 (Student Information Details) */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-white/90 shadow-xs" id="student-info-detail-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-linear-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {activeStudent.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-800">{activeStudent.name}</h2>
                      <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                        {activeStudent.grade}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">當前科目：{activeStudent.subject}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">家長姓名</span>
                    <span className="font-semibold text-slate-700">{activeStudent.parentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">聯絡方式</span>
                    <span className="font-mono text-slate-700 font-semibold">{activeStudent.parentPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">下次段考/段考日期</span>
                    <span className="font-mono text-rose-500 font-bold flex items-center gap-1">
                      {activeStudent.examDate || '未設定'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">累計上課次數</span>
                    <span className="font-mono text-indigo-600 font-bold">{studentRecords.length} 次</span>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-xl bg-orange-50/70 border border-orange-100/50 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="text-slate-600">
                    <strong>上課備忘：</strong>最近考試為 5 月底。加強學生手抄及錯題重寫，減少計算式粗心。
                  </span>
                </div>
              </div>

              {/* Card B: Radar Chart (知識掌握度) */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-xs flex flex-col justify-between" id="radar-chart-card">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">知識掌握度量化分析 <span className="text-teal-600 font-medium text-xs">(各單元正確率)</span></h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    結合歷次段考、隨堂卷、與錯題重寫成果之權重所得
                  </p>
                </div>
                <div className="my-auto pt-3">
                  <RadarChart skills={activeStudent.radarSkills} />
                </div>
              </div>

            </div>

            {/* Lower Layout: Long Term Trajectory + Statistical Summary Sidecards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Trajectory area chart */}
              <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-100 bg-white" id="growth-trajectory-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">長期答對率趨勢 (學習成果軌跡)</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">點擊各節點查看詳細課後報告與批改數據</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('new-log')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增課後數據
                  </button>
                </div>
                
                {studentRecords.length > 0 ? (
                  <TrendChart records={studentRecords} />
                ) : (
                  <div className="h-48 flex items-center justify-center border border-dashed rounded-xl text-slate-400 text-xs">
                    暫無學習紀錄，請點選上方「新增課後數據」建立點。
                  </div>
                )}
              </div>

              {/* Summary stat squares */}
              <div className="space-y-4">
                
                {/* Error count square */}
                <div className="p-4 rounded-xl border border-slate-100 bg-white flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">目前累積待複習錯題</span>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-mono font-black text-rose-600">{pendingErrorsCount}</span>
                    <span className="text-xs text-slate-400 ml-1">題 待精熟</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-50 text-xs flex justify-between">
                    <span className="text-slate-400">最需突破弱點：</span>
                    <span className="font-bold text-slate-700">{mostErrorUnit()}</span>
                  </div>
                </div>

                {/* Latest lesson report block */}
                <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-indigo-50/20 to-indigo-50/40 border-indigo-100/50 flex flex-col justify-between h-[155px]">
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block mb-1">本次課後成果報告</span>
                    {studentRecords.length > 0 ? (
                      <>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{studentRecords[studentRecords.length - 1].title}</h4>
                        <div className="flex items-baseline gap-1 mt-1.5">
                          <span className="text-2xl font-mono font-black text-slate-800">{studentRecords[studentRecords.length - 1].accuracyRate}%</span>
                          <span className="text-xs text-slate-400">答對率</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">暫無記錄</span>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-2.5 border-t border-indigo-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      聯絡簿已送至家長端
                    </span>
                    <button 
                      onClick={() => setActiveTab('new-log')}
                      className="text-indigo-600 hover:underline font-semibold"
                    >
                      補送報告
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* List of Previous Class Logs (動態聯絡簿歷程) */}
            <div className="p-5 rounded-2xl border border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-800 mb-4">歷次課程與測驗日誌 ({studentRecords.length} 筆)</h3>
              
              <div className="space-y-3">
                {studentRecords.slice().reverse().map((rec) => (
                  <div 
                    key={rec.id} 
                    className="p-4 rounded-xl border border-slate-100 hover:border-blue-100 bg-slate-50/30 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">{rec.date}</span>
                        <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          作業：{rec.homeworkStatus}
                        </span>
                        {rec.weakUnits.map(unit => (
                          <span key={unit} className="px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-600 text-[10px] font-semibold border border-rose-100">
                            弱點：{unit}
                          </span>
                        ))}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">{rec.title}</h4>
                      <p className="text-slate-500 italic max-w-2xl">{rec.notes}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">答題狀況 / 率</span>
                        <span className="font-bold text-slate-700">
                          {rec.correctCount} / {rec.totalQuestions} 題
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center font-mono font-bold text-sm bg-white shadow-xs">
                          <span className={rec.accuracyRate >= 80 ? 'text-emerald-600' : rec.accuracyRate >= 60 ? 'text-blue-500' : 'text-amber-600'}>
                            {rec.accuracyRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 2: 學生列表 STUDENTS */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'students' && (
          <div className="space-y-6" id="students-tab">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div>
                <h2 className="text-md font-bold text-slate-800">班級學生總覽與管理</h2>
                <p className="text-xs text-slate-400">目前已有 {students.length} 名追蹤學生。直接同步 Cloud Classroom 或手動建立學業軌跡。</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowClassroomModal(true);
                    handleFetchCourses();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  ✨ 匯入 Google Classroom 名冊
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  手動新增學生
                </button>
              </div>
            </div>

            {/* Student grid cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {students.map((student) => {
                const mathRecordsCount = records.filter(r => r.studentId === student.id).length;
                const mathErrorsCount = errors.filter(e => e.studentId === student.id && e.status === 'PENDING').length;
                
                return (
                  <div 
                    key={student.id} 
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`p-5 rounded-2xl border cursor-pointer hover:shadow-md transition-all h-full flex flex-col justify-between ${
                      selectedStudentId === student.id 
                        ? 'border-blue-500 bg-blue-50/5 ring-1 ring-blue-500' 
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-semibold text-[10px]">
                          {student.grade}
                        </span>
                        <span className="text-[10px] text-slate-400">下次考試: {student.examDate || '未設定'}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600">
                          {student.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{student.name}</h4>
                          <p className="text-xs text-slate-400">精選科目: {student.subject}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">家長姓名</span>
                          <span className="font-semibold text-slate-700">{student.parentName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">累積測驗</span>
                          <span className="font-semibold text-slate-700 font-mono">{mathRecordsCount} 次</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">待審錯題</span>
                          <span className="font-bold text-rose-500 font-mono">{mathErrorsCount} 題</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">家長電話</span>
                          <span className="font-semibold text-slate-600 font-mono">{student.parentPhone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold">
                      <span>{selectedStudentId === student.id ? '● 當前核對中' : '選擇此學生'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal for adding a student */}
            {showAddStudentModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 animate-zoom-in">
                  <h3 className="text-base font-bold text-slate-800 mb-4">✨ 新增指導學生</h3>
                  
                  <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">學生姓名</label>
                      <input 
                        type="text" 
                        required 
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="請輸入姓名，例：陳小華" 
                        className="w-full p-2.5 rounded-lg border text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 mb-1">年級/學年度</label>
                        <select
                          value={newStudentGrade}
                          onChange={(e) => setNewStudentGrade(e.target.value)}
                          className="w-full p-2.5 rounded-lg border text-sm"
                        >
                          <option value="國一">國一</option>
                          <option value="國二">國二</option>
                          <option value="國三">國三</option>
                          <option value="高一">高一</option>
                          <option value="高二">高二</option>
                          <option value="高三">高三</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">輔導科目</label>
                        <input 
                          type="text" 
                          required 
                          value={newStudentSubject}
                          onChange={(e) => setNewStudentSubject(e.target.value)}
                          placeholder="數學 / 理化..." 
                          className="w-full p-2.5 rounded-lg border text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">預計段考日期 (下次段考)</label>
                      <input 
                        type="date" 
                        value={newStudentExamDate}
                        onChange={(e) => setNewStudentExamDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 mb-1">家長姓名</label>
                        <input 
                          type="text" 
                          value={newStudentParentName}
                          onChange={(e) => setNewStudentParentName(e.target.value)}
                          placeholder="家長姓名" 
                          className="w-full p-2.5 rounded-lg border text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">家長聯絡電話</label>
                        <input 
                          type="text" 
                          value={newStudentParentPhone}
                          onChange={(e) => setNewStudentParentPhone(e.target.value)}
                          placeholder="手提電話" 
                          className="w-full p-2.5 rounded-lg border text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">家長電子信箱 (選填，將透過 Gmail API 自動寄送通知信)</label>
                      <input 
                        type="email" 
                        value={newStudentParentEmail}
                        onChange={(e) => setNewStudentParentEmail(e.target.value)}
                        placeholder="例：michaelyang0809+parent@gmail.com" 
                        className="w-full p-2.5 rounded-lg border text-sm font-mono"
                      />
                    </div>

                    <div className="pt-4 flex justify-end gap-2.5">
                      <button 
                        type="button"
                        onClick={() => setShowAddStudentModal(false)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                      >
                        取消
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                      >
                        確認新增
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 3: 新增課後數據進度登錄 NEW-LOG */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'new-log' && activeStudent && (
          <div className="p-6 rounded-2xl border border-slate-100 bg-white" id="new-log-tab">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="text-md font-bold text-slate-800">登錄今日學習數據 ({activeStudent.name})</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              填寫下課後的測驗正確率與紀錄錯題，系統會自動在幾秒內產生家長量化報告，完全免除手動翻找及計算的 45 分鐘程序！
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-6 text-xs text-slate-700">
              
              {/* Box A: Basic Info of lesson */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">課程/測驗單元標題 *</label>
                  <input 
                    type="text" 
                    required
                    value={logTitle}
                    onChange={(e) => setLogTitle(e.target.value)}
                    placeholder="例如：第四章 統計圖表與隨堂複習" 
                    className="w-full p-2.5 rounded-lg border text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">授課與記錄日期</label>
                  <input 
                    type="date" 
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-sm bg-white"
                  />
                </div>
              </div>

              {/* Box B: Scores & Correct Rates */}
              <div className="p-4 rounded-xl border border-blue-50 bg-blue-50/10">
                <h3 className="text-xs font-bold text-blue-900 mb-3 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-blue-600" />
                  本次隨堂測驗答對率核心數據
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">測驗總題數 (題)</label>
                    <input 
                      type="number" 
                      min="1"
                      required
                      value={totalQuestions}
                      onChange={(e) => setTotalQuestions(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg border text-sm bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">答對題數 (題)</label>
                    <input 
                      type="number" 
                      min="0"
                      max={totalQuestions}
                      required
                      value={correctCount}
                      onChange={(e) => setCorrectCount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg border text-sm bg-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="block text-slate-400 mb-1">系統自動計算答對率</span>
                    <div className="p-2.5 bg-blue-500/10 border border-blue-200/50 rounded-lg text-sm text-blue-700 font-bold font-mono flex items-center justify-center">
                      {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0} % 
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="block text-slate-500 mb-1.5 font-semibold">多選本次測驗或課程表現較弱的單元：</span>
                  <div className="flex flex-wrap gap-2">
                    {unitsList.map(unit => {
                      const selected = selectedWeakUnits.includes(unit);
                      return (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => handleToggleWeakUnit(unit)}
                          className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold transition ${
                            selected 
                              ? 'bg-rose-50 text-rose-600 border-rose-300' 
                              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {unit} {selected ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Box C: Notes for comment and homework */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">本次家庭作業狀態</label>
                    <select
                      value={homeworkStatus}
                      onChange={(e) => setHomeworkStatus(e.target.value)}
                      className="w-full p-2.5 rounded-lg border text-sm"
                    >
                      <option value="已完成">已完成 (認真完成且大部分觀念清楚)</option>
                      <option value="部分完成">部分完成 (缺少特定題型或公式漏寫)</option>
                      <option value="缺交">忘記/未完成 (需下週重寫並核對)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">隨堂評語與家長的話（聯絡簿文字）</label>
                  <textarea
                    rows={3}
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="請簡析今天上課的狀況，如：函數極限單元理解力不錯，但在求最值時容易犯符號移項的粗心算錯。已提醒他回家一定要將錯題重算一遍。"
                    className="w-full p-2.5 rounded-lg border text-sm"
                  ></textarea>
                </div>
              </div>

              {/* Box D: Interactive Error Question Insertion - CRUCIAL core feature */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    今日新增錯題存檔 (直接匯入錯題本)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddErrorInputSlot}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[11px] font-bold hover:bg-slate-900 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    追加一筆錯題
                  </button>
                </div>

                <div className="space-y-4">
                  {errorInputs.map((err, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs relative">
                      {errorInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveErrorInputSlot(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">所屬單元範圍</label>
                          <select
                            value={err.unit}
                            onChange={(e) => handleUpdateErrorInput(idx, 'unit', e.target.value)}
                            className="w-full p-2 rounded border bg-slate-50 text-xs"
                          >
                            {unitsList.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">題目難難度</label>
                          <select
                            value={err.difficulty}
                            onChange={(e) => handleUpdateErrorInput(idx, 'difficulty', e.target.value)}
                            className="w-full p-2 rounded border bg-slate-50 text-xs"
                          >
                            <option value="EASY">簡單 (基礎定義)</option>
                            <option value="MEDIUM">中等 (靈活變形)</option>
                            <option value="HARD">困難 (跨章節、奧數)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">題目敘述 *</label>
                          <input
                            type="text"
                            value={err.questionText}
                            onChange={(e) => handleUpdateErrorInput(idx, 'questionText', e.target.value)}
                            placeholder="請在此輸入題目的核心文字，如：求方程式 |2x - 3| < 5 的解為？"
                            className="w-full p-2 rounded border text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">學生的錯誤解法/答案</label>
                            <input
                              type="text"
                              value={err.wrongAnswer}
                              onChange={(e) => handleUpdateErrorInput(idx, 'wrongAnswer', e.target.value)}
                              placeholder="例：誤忽略绝对值符號，解為 x < 4"
                              className="w-full p-2 rounded border text-xs bg-rose-50/30"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">正確解題步驟與答案 *</label>
                            <input
                              type="text"
                              value={err.correctAnswer}
                              onChange={(e) => handleUpdateErrorInput(idx, 'correctAnswer', e.target.value)}
                              placeholder="例：-5 < 2x - 3 < 5 -> 解為 -1 < x < 4"
                              className="w-full p-2 rounded border text-xs bg-emerald-50/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications Channel Settings Switched */}
              <div className="p-4 rounded-xl border border-slate-100 bg-white/70 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                  🔔 家長即時通報管道設定 (學生成績與狀況同步)
                </h4>
                <p className="text-[11px] text-slate-400">
                  勾選下列管道後，當點擊下方發布時，系統將自動將這份量化表現及叮嚀，秒速送達家長的聯絡簿。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendGmailCheck}
                      onChange={(e) => setSendGmailCheck(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>電子信箱通知 (Gmail API)</span>
                    {activeStudent?.parentEmail ? (
                      <span className="text-[10px] text-emerald-600 font-mono font-medium">({activeStudent.parentEmail})</span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-medium">(未設定家長信箱)</span>
                    )}
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendLineCheck}
                      onChange={(e) => setSendLineCheck(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>LINE 聯絡簿通報 (一鍵動態帶入模版)</span>
                  </label>
                </div>
                
                {/* Google Workspace Account Link Status Indicator */}
                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/50 flex flex-wrap items-center justify-between gap-2.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Google 認證狀態：</span>
                    {accessToken ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-sm text-[10px]">
                        ✓ 雲端授權成功 (已綁定)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-sm text-[10px]">
                        ⚠️ 尚未授權 Google Workspace APIs
                      </span>
                    )}
                  </div>
                  {onConnectGoogle && (
                    <button
                      type="button"
                      onClick={onConnectGoogle}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-[10px] transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {accessToken ? '重新授權' : '連結 Google 帳戶'}
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-600 font-semibold"
                >
                  回看板
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-md"
                >
                  <Send className="w-4 h-4" />
                  發布並分享給家長 (1鍵搞定)
                </button>
              </div>

            </form>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 4: 錯題分析庫 ERRORS */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'errors' && activeStudent && (
          <div className="space-y-4" id="errors-tab">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-md font-bold text-slate-800">【{activeStudent.name}】錯題分析庫</h2>
                <p className="text-xs text-slate-400">系統自動彙整，隨堂有錯就登錄。段考前一鍵過濾印出複習。</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Chapter filter selector */}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  篩選:
                </span>
                <select
                  value={errorUnitFilter}
                  onChange={(e) => setErrorUnitFilter(e.target.value)}
                  className="p-1.5 rounded-lg border text-xs bg-white text-slate-700 font-semibold outline-hidden"
                >
                  <option value="ALL">全部單元</option>
                  {unitsList.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <select
                  value={errorBookFilter}
                  onChange={(e) => setErrorBookFilter(e.target.value)}
                  className="p-1.5 rounded-lg border text-xs bg-white text-slate-700 font-semibold outline-hidden"
                >
                  <option value="ALL">全部狀態</option>
                  <option value="PENDING">待複習</option>
                  <option value="MASTERED">已精熟</option>
                </select>
              </div>
            </div>

            {/* Error Book List */}
            {studentErrors.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {studentErrors
                  .filter(e => errorBookFilter === 'ALL' || e.status === errorBookFilter)
                  .filter(e => errorUnitFilter === 'ALL' || e.unit === errorUnitFilter)
                  .map((err) => (
                    <div 
                      key={err.id}
                      className={`p-4 rounded-xl border transition-all ${
                        err.status === 'MASTERED' 
                          ? 'border-emerald-100 bg-emerald-50/5' 
                          : 'border-slate-100 bg-white shadow-xs'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 pb-2.5 mb-3 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-400">{err.date}</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm text-[10px] font-bold border border-indigo-100">
                            {err.unit}
                          </span>
                          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                            err.difficulty === 'HARD' ? 'bg-rose-50 text-rose-600' : err.difficulty === 'MEDIUM' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                          }`}>
                            難度：{err.difficulty === 'HARD' ? '難' : err.difficulty === 'MEDIUM' ? '中' : '易'}
                          </span>
                        </div>

                        {/* Status Checkbox */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">狀態：</span>
                          <button
                            type="button"
                            onClick={() => onUpdateErrorStatus(err.id, err.status === 'PENDING' ? 'MASTERED' : 'PENDING')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition ${
                              err.status === 'MASTERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100/40'
                            }`}
                          >
                            {err.status === 'MASTERED' ? '✓ 已完封 (精熟)' : '⏳ 待重寫複習'}
                          </button>
                        </div>
                      </div>

                      {/* Question Core content */}
                      <div className="space-y-3 text-xs md:text-sm">
                        <div>
                          <p className="text-slate-400 text-[10.5px] uppercase font-mono tracking-wider font-semibold mb-1">錯誤題目敘述：</p>
                          <p className="font-sans font-medium text-slate-800 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                            {err.questionText}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-red-50/30 border border-red-100/50 rounded-xl">
                            <span className="font-bold text-red-700 block mb-1">❌ 學生盲點/錯誤答案</span>
                            <span className="text-slate-600 block">{err.wrongAnswer}</span>
                          </div>
                          <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-xl">
                            <span className="font-bold text-emerald-700 block mb-1">💡 精準解析與正確答案</span>
                            <span className="text-slate-600 block">{err.correctAnswer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed rounded-2xl text-slate-400 text-sm bg-white">
                未登入或暫無任何錯題項目。
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 5: 效能與量化 STATS */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'stats' && (
          <div className="space-y-6" id="stats-tab">
            
            {/* Efficiency metric from SUCCESS METRICS on PDF page 2 */}
            <div className="p-6 rounded-2xl bg-linear-to-r from-slate-900 to-indigo-950 text-white shadow-xl">
              <h2 className="text-lg font-bold text-sky-300">教育行政效率卓越提升</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                本系統依據家教老師之痛點設計，成功優化了課後整理錯題、統計測驗答對率及出具聯絡簿的冗長工作。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md">
                  <span className="text-[10px] text-sky-200 block uppercase tracking-widest font-mono">指標 A (行政產出時間)</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xs text-slate-300 line-through">45 分鐘</span>
                    <span className="text-5xl font-mono text-emerald-400 font-extrabold">2</span>
                    <span className="text-xs text-emerald-400">分鐘 內</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    手寫聯絡簿與手算計算器轉變為「自動化一鍵量化軌跡」之速度成效
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md">
                  <span className="text-[10px] text-sky-200 block uppercase tracking-widest font-mono">指標 B (精準度/家長滿意度)</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xs text-slate-400 header-text">單次碎片資訊</span>
                    <span className="text-5xl font-mono text-emerald-400 font-extrabold">100%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    家長可自系統介面看見「長期答對率折線趨勢」及「核心單元掌握雷達」之滿意回饋
                  </p>
                </div>
              </div>
            </div>

            {/* General student comparisons */}
            <div className="p-5 rounded-2xl border border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-800 mb-4">全部指導學生答對率與進度現狀</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b">
                    <tr>
                      <th className="py-2.5">Student</th>
                      <th>Grade</th>
                      <th>Subject</th>
                      <th>Test Coverage</th>
                      <th>Avg Accuracy</th>
                      <th>Weak Chapter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const list = records.filter(r => r.studentId === s.id);
                      const avg = list.length > 0 ? Math.round(list.reduce((sum, r) => sum + r.accuracyRate, 0) / list.length) : 70;
                      
                      return (
                        <tr key={s.id} className="border-b hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-800">{s.name}</td>
                          <td className="py-3 text-slate-600">{s.grade}</td>
                          <td className="py-3 text-slate-600">{s.subject}</td>
                          <td className="py-3 font-mono">{list.length} 回記錄</td>
                          <td className="py-3 font-mono font-bold text-sky-600">{avg}%</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold">
                              幾何圖形
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 6: 平台設定 SETTINGS */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-2xl border border-slate-100 bg-white space-y-4" id="settings-tab">
            <h2 className="text-md font-bold text-slate-800">教學平台系統參數</h2>
            <p className="text-xs text-slate-400">在此設定您的科目單元、家長通知信箱、以及導師認證證書等。</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border">
                <h4 className="font-bold text-slate-700 mb-2">通知同步設定</h4>
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span>產出量化報告後，同步以 LINE Notify 通知家長</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span>當學生在錯題本標註「已精熟」時，推送通知給老師</span>
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border">
                <h4 className="font-bold text-slate-700 mb-2">一鍵資料重置</h4>
                <p className="text-slate-500 mb-3">若需要清空數據並重新從空白表格演示，可點選此功能。</p>
                <button 
                  type="button" 
                  onClick={() => {
                    localStorage.removeItem('PROGRESS_MANAGEMENT_DATA');
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded hover:bg-rose-100 transition-colors"
                >
                  還原系統初始設定
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* MODAL: Google Classroom Importer */}
      {/* -------------------------------------------------------------------------------- */}
      {showClassroomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto animate-fade-in" id="classroom-importer-modal">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowClassroomModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-50 rounded-lg text-sm font-bold cursor-pointer"
            >
              ✕ 關閉
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
              <div className="p-2 bg-slate-900 text-white rounded-xl">
                <GraduationCap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-md font-bold text-slate-900 tracking-tight">從 Google Classroom 雲端名冊同步學生</h2>
                <p className="text-xs text-slate-500">
                  EduConnect 獨創 Classroom 聯動模式，免打字快速建立名冊與信箱綁定
                </p>
              </div>
            </div>

            {/* Scope authentication linkage call */}
            {!accessToken ? (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-4">
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  🔑 您需要先進行 Google Workspace 帳號登入授權，方可讀取 Classroom 班級列表。
                </p>
                {onConnectGoogle ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await onConnectGoogle();
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                    點我連結 Google 帳戶並授權
                  </button>
                ) : (
                  <p className="text-[11px] text-rose-500 font-bold">缺少授權觸發器。</p>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* Step A: Course choose list selector */}
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">1. 選擇 Google Classroom 課程/班級</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        handleFetchCourseStudents(e.target.value);
                      }}
                      className="flex-1 p-2.5 rounded-lg border text-xs bg-slate-50 text-slate-800 font-bold outline-hidden cursor-pointer"
                      disabled={isFetchingClassroom || classroomCourses.length === 0}
                    >
                      {classroomCourses.length === 0 ? (
                        <option>-- 查無活躍班級，請按右側刷新 --</option>
                      ) : (
                        classroomCourses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.name} {course.section ? `(${course.section})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    
                    <button
                      type="button"
                      onClick={handleFetchCourses}
                      className="px-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition"
                      title="重整班級列表"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetchingClassroom ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Status Prompt Block */}
                {classroomStatusMsg && (
                  <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl text-[11px] text-slate-600 leading-normal font-sans">
                    💡 {classroomStatusMsg}
                  </div>
                )}

                {/* Step B: Student list checklist selection */}
                <div>
                  <span className="block text-slate-600 mb-1.5 font-semibold">2. 選擇欲勾選並匯入之名單 (自動綁定家長信箱)</span>
                  
                  {isFetchingClassroom ? (
                    <div className="p-8 text-center border rounded-xl bg-slate-50/50">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-[11px] text-slate-500 animate-pulse font-mono">正在安全調用 Google Classroom APIs... 抓取學生對象</p>
                    </div>
                  ) : classroomStudents.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
                      <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>學生帳號</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedClassroomStudents.length === classroomStudents.length) {
                              setSelectedClassroomStudents([]);
                            } else {
                              setSelectedClassroomStudents(classroomStudents.map(e => e.userId));
                            }
                          }}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          {selectedClassroomStudents.length === classroomStudents.length ? '全部取消' : '全選'}
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {classroomStudents.map((cs) => {
                          const isChecked = selectedClassroomStudents.includes(cs.userId);
                          const mailAddr = cs.profile?.emailAddress || '未公開';
                          
                          return (
                            <label key={cs.userId} className="flex items-center justify-between p-3 hover:bg-slate-50/70 cursor-pointer">
                              <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedClassroomStudents(selectedClassroomStudents.filter(id => id !== cs.userId));
                                      } else {
                                        setSelectedClassroomStudents([...selectedClassroomStudents, cs.userId]);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                <div>
                                  <span className="font-bold text-slate-800">{cs.profile?.name?.fullName || '讀取中...'}</span>
                                  <p className="text-[10px] text-slate-400 font-mono">{mailAddr}</p>
                                </div>
                              </div>
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                                Classroom
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                      目前該課程無活躍學生名冊，或您尚未刷新。
                    </div>
                  )}
                </div>

                {/* Submission triggers inside modal wrapper */}
                <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowClassroomModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition cursor-pointer"
                    disabled={isFetchingClassroom}
                  >
                    關閉取消
                  </button>
                  <button
                    type="button"
                    onClick={handleImportSelectedStudents}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-md flex items-center gap-1 cursor-pointer"
                    disabled={isFetchingClassroom || selectedClassroomStudents.length === 0}
                  >
                    ✓ 批次確認匯入本機 ({selectedClassroomStudents.length} 人)
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
