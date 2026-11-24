import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  attendanceRecords,
  homeworkItems,
  lockerLogs,
  paripathBoards,
  students,
  subjectMarks,
  timetableEntries,
  users,
} from './schema.ts';
import type { GradeLevel, LockerAction, TimetableStatus } from '../types/school.ts';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({ uid, email })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to sync user account with database.', { cause: error });
  }
}

export async function ensureUserSeedData(userId: number): Promise<void> {
  try {
    const existingStudents = await db.select().from(students).where(eq(students.userId, userId));
    if (existingStudents.length > 0) return;

    const insertedStudents = await db
      .insert(students)
      .values([
        {
          userId,
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
          userId,
          name: 'Ananya Patel',
          rollNo: '07',
          grade: '7th',
          section: 'B',
          lockerId: 'SL-712',
          avatarUrl: '/src/assets/images/student_avatar_ananya_1795534193414.jpg',
          xpPoints: 1680,
          streakDays: 18,
        },
      ])
      .returning();

    const aarav = insertedStudents[0];
    const ananya = insertedStudents[1];

    await db.insert(timetableEntries).values([
      {
        userId,
        grade: '6th',
        timeSlot: '08:30 AM - 09:15 AM',
        subject: 'Mathematics',
        teacherName: 'Mrs. Kavita Joshi',
        todaysTopic: 'Fractions, Decimals & Number Line Puzzles',
        syllabusPercent: 78,
        status: 'Completed',
      },
      {
        userId,
        grade: '6th',
        timeSlot: '09:20 AM - 10:05 AM',
        subject: 'General Science',
        teacherName: 'Mr. Rajesh Kulkarni',
        todaysTopic: 'Photosynthesis & Leaf Stomata Lab',
        syllabusPercent: 72,
        status: 'Live Now',
      },
      {
        userId,
        grade: '6th',
        timeSlot: '10:25 AM - 11:10 AM',
        subject: 'English Literature',
        teacherName: 'Ms. Meera Nair',
        todaysTopic: 'Storyboarding & Descriptive Paragraphs',
        syllabusPercent: 84,
        status: 'Up Next',
      },
      {
        userId,
        grade: '6th',
        timeSlot: '11:15 AM - 12:00 PM',
        subject: 'History & Civics',
        teacherName: 'Mr. Vikram Gokhale',
        todaysTopic: 'Indus Valley Town Planning & Crafts',
        syllabusPercent: 64,
        status: 'Up Next',
      },
      {
        userId,
        grade: '7th',
        timeSlot: '08:30 AM - 09:15 AM',
        subject: 'Mathematics',
        teacherName: 'Mr. Arvind Rao',
        todaysTopic: 'Linear Equations in One Variable',
        syllabusPercent: 80,
        status: 'Completed',
      },
      {
        userId,
        grade: '7th',
        timeSlot: '09:20 AM - 10:05 AM',
        subject: 'Physics & Chemistry',
        teacherName: 'Dr. Sunita Menon',
        todaysTopic: 'Acids, Bases & Litmus Paper Test',
        syllabusPercent: 68,
        status: 'Live Now',
      },
    ]);

    await db.insert(homeworkItems).values([
      {
        userId,
        grade: '6th',
        subject: 'Mathematics',
        title: 'Fraction Number Line Worksheet',
        description: 'Solve Q1 to Q8 on comparing unlike fractions and simplify answers.',
        dueDate: 'Tomorrow · 08:30 AM',
        teacherName: 'Mrs. Kavita Joshi',
      },
      {
        userId,
        grade: '6th',
        subject: 'History & Civics',
        title: 'Indus Valley Seal Sketch',
        description: 'Draw and label 3 key features of Mohenjo-daro granaries in your notebook.',
        dueDate: 'Friday · 11:15 AM',
        teacherName: 'Mr. Vikram Gokhale',
      },
      {
        userId,
        grade: '7th',
        subject: 'Physics & Chemistry',
        title: 'Natural Indicators Home Lab',
        description: 'Record color changes using turmeric paper with lemon juice and baking soda.',
        dueDate: 'Tomorrow · 09:20 AM',
        teacherName: 'Dr. Sunita Menon',
      },
    ]);

    await db.insert(paripathBoards).values({
      userId,
      date: new Date().toISOString().slice(0, 10),
      suvichar:
        'Small daily curiosities grow into mighty discoveries—ask one thoughtful question in every class today.',
      dinVishesh:
        'National Science Curiosity Week — Celebrating hands-on student experiments and young inventors across schools.',
      aajKiNews:
        'ISRO engineers conducted a successful school outreach satellite workshop inspiring middle-school robotics clubs across India.',
      gkQuestion: 'Which gas do green plants absorb from the air during photosynthesis?',
      gkAnswer:
        'Carbon dioxide (CO2), which they combine with water and sunlight to make glucose and release oxygen.',
      isAiGenerated: true,
    });

    await db.insert(subjectMarks).values([
      {
        userId,
        studentId: aarav.id,
        subject: 'Mathematics',
        marks: 88,
        maxMarks: 100,
        examName: 'Unit Assessment 2',
        unit1: 79,
        midTerm: 84,
        latest: 88,
      },
      {
        userId,
        studentId: aarav.id,
        subject: 'General Science',
        marks: 82,
        maxMarks: 100,
        examName: 'Unit Assessment 2',
        unit1: 74,
        midTerm: 78,
        latest: 82,
      },
      {
        userId,
        studentId: aarav.id,
        subject: 'History & Civics',
        marks: 54,
        maxMarks: 100,
        examName: 'Unit Assessment 2',
        unit1: 60,
        midTerm: 57,
        latest: 54,
      },
      {
        userId,
        studentId: ananya.id,
        subject: 'Mathematics',
        marks: 93,
        maxMarks: 100,
        examName: 'Unit Assessment 2',
        unit1: 87,
        midTerm: 90,
        latest: 93,
      },
      {
        userId,
        studentId: ananya.id,
        subject: 'Physics & Chemistry',
        marks: 58,
        maxMarks: 100,
        examName: 'Unit Assessment 2',
        unit1: 65,
        midTerm: 61,
        latest: 58,
      },
    ]);

    await db.insert(lockerLogs).values([
      {
        userId,
        studentId: aarav.id,
        lockerId: aarav.lockerId,
        timestamp: '08:25 AM',
        action: 'TOOK_OUT',
        itemName: 'Maths Textbook & Geometry Box',
        note: 'Period 1 preparation',
      },
      {
        userId,
        studentId: aarav.id,
        lockerId: aarav.lockerId,
        timestamp: '09:18 AM',
        action: 'TOOK_OUT',
        itemName: 'Science Lab Notebook',
        note: 'Before Period 2',
      },
      {
        userId,
        studentId: ananya.id,
        lockerId: ananya.lockerId,
        timestamp: '09:17 AM',
        action: 'TOOK_OUT',
        itemName: 'Chemistry Safety Goggles & Lab Coat',
        note: 'Before Science Lab',
      },
    ]);

    const months = [
      { month: 'Jun', pct: 92, present: 22, total: 24 },
      { month: 'Jul', pct: 96, present: 24, total: 25 },
      { month: 'Aug', pct: 88, present: 22, total: 25 },
      { month: 'Sep', pct: 95, present: 21, total: 22 },
      { month: 'Oct', pct: 96, present: 23, total: 24 },
      { month: 'Nov', pct: 98, present: 19, total: 19 },
    ];
    for (const stu of insertedStudents) {
      await db.insert(attendanceRecords).values(
        months.map((m) => ({
          userId,
          studentId: stu.id,
          month: m.month,
          percentage: m.pct,
          daysPresent: m.present,
          totalDays: m.total,
        }))
      );
    }
  } catch (error) {
    console.error('Database seed failed in ensureUserSeedData:', error);
    throw new Error('Failed to initialize school records in database.', { cause: error });
  }
}

