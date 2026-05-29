/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, ProgressRecord, ErrorQuestion, ParentComment } from './types';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'student-1',
    name: '王小明',
    grade: '國二',
    subject: '數學',
    examDate: '2026-06-15',
    parentName: '王大衛',
    parentPhone: '0912-345-678',
    parentEmail: 'michaelyang0809+parent1@gmail.com',
    avatarSeed: 'xiaoming',
    radarSkills: {
      algebra: 75,
      geometry: 60,
      numberSense: 70,
      dataAnalysis: 85,
      functions: 70
    }
  },
  {
    id: 'student-2',
    name: '林大同',
    grade: '國三',
    subject: '理化',
    examDate: '2026-06-08',
    parentName: '林媽媽',
    parentPhone: '0928-888-888',
    parentEmail: 'michaelyang0809+parent2@gmail.com',
    avatarSeed: 'datong',
    radarSkills: {
      algebra: 85,
      geometry: 90,
      numberSense: 80,
      dataAnalysis: 75,
      functions: 88
    }
  },
  {
    id: 'student-3',
    name: '陳美美',
    grade: '高一',
    subject: '數學',
    examDate: '2026-06-22',
    parentName: '陳爸爸',
    parentPhone: '0933-111-222',
    parentEmail: 'michaelyang0809+parent3@gmail.com',
    avatarSeed: 'meimei',
    radarSkills: {
      algebra: 65,
      geometry: 78,
      numberSense: 60,
      dataAnalysis: 70,
      functions: 55
    }
  }
];

export const INITIAL_RECORDS: ProgressRecord[] = [
  // 王小明 records
  {
    id: 'record-1-1',
    studentId: 'student-1',
    date: '2026-04-15',
    title: '第一章 數與式 課後小測驗',
    accuracyRate: 45,
    totalQuestions: 10,
    correctCount: 4,
    weakUnits: ['數與式'],
    reportSent: true,
    notes: '小明對於負數與絕對值的概念稍顯模糊，運算子乘除常搞混。作業已要求加強練習試題。',
    homeworkStatus: '部分完成'
  },
  {
    id: 'record-1-2',
    studentId: 'student-1',
    date: '2026-04-30',
    title: '第二章 元一次方程式 多元複習',
    accuracyRate: 65,
    totalQuestions: 12,
    correctCount: 8,
    weakUnits: ['代數'],
    reportSent: true,
    notes: '代數移項的部分有些微進步，但對應用問題（如：速率、分配問題）列式仍需要引導。',
    homeworkStatus: '已完成'
  },
  {
    id: 'record-1-4',
    studentId: 'student-1',
    date: '2026-05-10',
    title: '第三章 幾何圖形與角度 單元測驗',
    accuracyRate: 58,
    totalQuestions: 15,
    correctCount: 9,
    weakUnits: ['幾何'],
    reportSent: true,
    notes: '幾何證明的基本性質可以理解，但在平行線內錯角與同側內角應用方面有些混淆，幾何思維需要多做輔助線練習。',
    homeworkStatus: '已完成'
  },
  {
    id: 'record-1-5',
    studentId: 'student-1',
    date: '2026-05-22',
    title: '第四章 統計與機率 課堂綜合評測',
    accuracyRate: 88,
    totalQuestions: 16,
    correctCount: 14,
    weakUnits: ['數據分析'],
    reportSent: true,
    notes: '今日學習狀況非常棒！數據分析和統計圖表讀圖能力很強，答對率提升至88%。代數與數據分析概念掌握扎實，繼續保持！',
    homeworkStatus: '已完成'
  },

  // 林大同 records
  {
    id: 'record-2-1',
    studentId: 'student-2',
    date: '2026-05-01',
    title: '酸鹼中和與鹽類 複習卷',
    accuracyRate: 80,
    totalQuestions: 20,
    correctCount: 16,
    weakUnits: ['數與式', '代數'],
    reportSent: true,
    notes: '大同觀念清楚，主要是計算 pH 值時有一題對數運算粗心。',
    homeworkStatus: '已完成'
  },
  {
    id: 'record-2-2',
    studentId: 'student-2',
    date: '2026-05-15',
    title: '氧化還原與反應速率 進階評估',
    accuracyRate: 92,
    totalQuestions: 15,
    correctCount: 14,
    weakUnits: ['幾何'],
    reportSent: true,
    notes: '表現非常突出，化學計量觀念倒背如流，反應速率圖表題秒殺。下週將進入電磁學複習。',
    homeworkStatus: '已完成'
  },

  // 陳美美 records
  {
    id: 'record-3-1',
    studentId: 'student-3',
    date: '2026-05-05',
    title: '高一上 數列與級數 隨堂測驗',
    accuracyRate: 50,
    totalQuestions: 10,
    correctCount: 5,
    weakUnits: ['代數', 'functions'],
    reportSent: true,
    notes: '美美對等差數列公式熟悉，但等比級數求和公式記憶不全。需要重溫公式推導。',
    homeworkStatus: '部分完成'
  },
  {
    id: 'record-3-2',
    studentId: 'student-3',
    date: '2026-05-18',
    title: '多項式函數與不等式 單元小考',
    accuracyRate: 68,
    totalQuestions: 12,
    correctCount: 8,
    weakUnits: ['functions', 'algebra'],
    reportSent: true,
    notes: '多項式除法原理、餘式定理掌握良好。對於高次不等式區間正負判定有混淆，需要多加強數線劃分演練。',
    homeworkStatus: '已完成'
  }
];

