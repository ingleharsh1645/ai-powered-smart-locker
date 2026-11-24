export type GradeLevel = '6th' | '7th';

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  grade: GradeLevel;
  section: string;
  lockerId: string;
  avatarUrl?: string;
  xpPoints: number;
  streakDays: number;
}

export type TimetableStatus = 'Completed' | 'Live Now' | 'Up Next';

export interface TimetableEntry {
  id: string;
  grade: GradeLevel;
  timeSlot: string;
  subject: string;
  teacherName: string;
  todaysTopic: string;
  syllabusPercent: number;
  status: TimetableStatus;
}

export interface HomeworkItem {
  id: string;
  grade: GradeLevel;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  teacherName: string;
}

export interface Paripath {
  id: string;
  date: string;
  suvichar: string;
  dinVishesh: string;
  aajKiNews: string;
  gkQuestion: string;
  gkAnswer: string;
  isAiGenerated?: boolean;
}

export interface SubjectMark {
  id: string;
  studentId: string;
  subject: string;
  marks: number;
  maxMarks: number;
  examName: string;
  termHistory: {
    unit1: number;
    midTerm: number;
    latest: number;
  };
}

export type LockerAction = 'TOOK_OUT' | 'PLACED_INSIDE';

export interface LockerLog {
  id: string;
  studentId: string;
  lockerId: string;
  timestamp: string;
  action: LockerAction;
  itemName: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  month: string;
  percentage: number;
  daysPresent: number;
  totalDays: number;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export interface SchoolDatabase {
  students: Student[];
  timetable: TimetableEntry[];
  homework: HomeworkItem[];
  paripath: Paripath;
  marks: SubjectMark[];
  lockerLogs: LockerLog[];
  attendance: AttendanceRecord[];
}