export async function listDbStudents(userId: number) {
  try {
    return await db.select().from(students).where(eq(students.userId, userId));
  } catch (error) {
    console.error('Database query failed in listDbStudents:', error);
    throw new Error('Failed to load students from database.', { cause: error });
  }
}

export async function createDbStudent(
  userId: number,
  input: { name: string; rollNo: string; grade: GradeLevel; section: string; lockerId: string }
) {
  try {
    const [created] = await db
      .insert(students)
      .values({
        userId,
        name: input.name,
        rollNo: input.rollNo,
        grade: input.grade,
        section: input.section,
        lockerId: input.lockerId,
        xpPoints: 250,
        streakDays: 1,
      })
      .returning();

    const defaultSubjects =
      input.grade === '6th'
        ? ['Mathematics', 'General Science', 'English Literature', 'History & Civics', 'Computer Lab']
        : ['Mathematics', 'Physics & Chemistry', 'Geography', 'English Grammar', 'Robotics & Coding'];

    await db.insert(subjectMarks).values(
      defaultSubjects.map((subject, idx) => {
        const score = idx === 3 ? 62 : 76 + idx * 4;
        return {
          userId,
          studentId: created.id,
          subject,
          marks: score,
          maxMarks: 100,
          examName: 'Baseline Quiz',
          unit1: Math.max(45, score - 6),
          midTerm: Math.max(48, score - 3),
          latest: score,
        };
      })
    );

    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    await db.insert(attendanceRecords).values(
      months.map((month, idx) => ({
        userId,
        studentId: created.id,
        month,
        percentage: 90 + (idx % 3) * 3,
        daysPresent: 22,
        totalDays: 24,
      }))
    );

    await db.insert(lockerLogs).values({
      userId,
      studentId: created.id,
      lockerId: created.lockerId,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      action: 'PLACED_INSIDE',
      itemName: 'Welcome Starter Kit & ID Card',
      note: 'Smart locker provisioned',
    });

    return created;
  } catch (error) {
    console.error('Database query failed in createDbStudent:', error);
    throw new Error('Failed to register student in database.', { cause: error });
  }
}

