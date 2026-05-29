/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ErrorQuestion {
  id: string;
  studentId: string;
  date: string;
  subject: string;
  unit: string;          // e.g. "幾何", "代數", "數與式", "數據分析"
  questionText: string;
  wrongAnswer: string;
  correctAnswer: string;
  status: 'PENDING' | 'MASTERED'; // '待複習' | '已精熟'
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ProgressRecord {
  id: string;
  studentId: string;
  date: string;          // YYYY-MM-DD
  title: string;         // e.g. "第二次段考模擬測驗", "幾何單元隨堂測驗"
  accuracyRate: number;  // 答對率 (%)
  totalQuestions: number;
  correctCount: number;
  weakUnits: string[];
  reportSent: boolean;
  notes: string;         // 老師給長的話/上課評語
  homeworkStatus: string; // "已完成" | "缺交" | "部分完成"
}

export interface Student {
  id: string;
  name: string;
  grade: string;         // e.g. "國二", "高一"
  subject: string;       // e.g. "數學", "理化"
  examDate?: string;     // 下一次考試日期 (YYYY-MM-DD or 雙十/10/30)
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  avatarSeed: string;    // for standard avatar customization
  radarSkills: {
    algebra: number;     // 代數 (%)
    geometry: number;    // 幾何 (%)
    numberSense: number; // 數與式 (%)
    dataAnalysis: number;// 數據分析 (%)
    functions: number;   // 函數 (%)
  };
}

export interface ParentComment {
  id: string;
  studentId: string;
  parentId: string;
  date: string;
  content: string;
  parentName: string;
}