export const INITIAL_ERRORS: ErrorQuestion[] = [
  // 王小明 error questions
  {
    id: 'err-1',
    studentId: 'student-1',
    date: '2026-04-15',
    subject: '數學',
    unit: '數與式',
    questionText: '已知 a、b 為實數，且 |a + 3| + |b - 5| = 0，求 a - b 之值？',
    wrongAnswer: 'a - b = 8',
    correctAnswer: 'a - b = -8',
    status: 'PENDING',
    difficulty: 'EASY'
  },
  {
    id: 'err-2',
    studentId: 'student-1',
    date: '2026-04-15',
    subject: '數學',
    unit: '數與式',
    questionText: '計算絕對值方程式： |2x - 1| = 5，則 x = ？',
    wrongAnswer: 'x = 3',
    correctAnswer: 'x = 3 或 x = -2',
    status: 'MASTERED',
    difficulty: 'EASY'
  },
  {
    id: 'err-3',
    studentId: 'student-1',
    date: '2026-04-30',
    subject: '數學',
    unit: '代數',
    questionText: '一條長度固定的繩子，圍成一個寬度比長度少 2 公尺的矩形，其面積為 48 平方公尺。請問此矩形的周長為多少公尺？',
    wrongAnswer: '周長 = 24 公尺',
    correctAnswer: '周長 = 28 公尺 (長8公尺, 寬6公尺)',
    status: 'PENDING',
    difficulty: 'MEDIUM'
  },
  {
    id: 'err-4',
    studentId: 'student-1',
    date: '2026-04-30',
    subject: '數學',
    unit: '代數',
    questionText: '若方程式 x² - kx + 9 = 0 有重根，且 k > 0，則 k = ？',
    wrongAnswer: 'k = 3',
    correctAnswer: 'k = 6',
    status: 'PENDING',
    difficulty: 'EASY'
  },
  {
    id: 'err-5',
    studentId: 'student-1',
    date: '2026-05-10',
    subject: '數學',
    unit: '幾何',
    questionText: '在三角形 ABC 中，角 A = 50度，且 I 為三角形的內心，求角 BIC = ？度。',
    wrongAnswer: '角 BIC = 100 度',
    correctAnswer: '角 BIC = 115 度 (公式: 90 + 角A / 2)',
    status: 'PENDING',
    difficulty: 'MEDIUM'
  },
  {
    id: 'err-6',
    studentId: 'student-1',
    date: '2026-05-10',
    subject: '數學',
    unit: '幾何',
    questionText: '已知圓 O 直徑為 10，弦 AB 長度為 8，求圓心 O 到弦 AB 的距離？',
    wrongAnswer: '距離 = 4',
    correctAnswer: '距離 = 3 (直角三角形半徑5, 弦半長4, 由畢氏定理求得距離為3)',
    status: 'PENDING',
    difficulty: 'MEDIUM'
  },
  {
    id: 'err-7',
    studentId: 'student-1',
    date: '2026-05-10',
    subject: '數學',
    unit: '幾何',
    questionText: '若兩相似三角形的面積比為 9 : 16，且小三角形的周長為 15，則大三角形的周長是多少？',
    wrongAnswer: '26.6 (幾何概念混淆，誤用 9:16 比比例)',
    correctAnswer: '20 (邊長比為面積比的平方根即 3:4，周長比亦為 3:4，故為 15 * 4 / 3 = 20)',
    status: 'PENDING',
    difficulty: 'MEDIUM'
  },
  {
    id: 'err-8',
    studentId: 'student-1',
    date: '2026-05-22',
    subject: '數學',
    unit: '數據分析',
    questionText: '投擲一顆公正骰子 6 次，紀錄點數為 1, 2, 3, 4, 5, 5。求這六個數據的「中位數」與「眾數」？',
    wrongAnswer: '中位數 3.5, 眾數 5',
    correctAnswer: '中位數 3.5, 眾數 5',
    status: 'MASTERED',
    difficulty: 'EASY'
  },

  // 林大同 error questions
  {
    id: 'err-2-1',
    studentId: 'student-2',
    date: '2026-05-01',
    subject: '理化',
    unit: '化學元素與計量',
    questionText: '2莫耳的葡萄糖(C₆H₁₂O₆)分子中，含有多少個氫原子？',
    wrongAnswer: '1.2 x 10²⁴ 個',
    correctAnswer: '1.44 x 10²⁵ 個 (1莫耳含12*6.02*10²³氫，2莫耳為24 * 6.02x10²³ = 1.44x10²⁵)',
    status: 'PENDING',
    difficulty: 'MEDIUM'
  }
];

export const INITIAL_COMMENTS: ParentComment[] = [
  {
    id: 'comment-1',
    studentId: 'student-1',
    parentId: 'parent-1',
    date: '2026-05-23',
    content: '非常感謝劉老師的用心整理！小明上完課後說他終於搞懂中位數和眾數的差別了。這個進度報告非常清晰，看到他的折線圖進步曲線，讓我們家長放心很多。家裡也會督促他好好複習幾何部分的錯題！',
    parentName: '王大衛'
  }
];