export async function listDbTimetable(userId: number) {
  try {
    return await db.select().from(timetableEntries).where(eq(timetableEntries.userId, userId));
  } catch (error) {
    console.error('Database query failed in listDbTimetable:', error);
    throw new Error('Failed to load timetable from database.', { cause: error });
  }
}

export async function createDbTimetableEntry(
  userId: number,
  input: {
    grade: GradeLevel;
    timeSlot: string;
    subject: string;
    teacherName: string;
    todaysTopic: string;
    syllabusPercent: number;
    status: TimetableStatus;
  }
) {
  try {
    const [created] = await db
      .insert(timetableEntries)
      .values({ userId, ...input })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in createDbTimetableEntry:', error);
    throw new Error('Failed to save timetable entry.', { cause: error });
  }
}

export async function deleteDbTimetableEntry(userId: number, id: number) {
  try {
    const deleted = await db
      .delete(timetableEntries)
      .where(and(eq(timetableEntries.id, id), eq(timetableEntries.userId, userId)))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteDbTimetableEntry:', error);
    throw new Error('Failed to delete timetable entry.', { cause: error });
  }
}

export async function syncDbTimetableBulk(
  userId: number,
  grade: GradeLevel,
  entries: Array<{
    timeSlot: string;
    subject: string;
    teacherName: string;
    todaysTopic: string;
    syllabusPercent: number;
    status: TimetableStatus;
  }>
) {
  try {
    await db
      .delete(timetableEntries)
      .where(and(eq(timetableEntries.userId, userId), eq(timetableEntries.grade, grade)));
    const inserted = await db
      .insert(timetableEntries)
      .values(entries.map((e) => ({ userId, grade, ...e })))
      .returning();
    return inserted;
  } catch (error) {
    console.error('Database query failed in syncDbTimetableBulk:', error);
    throw new Error('Failed to sync bulk timetable.', { cause: error });
  }
}

export async function listDbHomework(userId: number) {
  try {
    return await db
      .select()
      .from(homeworkItems)
      .where(eq(homeworkItems.userId, userId))
      .orderBy(desc(homeworkItems.id));
  } catch (error) {
    console.error('Database query failed in listDbHomework:', error);
    throw new Error('Failed to load homework items.', { cause: error });
  }
}

export async function createDbHomework(
  userId: number,
  input: {
    grade: GradeLevel;
    subject: string;
    title: string;
    description: string;
    dueDate: string;
    teacherName: string;
  }
) {
  try {
    const [created] = await db
      .insert(homeworkItems)
      .values({ userId, ...input })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in createDbHomework:', error);
    throw new Error('Failed to save homework item.', { cause: error });
  }
}

