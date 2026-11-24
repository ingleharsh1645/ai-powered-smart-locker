import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  rollNo: text('roll_no').notNull(),
  grade: text('grade').notNull(),
  section: text('section').notNull().default('A'),
  lockerId: text('locker_id').notNull(),
  avatarUrl: text('avatar_url'),
  xpPoints: integer('xp_points').notNull().default(250),
  streakDays: integer('streak_days').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const timetableEntries = pgTable('timetable_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  grade: text('grade').notNull(),
  timeSlot: text('time_slot').notNull(),
  subject: text('subject').notNull(),
  teacherName: text('teacher_name').notNull(),
  todaysTopic: text('todays_topic').notNull(),
  syllabusPercent: integer('syllabus_percent').notNull().default(0),
  status: text('status').notNull().default('Up Next'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const homeworkItems = pgTable('homework_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  grade: text('grade').notNull(),
  subject: text('subject').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  dueDate: text('due_date').notNull(),
  teacherName: text('teacher_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paripathBoards = pgTable('paripath_boards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  date: text('date').notNull(),
  suvichar: text('suvichar').notNull(),
  dinVishesh: text('din_vishesh').notNull(),
  aajKiNews: text('aaj_ki_news').notNull(),
  gkQuestion: text('gk_question').notNull(),
  gkAnswer: text('gk_answer').notNull(),
  isAiGenerated: boolean('is_ai_generated').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subjectMarks = pgTable('subject_marks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  studentId: integer('student_id')
    .references(() => students.id)
    .notNull(),
  subject: text('subject').notNull(),
  marks: integer('marks').notNull(),
  maxMarks: integer('max_marks').notNull().default(100),
  examName: text('exam_name').notNull(),
  unit1: integer('unit1').notNull().default(70),
  midTerm: integer('mid_term').notNull().default(75),
  latest: integer('latest').notNull().default(80),
  createdAt: timestamp('created_at').defaultNow(),
});

export const lockerLogs = pgTable('locker_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  studentId: integer('student_id')
    .references(() => students.id)
    .notNull(),
  lockerId: text('locker_id').notNull(),
  timestamp: text('timestamp').notNull(),
  action: text('action').notNull(),
  itemName: text('item_name').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const attendanceRecords = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  studentId: integer('student_id')
    .references(() => students.id)
    .notNull(),
  month: text('month').notNull(),
  percentage: integer('percentage').notNull(),
  daysPresent: integer('days_present').notNull(),
  totalDays: integer('total_days').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  students: many(students),
  timetableEntries: many(timetableEntries),
  homeworkItems: many(homeworkItems),
  paripathBoards: many(paripathBoards),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  owner: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  marks: many(subjectMarks),
  lockerLogs: many(lockerLogs),
  attendanceRecords: many(attendanceRecords),
}));
