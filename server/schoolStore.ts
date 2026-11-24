import fs from 'fs';
import path from 'path';
import type {
  AttendanceRecord,
  GradeLevel,
  HomeworkItem,
  LockerAction,
  LockerLog,
  Paripath,
  SchoolDatabase,
  Student,
  SubjectMark,
  TimetableEntry,
} from '../src/types/school.ts';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_PATH = path.join(DATA_DIR, 'school-db.json');

function createSeedDatabase(): SchoolDatabase {
  const students: Student[] = [
    {
      id: 'stu-1',
      name: 'Aarav Sharma',
      rollNo: '14',
      grade: '6th',
      section: 'A',
      lockerId: 'SL-604',
      avatarUrl: '/src/assets/images/student_avatar_aarav_1795534192335.jpg',
      xpPoints: 1420,
      streakDays: 12,
    },
    {
      id: 'stu-2',
      name: 'Ananya Patel',
      rollNo: '07',
      grade: '7th',
      section: 'B',
      lockerId: 'SL-712',
      avatarUrl: '/src/assets/images/student_avatar_ananya_1795534193414.jpg',
      xpPoints: 1680,
      streakDays: 18,
    },
    {
      id: 'stu-3',
      name: 'Kabir Deshmukh',
      rollNo: '22',
      grade: '6th',
      section: 'A',
      lockerId: 'SL-609',
      xpPoints: 1190,
      streakDays: 7,
    },
  ];

  const timetable: TimetableEntry[] = [
    {
      id: 'tt-6-1',
      grade: '6th',
      timeSlot: '08:30 AM - 09:15 AM',
      subject: 'Mathematics',
      teacherName: 'Mrs. Kavita Joshi',
      todaysTopic: 'Fractions, Decimals & Number Line Puzzles',
      syllabusPercent: 78,
      status: 'Completed',
    },
    {
      id: 'tt-6-2',
      grade: '6th',
      timeSlot: '09:20 AM - 10:05 AM',
      subject: 'General Science',
      teacherName: 'Mr. Rajesh Kulkarni',
      todaysTopic: 'Photosynthesis & Leaf Stomata Lab',
      syllabusPercent: 72,
      status: 'Live Now',
    },
    {
      id: 'tt-6-3',
      grade: '6th',
      timeSlot: '10:25 AM - 11:10 AM',
      subject: 'English Literature',
      teacherName: 'Ms. Meera Nair',
      todaysTopic: 'Storyboarding & Descriptive Paragraphs',
      syllabusPercent: 84,
      status: 'Up Next',
    },
    {
      id: 'tt-6-4',
      grade: '6th',
      timeSlot: '11:15 AM - 12:00 PM',
      subject: 'History & Civics',
      teacherName: 'Mr. Vikram Gokhale',
      todaysTopic: 'Indus Valley Town Planning & Crafts',
      syllabusPercent: 64,
      status: 'Up Next',
    },
    {
      id: 'tt-6-5',
      grade: '6th',
      timeSlot: '12:45 PM - 01:30 PM',
      subject: 'Computer Lab',
      teacherName: 'Ms. Sneha Verma',
      todaysTopic: 'Scratch Loops & Smart Sensor Logic',
      syllabusPercent: 90,
      status: 'Up Next',
    },
    {
      id: 'tt-7-1',
      grade: '7th',
      timeSlot: '08:30 AM - 09:15 AM',
      subject: 'Mathematics',
      teacherName: 'Mr. Arvind Rao',
      todaysTopic: 'Linear Equations in One Variable',
      syllabusPercent: 80,
      status: 'Completed',
    },
    {
      id: 'tt-7-2',
      grade: '7th',
      timeSlot: '09:20 AM - 10:05 AM',
      subject: 'Physics & Chemistry',
      teacherName: 'Dr. Sunita Menon',
      todaysTopic: 'Acids, Bases & Litmus Paper Test',
      syllabusPercent: 68,
      status: 'Live Now',
    },
    {
      id: 'tt-7-3',
      grade: '7th',
      timeSlot: '10:25 AM - 11:10 AM',
      subject: 'Geography',
      teacherName: 'Mrs. Priya Iyer',
      todaysTopic: 'Atmospheric Layers & Monsoon Winds',
      syllabusPercent: 75,
      status: 'Up Next',
    },
    {
      id: 'tt-7-4',
      grade: '7th',
      timeSlot: '11:15 AM - 12:00 PM',
      subject: 'English Grammar',
      teacherName: 'Ms. Meera Nair',
      todaysTopic: 'Active vs Passive Voice Workshop',
      syllabusPercent: 86,
      status: 'Up Next',
    },
    {
      id: 'tt-7-5',
      grade: '7th',
      timeSlot: '12:45 PM - 01:30 PM',
      subject: 'Robotics & Coding',
      teacherName: 'Ms. Sneha Verma',
      todaysTopic: 'Microcontroller LED Patterns',
      syllabusPercent: 82,
      status: 'Up Next',
    },
  ];

  const homework: HomeworkItem[] = [
    {
      id: 'hw-1',
      grade: '6th',
      subject: 'Mathematics',
      title: 'Fraction Number Line Worksheet',
      description: 'Solve Q1 to Q8 on comparing unlike fractions and simplify answers.',
      dueDate: 'Tomorrow · 08:30 AM',
      teacherName: 'Mrs. Kavita Joshi',
    },
    {
      id: 'hw-2',
      grade: '6th',
      subject: 'History & Civics',
      title: 'Indus Valley Seal Sketch',
      description: 'Draw and label 3 key features of Mohenjo-daro granaries in your notebook.',
      dueDate: 'Friday · 11:15 AM',
      teacherName: 'Mr. Vikram Gokhale',
    },
    {
      id: 'hw-3',
      grade: '7th',
      subject: 'Physics & Chemistry',
      title: 'Natural Indicators Home Lab',
      description: 'Record color changes using turmeric paper with lemon juice and baking soda.',
      dueDate: 'Tomorrow · 09:20 AM',
      teacherName: 'Dr. Sunita Menon',
    },
  ];

  const paripath: Paripath = {
    id: 'paripath-today',
    date: new Date().toISOString().slice(0, 10),
    suvichar:
      'Small daily curiosities grow into mighty discoveries—ask one thoughtful question in every class today.',
    dinVishesh:
      'National Science Curiosity Week — Celebrating hands-on student experiments and young inventors across schools.',
    aajKiNews:
      'ISRO engineers conducted a successful school outreach satellite workshop inspiring middle-school robotics clubs across India.',
    gkQuestion: 'Which gas do green plants absorb from the air during photosynthesis?',
    gkAnswer: 'Carbon dioxide (CO2), which they combine with water and sunlight to make glucose and release oxygen.',
    isAiGenerated: true,
  };

  const marks: SubjectMark[] = [
    {
      id: 'mk-1',
      studentId: 'stu-1',
      subject: 'Mathematics',
      marks: 88,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 79, midTerm: 84, latest: 88 },
    },
    {
      id: 'mk-2',
      studentId: 'stu-1',
      subject: 'General Science',
      marks: 82,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 74, midTerm: 78, latest: 82 },
    },
    {
      id: 'mk-3',
      studentId: 'stu-1',
      subject: 'English Literature',
      marks: 91,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 85, midTerm: 88, latest: 91 },
    },
    {
      id: 'mk-4',
      studentId: 'stu-1',
      subject: 'History & Civics',
      marks: 54,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 60, midTerm: 57, latest: 54 },
    },
    {
      id: 'mk-5',
      studentId: 'stu-1',
      subject: 'Computer Lab',
      marks: 94,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 88, midTerm: 91, latest: 94 },
    },
    {
      id: 'mk-6',
      studentId: 'stu-2',
      subject: 'Mathematics',
      marks: 93,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 87, midTerm: 90, latest: 93 },
    },
    {
      id: 'mk-7',
      studentId: 'stu-2',
      subject: 'Physics & Chemistry',
      marks: 58,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 65, midTerm: 61, latest: 58 },
    },
    {
      id: 'mk-8',
      studentId: 'stu-2',
      subject: 'Geography',
      marks: 85,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 79, midTerm: 82, latest: 85 },
    },
    {
      id: 'mk-9',
      studentId: 'stu-2',
      subject: 'English Grammar',
      marks: 89,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 83, midTerm: 86, latest: 89 },
    },
    {
      id: 'mk-10',
      studentId: 'stu-2',
      subject: 'Robotics & Coding',
      marks: 96,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 90, midTerm: 92, latest: 96 },
    },
    {
      id: 'mk-11',
      studentId: 'stu-3',
      subject: 'Mathematics',
      marks: 61,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 58, midTerm: 60, latest: 61 },
    },
    {
      id: 'mk-12',
      studentId: 'stu-3',
      subject: 'General Science',
      marks: 84,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 77, midTerm: 81, latest: 84 },
    },
    {
      id: 'mk-13',
      studentId: 'stu-3',
      subject: 'English Literature',
      marks: 79,
      maxMarks: 100,
      examName: 'Unit Assessment 2',
      termHistory: { unit1: 75, midTerm: 77, latest: 79 },
    },
  ];

  const lockerLogs: LockerLog[] = [
    {
      id: 'log-1',
      studentId: 'stu-1',
      lockerId: 'SL-604',
      timestamp: '08:20 AM',
      action: 'PLACED_INSIDE',
      itemName: 'Raincoat & Umbrella',
      note: 'Morning arrival check-in',
    },
    {
      id: 'log-2',
      studentId: 'stu-1',
      lockerId: 'SL-604',
      timestamp: '08:25 AM',
      action: 'TOOK_OUT',
      itemName: 'Maths Textbook & Geometry Box',
      note: 'Period 1 preparation',
    },
    {
      id: 'log-3',
      studentId: 'stu-1',
      lockerId: 'SL-604',
      timestamp: '09:18 AM',
      action: 'TOOK_OUT',
      itemName: 'Science Lab Notebook',
      note: 'Before Period 2',
    },
    {
      id: 'log-4',
      studentId: 'stu-1',
      lockerId: 'SL-604',
      timestamp: '12:05 PM',
      action: 'TOOK_OUT',
      itemName: 'Lunch Box & Steel Bottle',
      note: 'Recess break',
    },
    {
      id: 'log-5',
      studentId: 'stu-2',
      lockerId: 'SL-712',
      timestamp: '08:22 AM',
      action: 'TOOK_OUT',
      itemName: 'Algebra Workbook',
      note: 'Morning check-in',
    },
    {
      id: 'log-6',
      studentId: 'stu-2',
      lockerId: 'SL-712',
      timestamp: '09:17 AM',
      action: 'TOOK_OUT',
      itemName: 'Chemistry Safety Goggles & Lab Coat',
      note: 'Before Science Lab',
    },
    {
      id: 'log-7',
      studentId: 'stu-2',
      lockerId: 'SL-712',
      timestamp: '12:10 PM',
      action: 'PLACED_INSIDE',
      itemName: 'Robotics Kit Tray',
      note: 'Stored safely before lunch',
    },
  ];

  const attendance: AttendanceRecord[] = [
    { id: 'att-1-jun', studentId: 'stu-1', month: 'Jun', percentage: 92, daysPresent: 22, totalDays: 24 },
    { id: 'att-1-jul', studentId: 'stu-1', month: 'Jul', percentage: 96, daysPresent: 24, totalDays: 25 },
    { id: 'att-1-aug', studentId: 'stu-1', month: 'Aug', percentage: 88, daysPresent: 22, totalDays: 25 },
    { id: 'att-1-sep', studentId: 'stu-1', month: 'Sep', percentage: 95, daysPresent: 21, totalDays: 22 },
    { id: 'att-1-oct', studentId: 'stu-1', month: 'Oct', percentage: 96, daysPresent: 23, totalDays: 24 },
    { id: 'att-1-nov', studentId: 'stu-1', month: 'Nov', percentage: 98, daysPresent: 19, totalDays: 19 },
    { id: 'att-2-jun', studentId: 'stu-2', month: 'Jun', percentage: 96, daysPresent: 23, totalDays: 24 },
    { id: 'att-2-jul', studentId: 'stu-2', month: 'Jul', percentage: 96, daysPresent: 24, totalDays: 25 },
    { id: 'att-2-aug', studentId: 'stu-2', month: 'Aug', percentage: 92, daysPresent: 23, totalDays: 25 },
    { id: 'att-2-sep', studentId: 'stu-2', month: 'Sep', percentage: 100, daysPresent: 22, totalDays: 22 },
    { id: 'att-2-oct', studentId: 'stu-2', month: 'Oct', percentage: 96, daysPresent: 23, totalDays: 24 },
    { id: 'att-2-nov', studentId: 'stu-2', month: 'Nov', percentage: 100, daysPresent: 19, totalDays: 19 },
    { id: 'att-3-jun', studentId: 'stu-3', month: 'Jun', percentage: 87, daysPresent: 21, totalDays: 24 },
    { id: 'att-3-jul', studentId: 'stu-3', month: 'Jul', percentage: 92, daysPresent: 23, totalDays: 25 },
    { id: 'att-3-aug', studentId: 'stu-3', month: 'Aug', percentage: 84, daysPresent: 21, totalDays: 25 },
    { id: 'att-3-sep', studentId: 'stu-3', month: 'Sep', percentage: 91, daysPresent: 20, totalDays: 22 },
    { id: 'att-3-oct', studentId: 'stu-3', month: 'Oct', percentage: 92, daysPresent: 22, totalDays: 24 },
    { id: 'att-3-nov', studentId: 'stu-3', month: 'Nov', percentage: 95, daysPresent: 18, totalDays: 19 },
  ];

  return { students, timetable, homework, paripath, marks, lockerLogs, attendance };
}

