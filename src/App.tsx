/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Users, Heart, Sparkles, BookOpen, 
  HelpCircle, Info, RefreshCw, LogIn, LogOut, ShieldAlert,
  Sliders, UserCheck, Database, Calendar, CheckSquare, ListPlus
} from 'lucide-react';
import { Student, ProgressRecord, ErrorQuestion, ParentComment } from './types';
import { INITIAL_STUDENTS, INITIAL_RECORDS, INITIAL_ERRORS, INITIAL_COMMENTS } from './data';
import { TeacherPortal } from './components/TeacherPortal';
import { ParentPortal } from './components/ParentPortal';
import { StudentPortal } from './components/StudentPortal';

// Firebase core & auth dependencies
import { 
  auth, db, googleProvider, handleFirestoreError, OperationType 
} from './firebase';
import { 
  signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider 
} from 'firebase/auth';
import { 
  collection, doc, onSnapshot, setDoc, updateDoc, getDoc, getDocFromServer, writeBatch 
} from 'firebase/firestore';

export default function App() {
  // Authentication & Profile states
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize and register Classroom + Gmail scopes on boot
  useEffect(() => {
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
      googleProvider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
      googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
    } catch (err) {
      console.warn('Scope registration warning:', err);
    }
  }, []);

  // Firestore DB states
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [errors, setErrors] = useState<ErrorQuestion[]>([]);
  const [comments, setComments] = useState<ParentComment[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]); // exclusive for admin

  // Admin and Seeding feedback states
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  // Active portal tab routing state
  const [activePortal, setActivePortal] = useState<'teacher' | 'parent' | 'student' | 'admin'>('teacher');

  // Trigger server connection health test on boot to satisfy skill regulations
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'users', 'test-connection-loader'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // 1. Listen to Firebase Authentication State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load / sync user profile data on login
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data();
        setUserProfile(profile);
        
        // Auto-route based on role
        if (profile.role === 'admin') {
          setActivePortal('admin');
        } else if (profile.role === 'teacher') {
          setActivePortal('teacher');
        } else if (profile.role === 'parent') {
          setActivePortal('parent');
        } else if (profile.role === 'student') {
          setActivePortal('student');
        }
      } else {
        // First-time registration
        const isDefaultAdmin = user.email?.toLowerCase().trim() === 'michaelyang0809@gmail.com';
        const initialProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '未名使用者',
          photoURL: user.photoURL || '',
          role: isDefaultAdmin ? 'admin' : null,
          assignedStudentId: null
        };
        setUserProfile(initialProfile);
        try {
          await setDoc(userDocRef, initialProfile);
          if (isDefaultAdmin) {
            setActivePortal('admin');
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Real-time synchronizations from Firestore collections once authorized
  useEffect(() => {
    if (!user || !userProfile || !userProfile.role) return;

    // A. Sync Students
    const unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const list: Student[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Student);
      });
      setStudents(list);
    }, (err) => {
      console.error('Students sync issue: ', err);
    });

    // B. Sync Progress Records
    const unsubscribeRecords = onSnapshot(collection(db, 'records'), (snapshot) => {
      const list: ProgressRecord[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ProgressRecord);
      });
      setRecords(list);
    }, (err) => {
      console.error('Records sync issue: ', err);
    });

    // C. Sync Wrong Questions
    const unsubscribeErrors = onSnapshot(collection(db, 'errors'), (snapshot) => {
      const list: ErrorQuestion[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ErrorQuestion);
      });
      setErrors(list);
    }, (err) => {
      console.error('Errors sync issue: ', err);
    });

    // D. Sync Comments
    const unsubscribeComments = onSnapshot(collection(db, 'comments'), (snapshot) => {
      const list: ParentComment[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ParentComment);
      });
      setComments(list);
    }, (err) => {
      console.error('Comments sync issue: ', err);
    });

    // E. Sync Complete Users directory for admin role routing
    let unsubscribeUsersList = () => {};
    if (userProfile.role === 'admin') {
      unsubscribeUsersList = onSnapshot(collection(db, 'users'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data());
        });
        setUsersList(list);
      }, (err) => {
        console.error('UsersList sync issue: ', err);
      });
    }

    return () => {
      unsubscribeStudents();
      unsubscribeRecords();
      unsubscribeErrors();
      unsubscribeComments();
      unsubscribeUsersList();
    };
  }, [user, userProfile]);

  // Handle OAuth Google Login Action Flow
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error('Auth error during login: ', err);
    }
  };

  // Re-authorize or sync Google API Scopes for Classroom / Gmail
  const handleConnectGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error('Failed to connect Google APIs: ', err);
    }
  };

  // Handle Logout Action Flow
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAccessToken(null);
    } catch (err) {
      console.error('Logout error: ', err);
    }
  };

  // Admin handler to update user platform access role
  const handleUpdateUserRole = async (targetUid: string, nextRole: string | null, assignedStudentId: string | null) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: nextRole,
        assignedStudentId: nextRole === 'parent' || nextRole === 'student' ? assignedStudentId : null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}`);
    }
  };

  // Seeding trigger to batch seed Firestore collections with demonstration objects
  const handleSeedDatabase = async () => {
    setSeeding(true);
    setSeedSuccess(null);
    try {
      const batch = writeBatch(db);

      // Seed Student Metadata
      for (const item of INITIAL_STUDENTS) {
        batch.set(doc(db, 'students', item.id), item);
      }
      
      // Seed Academic Reports
      for (const item of INITIAL_RECORDS) {
        batch.set(doc(db, 'records', item.id), item);
      }

      // Seed Wrong Questions
      for (const item of INITIAL_ERRORS) {
        batch.set(doc(db, 'errors', item.id), item);
      }

      // Seed Parent Comments
      for (const item of INITIAL_COMMENTS) {
        batch.set(doc(db, 'comments', item.id), item);
      }

      await batch.commit();
      setSeedSuccess('恭喜！預設示範數據（學生、成績、錯題與家長意見）已原子化同步至 Firebase Cloud Firestore Database！');
      setTimeout(() => setSeedSuccess(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-seeding');
    } finally {
      setSeeding(false);
    }
  };

  // -------------------------------------------------------------
  // FIRESTORE CLOUD WRITE MUTATORS
  // -------------------------------------------------------------

  // 1. Teacher adds academic lesson progress log & error question cards
  const handleAddRecord = async (newRecord: ProgressRecord, newErrors: ErrorQuestion[]) => {
    try {
      // Create progress record doc
      await setDoc(doc(db, 'records', newRecord.id), newRecord);

      // Create each question doc
      for (const err of newErrors) {
        await setDoc(doc(db, 'errors', err.id), err);
      }

      // Adjust the target student's skill radar metrics based on weak units specified
      const targetStudent = students.find(s => s.id === newRecord.studentId);
      if (targetStudent) {
        const updatedSkills = { ...targetStudent.radarSkills };
        const modifier = newRecord.accuracyRate >= 80 ? 4 : newRecord.accuracyRate >= 60 ? 1 : -3;
        
        if (newRecord.weakUnits.includes('代數')) updatedSkills.algebra = Math.max(30, Math.min(100, updatedSkills.algebra + modifier));
        if (newRecord.weakUnits.includes('幾何')) updatedSkills.geometry = Math.max(30, Math.min(100, updatedSkills.geometry + modifier));
        if (newRecord.weakUnits.includes('數與式')) updatedSkills.numberSense = Math.max(30, Math.min(100, updatedSkills.numberSense + modifier));
        if (newRecord.weakUnits.includes('數據分析')) updatedSkills.dataAnalysis = Math.max(30, Math.min(100, updatedSkills.dataAnalysis + modifier));
        
        await updateDoc(doc(db, 'students', newRecord.studentId), {
          radarSkills: updatedSkills
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `records/${newRecord.id}`);
    }
  };

  // 2. Adjusting status of an error question (Mastered <=> Pending)
  const handleUpdateErrorStatus = async (errorId: string, status: 'PENDING' | 'MASTERED') => {
    try {
      await updateDoc(doc(db, 'errors', errorId), { status });

      const targetError = errors.find(e => e.id === errorId);
      if (targetError && status === 'MASTERED') {
        const targetStudent = students.find(s => s.id === targetError.studentId);
        if (targetStudent) {
          const updatedSkills = { ...targetStudent.radarSkills };
          const unit = targetError.unit;
          if (unit === '代數') updatedSkills.algebra = Math.min(100, updatedSkills.algebra + 6);
          if (unit === '幾何') updatedSkills.geometry = Math.min(100, updatedSkills.geometry + 6);
          if (unit === '數與式') updatedSkills.numberSense = Math.min(100, updatedSkills.numberSense + 6);
          if (unit === '數據分析') updatedSkills.dataAnalysis = Math.min(100, updatedSkills.dataAnalysis + 6);

          await updateDoc(doc(db, 'students', targetError.studentId), {
            radarSkills: updatedSkills
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `errors/${errorId}`);
    }
  };

  // 3. Submitting parent commentary memo
  const handleAddComment = async (newComment: ParentComment) => {
    try {
      await setDoc(doc(db, 'comments', newComment.id), newComment);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `comments/${newComment.id}`);
    }
  };

  // 4. Creation of a fresh Student profile file
  const handleAddStudent = async (newStudent: Student) => {
    try {
      await setDoc(doc(db, 'students', newStudent.id), newStudent);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `students/${newStudent.id}`);
    }
  };


  // -------------------------------------------------------------
  // RENDERING SECTIONS
  // -------------------------------------------------------------

  // Render booting states
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-250 p-4" id="loading-fallback">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg">E</div>
          <p className="text-sm font-bold tracking-widest text-slate-400 font-mono">LOADING CLOUD SERVICES...</p>
        </div>
      </div>
    );
  }

  // Render Login state screen if unauthenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-200 px-4 py-12 relative overflow-hidden" id="auth-unauthenticated">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950/90 to-slate-950 pointer-events-none" />
        
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 relative z-10 shadow-2xl backdrop-blur-md flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-3xl shadow-xl shadow-blue-500/20">
              E
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-2">EduConnect Pro</h1>
            <p className="text-blue-400 font-bold text-xs bg-blue-950/60 border border-blue-900/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              學生進度量化管理系統
            </p>
          </div>

          <p className="text-[13px] text-slate-400 leading-relaxed max-w-xs mx-auto">
            專為高效率個人指導設計的「三端即時聯動平台」。提供自動化課後成效登錄、隨身智慧錯題消滅、長期學習軌跡折線圖監控。
          </p>

          <button
            onClick={handleLogin}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer"
          >
            <LogIn className="w-4.5 h-4.5" />
            以 GOOGLE 帳號安全登入
          </button>

          <div className="border-t border-slate-800/80 pt-4 mt-2">
            <p className="text-[11px] text-slate-500 leading-snug">
              系統預設 <strong className="text-blue-400">michaelyang0809@gmail.com</strong> 為系統管理員。其餘新登入帳號將由管理員於後台統一核發教師、家長、或學生角色權限。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Gatekeepers screen if authenticated but profile role is still None
  if (userProfile && !userProfile.role) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-200 px-4 py-8 relative overflow-hidden" id="auth-unassigned">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-950/10 via-slate-950/90 to-slate-950 pointer-events-none" />
        
        <div className="w-full max-w-lg bg-slate-905 border border-slate-800 rounded-3xl p-8 relative z-10 shadow-2xl backdrop-blur-md flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="bg-amber-500/10 text-amber-500 p-3 rounded-2xl border border-amber-500/15">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">等待管理人員權限核發</h2>
              <p className="text-xs text-slate-400 font-mono">{userProfile.email}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-300">
            <p>
              親愛的用戶您好，您的 Google 帳戶已成功通過 Firebase 雲端身分認證。
            </p>
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
              <span className="font-extrabold text-amber-500 block mb-1">📢 目前帳務狀態：</span>
              本平台為封閉式學術追蹤載體。基於個人資料隱私與零信任架構，任何新人帳號首次連線時皆處於「未分配權限 (Inactive)」狀態，不具備任何敏感數據讀取權限。
            </div>
            <p>
              請立即聯繫全局管理員 <strong className="text-blue-400 underline font-mono">michaelyang0809@gmail.com</strong>，提供您的帳戶信箱，指派為以下的平台身分：
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-900/50 p-2.5 rounded-lg text-center border border-slate-800">
                <span className="font-bold text-blue-400 block mb-0.5">👩‍🏫 教師端</span>
                成績與錯題登錄
              </div>
              <div className="bg-slate-900/50 p-2.5 rounded-lg text-center border border-slate-800">
                <span className="font-bold text-amber-400 block mb-0.5">👨‍👩‍👦 家長端</span>
                雷達與長期折線
              </div>
              <div className="bg-slate-900/50 p-2.5 rounded-lg text-center border border-slate-800">
                <span className="font-bold text-indigo-400 block mb-0.5">🎓 學生端</span>
                智慧精熟挑戰
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-5 mt-2 flex justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              {userProfile.photoURL && (
                <img src={userProfile.photoURL} className="w-8 h-8 rounded-full border border-slate-700" alt="avatar" />
              )}
              <span className="font-bold text-slate-300">{userProfile.displayName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 rounded-lg font-bold"
            >
              登出帳號
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900" id="app-viewport">
      
      {/* ⚠️ MAIN BRAND HEADER - PROFESSIONAL POLISH DARK SCHEME */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3.5 md:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo with matching EduConnect Pro interactive emblem */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-blue-500/10">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base tracking-tight">EduConnect Pro</span>
                <span className="text-[10px] text-blue-400 bg-blue-950/85 border border-blue-800/60 px-2.5 py-0.5 rounded font-semibold">
                  {userProfile?.role === 'admin' ? '系統管理中心' : '學生學習量化平台'}
                </span>
                <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono">v2.0-cloud</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                以 Firebase 進行角色身分鎖定、與 Google 帳號綁定，保障各指導學子之個資與成績不重疊外洩。
              </p>
            </div>
          </div>

          {/* Three-Way Portal Switch Tabs plus Admin (Filtered based on current scope & auth credentials) */}
          <div className="flex p-1 rounded-xl bg-slate-800/80 border border-slate-700/50 max-w-full overflow-x-auto gap-1 relative" id="portal-role-switch">
            
            {/* Show view toggles only for Admins so that they can inspect and test easily */}
            {userProfile?.role === 'admin' ? (
              <>
                <button
                  onClick={() => setActivePortal('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activePortal === 'admin'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  權限控管
                </button>
                <button
                  onClick={() => setActivePortal('teacher')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activePortal === 'teacher'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  教師端
                </button>
                <button
                  onClick={() => setActivePortal('parent')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activePortal === 'parent'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  家長端
                </button>
                <button
                  onClick={() => setActivePortal('student')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activePortal === 'student'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  學生端
                </button>
              </>
            ) : (
              // LOCKED FOR REGULAR ASSIGNED ROLES
              <div className="px-3 py-1.5 text-xs text-slate-300 font-bold whitespace-nowrap select-none font-mono flex items-center gap-1.5">
                {userProfile?.role === 'teacher' && <span className="text-blue-400">👩‍🏫 授課教師端面板</span>}
                {userProfile?.role === 'parent' && <span className="text-amber-400">👨‍👩‍👦 學子家長端面板</span>}
                {userProfile?.role === 'student' && <span className="text-indigo-400">🎓 學生自主消滅端</span>}
              </div>
            )}
          </div>

          {/* User Signout Button */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-white font-bold">{userProfile?.displayName}</span>
              <span className="text-[10px] text-slate-400 capitalize tracking-wide bg-slate-800 px-1.5 py-0.5 rounded font-bold font-mono">
                {userProfile?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="登出系統"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95 cursor-pointer border border-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* 🔮 MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:px-8">
        
        {/* Interactive Multi-Portal Sync Tips */}
        <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3" id="sync-helper-bar">
          <p className="font-medium flex items-center gap-1.5 text-xs text-slate-600">
            <Info className="w-4.5 h-4.5 text-blue-500 shrink-0" />
            <span>
              <strong>多端雲端同步面板：</strong>此系統與 Google 帳號綁定。唯有管理員 michaelyang0809@gmail.com 可指派教師/家長/學生權限。
              {students.length === 0 && <span className="text-rose-500 font-extrabold ml-1">【提示】當前雲端資料庫無資料，管理員可至後台一鍵配置初始數據。</span>}
            </span>
          </p>
          
          {userProfile?.role === 'admin' && (
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shrink-0 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              一鍵同步範例數據
            </button>
          )}
        </div>

        {seedSuccess && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-800 text-xs font-bold leading-relaxed shadow-sm">
            ✅ {seedSuccess}
          </div>
        )}

        {/* DATA STATUS CHECK & SWITCH TO ACTIVE WORKSPACE VIEW */}
        {activePortal === 'admin' && userProfile?.role === 'admin' ? (
          <div className="space-y-6" id="admin-dashboard-container">
            {/* Database stats overview widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">平台註冊用戶</p>
                  <p className="text-2xl font-black text-slate-800">{usersList.length}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><UserCheck className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">指導學子總體</p>
                  <p className="text-2xl font-black text-slate-800">{students.length}</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">課程登錄筆數</p>
                  <p className="text-2xl font-black text-slate-800">{records.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckSquare className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">累計入庫錯題</p>
                  <p className="text-2xl font-black text-slate-800">{errors.length}</p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><ListPlus className="w-6 h-6" /></div>
              </div>
            </div>

            {/* Users listing with assignment drop-downs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-rose-500" />
                <h3 className="text-md font-extrabold text-slate-800">雲端帳號權限核發控制台 (Role Access Control)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold font-mono">
                      <th className="px-6 py-4">註冊人資訊 Profile</th>
                      <th className="px-6 py-4">信箱 Email</th>
                      <th className="px-6 py-4">指派角色 Assigned Role</th>
                      <th className="px-6 py-4">綁定對象學名 Linked Child</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold">
                          目前除管理員外尚未有其他 Google 帳戶登入初始化...
                        </td>
                      </tr>
                    ) : (
                      usersList.map((usr) => (
                        <tr key={usr.uid} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 flex items-center gap-3">
                            {usr.photoURL ? (
                              <img src={usr.photoURL} className="w-8 h-8 rounded-full border border-slate-200" alt="avatar" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                {usr.displayName?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-extrabold text-slate-800">{usr.displayName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {usr.uid}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-600">{usr.email}</td>
                          <td className="px-6 py-4">
                            {/* Role management switcher dropdown */}
                            <select
                              value={usr.role || ''}
                              onChange={(e) => handleUpdateUserRole(usr.uid, e.target.value || null, usr.assignedStudentId)}
                              className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
                            >
                              <option value="">無 (等待分流)</option>
                              <option value="admin">Admin 系統管理員</option>
                              <option value="teacher">Teacher 家教老師</option>
                              <option value="parent">Parent 學生家長</option>
                              <option value="student">Student 學生獨立端</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            {usr.role === 'parent' || usr.role === 'student' ? (
                              <select
                                value={usr.assignedStudentId || ''}
                                onChange={(e) => handleUpdateUserRole(usr.uid, usr.role, e.target.value || null)}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-hidden cursor-pointer"
                              >
                                <option value="">請選指導學生...</option>
                                {students.map((st) => (
                                  <option key={st.id} value={st.id}>{st.name} ({st.grade})</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-mono italic">
                                教師或管理者無須指派
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl border border-slate-100 bg-white">
              <h3 className="font-bold text-slate-800 mb-2">💡 測試流程指引</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-slate-600">
                作為系統管理員，您隨時可以使用右上方切換鈕模擬『教師』、『家長』、『學生』之界面連通性，不需頻繁退出登錄。
                當有其他人使用 Google 登入此平台時，身為管理員的您會在上方列表中看見它的帳號，將其指派為「家長」並在右側下拉選單中連結至特定的學生（例如「王小明」），該家長下次登入即可直接獲取該學子的一切即時量化與對話數據。
              </p>
            </div>
          </div>
        ) : activePortal === 'teacher' ? (
          <TeacherPortal 
            students={students}
            records={records}
            errors={errors}
            onAddRecord={handleAddRecord}
            onUpdateErrorStatus={handleUpdateErrorStatus}
            onAddStudent={handleAddStudent}
            accessToken={accessToken}
            onConnectGoogle={handleConnectGoogle}
          />
        ) : activePortal === 'parent' ? (
          <ParentPortal 
            students={students}
            records={records}
            errors={errors}
            comments={comments}
            onAddComment={handleAddComment}
            assignedStudentId={userProfile?.assignedStudentId}
            userRole={userProfile?.role}
          />
        ) : (
          <StudentPortal 
            students={students}
            errors={errors}
            onUpdateErrorStatus={handleUpdateErrorStatus}
            assignedStudentId={userProfile?.assignedStudentId}
            userRole={userProfile?.role}
          />
        )}

      </main>

      {/* 🏮 CONCISE HUMBLE FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 px-4 text-center text-xs font-mono tracking-tight mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-slate-500">
          <span>專案需求分析：劉祐辰 (113408026) & 楊子頡 (112103526) 成果管理系統</span>
          <span>© 2026 EduConnect Pro. Home Tutor Quantified Management Platform.</span>
        </div>
      </footer>

    </div>
  );
}