export async function deleteDbHomework(userId: number, id: number) {
  try {
    const deleted = await db
      .delete(homeworkItems)
      .where(and(eq(homeworkItems.id, id), eq(homeworkItems.userId, userId)))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteDbHomework:', error);
    throw new Error('Failed to delete homework item.', { cause: error });
  }
}

export async function getDbParipath(userId: number) {
  try {
    const rows = await db
      .select()
      .from(paripathBoards)
      .where(eq(paripathBoards.userId, userId))
      .orderBy(desc(paripathBoards.id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getDbParipath:', error);
    throw new Error('Failed to load Paripath board.', { cause: error });
  }
}

export async function saveDbParipath(
  userId: number,
  input: {
    date: string;
    suvichar: string;
    dinVishesh: string;
    aajKiNews: string;
    gkQuestion: string;
    gkAnswer: string;
    isAiGenerated: boolean;
  }
) {
  try {
    const [created] = await db
      .insert(paripathBoards)
      .values({ userId, ...input })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in saveDbParipath:', error);
    throw new Error('Failed to save Paripath board.', { cause: error });
  }
}

export async function listDbMarks(userId: number, studentId: number) {
  try {
    return await db
      .select()
      .from(subjectMarks)
      .where(and(eq(subjectMarks.userId, userId), eq(subjectMarks.studentId, studentId)));
  } catch (error) {
    console.error('Database query failed in listDbMarks:', error);
    throw new Error('Failed to load student marks.', { cause: error });
  }
}

export async function upsertDbMark(
  userId: number,
  input: { studentId: number; subject: string; marks: number; examName: string }
) {
  try {
    const existing = await db
      .select()
      .from(subjectMarks)
      .where(and(eq(subjectMarks.userId, userId), eq(subjectMarks.studentId, input.studentId)));
    const match = existing.find((m) => m.subject.toLowerCase() === input.subject.toLowerCase());

    if (match) {
      const [updated] = await db
        .update(subjectMarks)
        .set({
          marks: input.marks,
          examName: input.examName,
          unit1: match.midTerm,
          midTerm: match.latest,
          latest: input.marks,
        })
        .where(and(eq(subjectMarks.id, match.id), eq(subjectMarks.userId, userId)))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(subjectMarks)
      .values({
        userId,
        studentId: input.studentId,
        subject: input.subject,
        marks: input.marks,
        maxMarks: 100,
        examName: input.examName,
        unit1: Math.max(40, input.marks - 8),
        midTerm: Math.max(45, input.marks - 4),
        latest: input.marks,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in upsertDbMark:', error);
    throw new Error('Failed to update student marks.', { cause: error });
  }
}

export async function listDbLockerLogs(userId: number, studentId: number) {
  try {
    return await db
      .select()
      .from(lockerLogs)
      .where(and(eq(lockerLogs.userId, userId), eq(lockerLogs.studentId, studentId)))
      .orderBy(desc(lockerLogs.id));
  } catch (error) {
    console.error('Database query failed in listDbLockerLogs:', error);
    throw new Error('Failed to load smart locker logs.', { cause: error });
  }
}

export async function createDbLockerLog(
  userId: number,
  input: { studentId: number; action: LockerAction; itemName: string; note?: string }
) {
  try {
    const [stu] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, input.studentId), eq(students.userId, userId)));
    if (!stu) return null;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const [created] = await db
      .insert(lockerLogs)
      .values({
        userId,
        studentId: stu.id,
        lockerId: stu.lockerId,
        timestamp,
        action: input.action,
        itemName: input.itemName,
        note: input.note || 'Smart Locker RFID Scan',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in createDbLockerLog:', error);
    throw new Error('Failed to record smart locker log.', { cause: error });
  }
}

export async function listDbAttendance(userId: number, studentId: number) {
  try {
    return await db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.userId, userId), eq(attendanceRecords.studentId, studentId)));
  } catch (error) {
    console.error('Database query failed in listDbAttendance:', error);
    throw new Error('Failed to load attendance records.', { cause: error });
  }
}