class SchoolStore {
  private db: SchoolDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): SchoolDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as SchoolDatabase;
        if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.timetable)) {
          if (!Array.isArray(parsed.homework)) {
            parsed.homework = createSeedDatabase().homework;
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to read school DB, seeding fresh data:', err);
    }
    const seed = createSeedDatabase();
    this.saveData(seed);
    return seed;
  }

  private saveData(data: SchoolDatabase): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  private persist(): void {
    this.saveData(this.db);
  }

  getStudents(): Student[] {
    return this.db.students;
  }

  addStudent(input: {
    name: string;
    rollNo: string;
    grade: GradeLevel;
    section?: string;
    lockerId: string;
  }): Student {
    const id = `stu-${Date.now()}`;
    const newStudent: Student = {
      id,
      name: input.name.trim(),
      rollNo: input.rollNo.trim(),
      grade: input.grade,
      section: (input.section || 'A').trim().toUpperCase(),
      lockerId: input.lockerId.trim().toUpperCase(),
      xpPoints: 250,
      streakDays: 1,
    };
    this.db.students.push(newStudent);

    const defaultSubjects =
      input.grade === '6th'
        ? ['Mathematics', 'General Science', 'English Literature', 'History & Civics', 'Computer Lab']
        : ['Mathematics', 'Physics & Chemistry', 'Geography', 'English Grammar', 'Robotics & Coding'];

    defaultSubjects.forEach((subject, idx) => {
      const score = idx === 3 ? 62 : 76 + idx * 4;
      this.db.marks.push({
        id: `mk-${Date.now()}-${idx}`,
        studentId: id,
        subject,
        marks: score,
        maxMarks: 100,
        examName: 'Baseline Quiz',
        termHistory: {
          unit1: Math.max(45, score - 6),
          midTerm: Math.max(48, score - 3),
          latest: score,
        },
      });
    });

    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    months.forEach((month, idx) => {
      this.db.attendance.push({
        id: `att-${id}-${idx}`,
        studentId: id,
        month,
        percentage: 90 + (idx % 3) * 3,
        daysPresent: 22,
        totalDays: 24,
      });
    });

    this.db.lockerLogs.unshift({
      id: `log-${Date.now()}`,
      studentId: id,
      lockerId: newStudent.lockerId,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      action: 'PLACED_INSIDE',
      itemName: 'Welcome Starter Kit & ID Card',
      note: 'Smart locker provisioned',
    });

    this.persist();
    return newStudent;
  }

  getTimetable(grade?: GradeLevel): TimetableEntry[] {
    if (!grade) return this.db.timetable;
    return this.db.timetable.filter((t) => t.grade === grade);
  }

  addTimetableEntry(input: Omit<TimetableEntry, 'id'>): TimetableEntry {
    const entry: TimetableEntry = {
      ...input,
      id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.db.timetable.push(entry);
    this.persist();
    return entry;
  }

  deleteTimetableEntry(id: string): boolean {
    const before = this.db.timetable.length;
    this.db.timetable = this.db.timetable.filter((t) => t.id !== id);
    if (this.db.timetable.length !== before) {
      this.persist();
      return true;
    }
    return false;
  }

  syncDriveTimetable(grade: GradeLevel, entries: Omit<TimetableEntry, 'id' | 'grade'>[]): TimetableEntry[] {
    this.db.timetable = this.db.timetable.filter((t) => t.grade !== grade);
    const created = entries.map((e, idx) => ({
      ...e,
      id: `tt-sync-${Date.now()}-${idx}`,
      grade,
    }));
    this.db.timetable.push(...created);
    this.persist();
    return created;
  }

  getHomework(grade?: GradeLevel): HomeworkItem[] {
    if (!grade) return this.db.homework;
    return this.db.homework.filter((h) => h.grade === grade);
  }

  addHomework(input: Omit<HomeworkItem, 'id'>): HomeworkItem {
    const item: HomeworkItem = {
      ...input,
      id: `hw-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    this.db.homework.unshift(item);
    this.persist();
    return item;
  }

  deleteHomework(id: string): boolean {
    const before = this.db.homework.length;
    this.db.homework = this.db.homework.filter((h) => h.id !== id);
    if (this.db.homework.length !== before) {
      this.persist();
      return true;
    }
    return false;
  }

  getParipath(): Paripath {
    return this.db.paripath;
  }

  updateParipath(patch: Partial<Omit<Paripath, 'id'>>): Paripath {
    this.db.paripath = {
      ...this.db.paripath,
      ...patch,
      date: patch.date || new Date().toISOString().slice(0, 10),
    };
    this.persist();
    return this.db.paripath;
  }

  getMarks(studentId?: string): SubjectMark[] {
    if (!studentId) return this.db.marks;
    return this.db.marks.filter((m) => m.studentId === studentId);
  }

  upsertMark(input: {
    studentId: string;
    subject: string;
    marks: number;
    maxMarks?: number;
    examName?: string;
  }): SubjectMark {
    const existingIdx = this.db.marks.findIndex(
      (m) => m.studentId === input.studentId && m.subject.toLowerCase() === input.subject.trim().toLowerCase()
    );
    const clampedMarks = Math.max(0, Math.min(100, Math.round(input.marks)));

    if (existingIdx !== -1) {
      const existing = this.db.marks[existingIdx];
      this.db.marks[existingIdx] = {
        ...existing,
        marks: clampedMarks,
        maxMarks: input.maxMarks ?? existing.maxMarks,
        examName: input.examName?.trim() || existing.examName,
        termHistory: {
          unit1: existing.termHistory.midTerm,
          midTerm: existing.termHistory.latest,
          latest: clampedMarks,
        },
      };
      this.persist();
      return this.db.marks[existingIdx];
    }

    const created: SubjectMark = {
      id: `mk-${Date.now()}`,
      studentId: input.studentId,
      subject: input.subject.trim(),
      marks: clampedMarks,
      maxMarks: input.maxMarks ?? 100,
      examName: input.examName?.trim() || 'Unit Assessment',
      termHistory: {
        unit1: Math.max(40, clampedMarks - 8),
        midTerm: Math.max(45, clampedMarks - 4),
        latest: clampedMarks,
      },
    };
    this.db.marks.push(created);
    this.persist();
    return created;
  }

  getLockerLogs(studentId?: string): LockerLog[] {
    if (!studentId) return this.db.lockerLogs;
    return this.db.lockerLogs.filter((l) => l.studentId === studentId);
  }

  addLockerLog(input: {
    studentId: string;
    action: LockerAction;
    itemName: string;
    note?: string;
  }): LockerLog | null {
    const student = this.db.students.find((s) => s.id === input.studentId);
    if (!student) return null;

    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const log: LockerLog = {
      id: `log-${Date.now()}`,
      studentId: student.id,
      lockerId: student.lockerId,
      timestamp,
      action: input.action,
      itemName: input.itemName.trim(),
      note: input.note?.trim() || 'Smart Locker RFID Scan',
    };
    this.db.lockerLogs.unshift(log);
    this.persist();
    return log;
  }

  getAttendance(studentId?: string): AttendanceRecord[] {
    if (!studentId) return this.db.attendance;
    return this.db.attendance.filter((a) => a.studentId === studentId);
  }
}

export const schoolStore = new SchoolStore();
