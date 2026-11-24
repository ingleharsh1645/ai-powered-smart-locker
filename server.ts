import 'dotenv/config';
import http from 'http';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality, ThinkingLevel, Type, type Content, type LiveServerMessage } from '@google/genai';
import { schoolStore } from './server/schoolStore.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  createDbHomework,
  createDbLockerLog,
  createDbStudent,
  createDbTimetableEntry,
  deleteDbHomework,
  deleteDbTimetableEntry,
  ensureUserSeedData,
  getDbParipath,
  getOrCreateUser,
  listDbAttendance,
  listDbHomework,
  listDbLockerLogs,
  listDbMarks,
  listDbStudents,
  listDbTimetable,
  saveDbParipath,
  syncDbTimetableBulk,
  upsertDbMark,
} from './src/db/schoolQueries.ts';
import type { GradeLevel, LockerAction, TimetableStatus } from './src/types/school.ts';

const PORT = 3000;

const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-carbon',
  'gemini-4-neon',
]);

const ALLOWED_IMAGE_SIZES = new Set(['1K', '2K', '4K']);
const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);

function getGenAIClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in the environment Secrets panel.');
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientDemandError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('deadline') ||
    lower.includes('timed out') ||
    lower.includes('fetch failed') ||
    lower.includes('econnreset')
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Gemini request timed out (503 unavailable)')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseGeminiError(err: unknown): { status: number; message: string; needsPaidKey: boolean } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      message: 'API access denied or key invalid. Please check or select a valid key in Settings > Secrets.',
      needsPaidKey: true,
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota') || lower.includes('billing')) {
    return {
      status: 429,
      message:
        'Too many requests in a few seconds or paid-model quota reached. Please wait 10 seconds and try again, or add your own Gemini API key in Settings > Secrets for higher limits.',
      needsPaidKey: true,
    };
  }
  if (isTransientDemandError(err)) {
    return {
      status: 503,
      message: 'The AI model is temporarily busy. Please try again or switch to Fast Buddy (gemini-3.1-flash-lite).',
      needsPaidKey: false,
    };
  }
  return {
    status: 500,
    message: rawMessage || 'Gemini AI request failed.',
    needsPaidKey: false,
  };
}

function buildSchoolContextPrompt(studentId?: string, grade?: GradeLevel): string {
  const students = schoolStore.getStudents();
  const targetStudent = studentId
    ? students.find((s) => s.id === studentId) ?? students[0]
    : students[0];
  const targetGrade: GradeLevel = grade || targetStudent?.grade || '6th';

  const timetable = schoolStore.getTimetable(targetGrade);
  const homework = schoolStore.getHomework(targetGrade);
  const paripath = schoolStore.getParipath();
  const marks = targetStudent ? schoolStore.getMarks(targetStudent.id) : [];
  const lockerLogs = targetStudent ? schoolStore.getLockerLogs(targetStudent.id) : [];
  const attendance = targetStudent ? schoolStore.getAttendance(targetStudent.id) : [];

  const weakest = [...marks].sort((a, b) => a.marks - b.marks)[0];
  const avgAttendance =
    attendance.length > 0
      ? Math.round(attendance.reduce((sum, r) => sum + r.percentage, 0) / attendance.length)
      : 0;

  return `
You are LockerBot, a warm, cheerful, Siri-style 3D AI School Robot Assistant built for 6th and 7th grade students, their teachers, and their parents.
Always speak in clear, encouraging, kid-friendly English. Keep spoken responses concise, accurate, and easy to follow.
Never invent fake timetable periods, homework, marks, or locker events—always ground your answers in the live school data below.

CURRENT LIVE SCHOOL DATA:
- Active Student: ${targetStudent ? `${targetStudent.name} (Roll No: ${targetStudent.rollNo}, Class ${targetStudent.grade} ${targetStudent.section}, Smart Locker ID: ${targetStudent.lockerId}, XP: ${targetStudent.xpPoints}, Streak: ${targetStudent.streakDays} days)` : 'None'}
- Class ${targetGrade} Timetable Today:
${timetable.map((t) => `  • ${t.timeSlot}: ${t.subject} with ${t.teacherName} — Topic: "${t.todaysTopic}" (Syllabus: ${t.syllabusPercent}%, Status: ${t.status})`).join('\n')}

- Class ${targetGrade} Teacher-Assigned Homework:
${homework.map((h) => `  • [${h.subject}] ${h.title}: ${h.description} (Due: ${h.dueDate}, by ${h.teacherName})`).join('\n')}

- Aaj Ka Paripath (Morning Assembly Board for ${paripath.date}):
  • Suvichar: "${paripath.suvichar}"
  • Din Vishesh: "${paripath.dinVishesh}"
  • Aaj Ki News: "${paripath.aajKiNews}"
  • GK Question: "${paripath.gkQuestion}" | Answer: "${paripath.gkAnswer}"

- Active Student Subject Marks:
${marks.map((m) => `  • ${m.subject}: ${m.marks}/${m.maxMarks} (${m.examName})`).join('\n')}
- Weakest Subject Analysis: ${weakest ? `${weakest.subject} (${weakest.marks}/100)` : 'N/A'}

- Smart Locker Recent Activity (${targetStudent?.lockerId || 'N/A'}):
${lockerLogs.slice(0, 8).map((l) => `  • ${l.timestamp}: ${l.action === 'TOOK_OUT' ? 'Took Out' : 'Placed Inside'} "${l.itemName}" (${l.note || ''})`).join('\n')}

- Attendance Summary: Average ${avgAttendance}% across ${attendance.map((a) => `${a.month}: ${a.percentage}%`).join(', ')}
`.trim();
}

async function resolveAuthenticatedDbUser(req: AuthRequest) {
  if (!req.user?.uid) {
    throw new Error('Missing authenticated user ID.');
  }
  const dbUser = await getOrCreateUser(req.user.uid, req.user.email || `${req.user.uid}@school.local`);
  await ensureUserSeedData(dbUser.id);
  return dbUser;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const server = http.createServer(app);

  // WebSocket Server for Real-Time Voice Conversations via Gemini 3.8 Live API
  const wss = new WebSocketServer({ server, path: '/live' });
  wss.on('connection', async (clientWs, req) => {
    let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    try {
      const url = new URL(req.url || '/live', `http://${req.headers.host || 'localhost'}`);
      const studentId = url.searchParams.get('studentId') || undefined;
      const gradeParam = url.searchParams.get('grade');
      const grade: GradeLevel | undefined = gradeParam === '6th' || gradeParam === '7th' ? gradeParam : undefined;

      const ai = getGenAIClient('v1beta');
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: buildSchoolContextPrompt(studentId, grade),
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== clientWs.OPEN) return;
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onerror: (err: unknown) => {
            const errObj = err as { message?: string; error?: { message?: string }; reason?: string };
            const detail =
              (err instanceof Error ? err.message : undefined) ||
              errObj?.message ||
              errObj?.error?.message ||
              errObj?.reason ||
              'Live voice session encountered an error.';
            console.error('[Live API Error]', detail);
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ error: detail }));
            }
          },
          onclose: (ev: { code?: number; reason?: string }) => {
            if (ev?.reason) {
              console.warn('[Live API Closed]', ev.code, ev.reason);
              if (clientWs.readyState === clientWs.OPEN) {
                clientWs.send(JSON.stringify({ error: `Live voice closed: ${ev.reason}` }));
              }
            }
          },
        },
      });

      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ ready: true }));
      }
    } catch (err) {
      const parsed = parseGeminiError(err);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ error: parsed.message }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      try {
        if (!session) return;
        const payload = JSON.parse(raw.toString()) as { audio?: string; text?: string };
        if (payload.audio) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (payload.text) {
          session.sendRealtimeInput({ text: payload.text });
        }
      } catch {
        // Ignore malformed frame
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch {
        // Ignore close error
      }
    });
  });

  // Health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'LockerBuddy School Assistant API' });
  });

  // =========================================================================
  // AUTHENTICATED CLOUD SQL POSTGRESQL ENDPOINTS (/api/db/*)
  // Secured by Firebase Auth Bearer Token verification
  // =========================================================================
  app.get('/api/db/bootstrap', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const [studentsList, timetableList, homeworkList, paripathRow] = await Promise.all([
        listDbStudents(dbUser.id),
        listDbTimetable(dbUser.id),
        listDbHomework(dbUser.id),
        getDbParipath(dbUser.id),
      ]);
      res.json({
        user: { uid: dbUser.uid, email: dbUser.email },
        students: studentsList.map((s) => ({ ...s, id: String(s.id) })),
        timetable: timetableList.map((t) => ({ ...t, id: String(t.id) })),
        homework: homeworkList.map((h) => ({ ...h, id: String(h.id) })),
        paripath: paripathRow ? { ...paripathRow, id: String(paripathRow.id) } : null,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Cloud SQL bootstrap failed.' });
    }
  });

  app.get('/api/db/student-details', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const studentId = Number(req.query.studentId);
      if (!Number.isInteger(studentId) || studentId <= 0) {
        res.status(400).json({ error: 'Valid numeric studentId is required.' });
        return;
      }
      const [marksList, logsList, attList] = await Promise.all([
        listDbMarks(dbUser.id, studentId),
        listDbLockerLogs(dbUser.id, studentId),
        listDbAttendance(dbUser.id, studentId),
      ]);
      res.json({
        marks: marksList.map((m) => ({
          id: String(m.id),
          studentId: String(m.studentId),
          subject: m.subject,
          marks: m.marks,
          maxMarks: m.maxMarks,
          examName: m.examName,
          termHistory: { unit1: m.unit1, midTerm: m.midTerm, latest: m.latest },
        })),
        lockerLogs: logsList.map((l) => ({
          id: String(l.id),
          studentId: String(l.studentId),
          lockerId: l.lockerId,
          timestamp: l.timestamp,
          action: l.action,
          itemName: l.itemName,
          note: l.note ?? undefined,
        })),
        attendance: attList.map((a) => ({
          id: String(a.id),
          studentId: String(a.studentId),
          month: a.month,
          percentage: a.percentage,
          daysPresent: a.daysPresent,
          totalDays: a.totalDays,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load student details.' });
    }
  });

  app.post('/api/db/students', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const { name, rollNo, grade, section, lockerId } = req.body ?? {};
      if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof rollNo !== 'string' ||
        !rollNo.trim() ||
        (grade !== '6th' && grade !== '7th') ||
        typeof lockerId !== 'string' ||
        !lockerId.trim()
      ) {
        res.status(400).json({ error: 'Name, roll number, grade (6th/7th), and locker ID are required.' });
        return;
      }
      const created = await createDbStudent(dbUser.id, {
        name: name.trim().slice(0, 80),
        rollNo: rollNo.trim().slice(0, 20),
        grade,
        section: typeof section === 'string' && section.trim() ? section.trim().slice(0, 5).toUpperCase() : 'A',
        lockerId: lockerId.trim().slice(0, 20).toUpperCase(),
      });
      res.status(201).json({ ...created, id: String(created.id) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to register student.' });
    }
  });

  app.post('/api/db/timetable', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const { grade, timeSlot, subject, teacherName, todaysTopic, syllabusPercent, status } = req.body ?? {};
      if (
        (grade !== '6th' && grade !== '7th') ||
        typeof timeSlot !== 'string' ||
        !timeSlot.trim() ||
        typeof subject !== 'string' ||
        !subject.trim() ||
        typeof teacherName !== 'string' ||
        !teacherName.trim() ||
        typeof todaysTopic !== 'string' ||
        !todaysTopic.trim()
      ) {
        res.status(400).json({ error: 'Class, time slot, subject, teacher name, and topic are required.' });
        return;
      }
      const created = await createDbTimetableEntry(dbUser.id, {
        grade,
        timeSlot: timeSlot.trim().slice(0, 40),
        subject: subject.trim().slice(0, 60),
        teacherName: teacherName.trim().slice(0, 60),
        todaysTopic: todaysTopic.trim().slice(0, 140),
        syllabusPercent: Math.max(0, Math.min(100, Number(syllabusPercent) || 0)),
        status: status === 'Completed' || status === 'Live Now' || status === 'Up Next' ? status : 'Up Next',
      });
      res.status(201).json({ ...created, id: String(created.id) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add timetable slot.' });
    }
  });

  app.delete('/api/db/timetable/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid timetable ID.' });
        return;
      }
      const deleted = await deleteDbTimetableEntry(dbUser.id, id);
      res.json({ deleted });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete timetable slot.' });
    }
  });

  app.post('/api/db/timetable/bulk', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const { grade, entries } = req.body ?? {};
      if ((grade !== '6th' && grade !== '7th') || !Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ error: 'Valid grade and entries array are required.' });
        return;
      }
      const sanitized = entries.slice(0, 12).map((item) => ({
        timeSlot: String(item.timeSlot || '09:00 AM - 09:45 AM').slice(0, 40),
        subject: String(item.subject || 'General Study').slice(0, 60),
        teacherName: String(item.teacherName || 'Class Teacher').slice(0, 60),
        todaysTopic: String(item.todaysTopic || 'Chapter Revision').slice(0, 140),
        syllabusPercent: Math.max(0, Math.min(100, Number(item.syllabusPercent) || 50)),
        status: (item.status === 'Completed' || item.status === 'Live Now' || item.status === 'Up Next'
          ? item.status
          : 'Up Next') as TimetableStatus,
      }));
      const synced = await syncDbTimetableBulk(dbUser.id, grade, sanitized);
      res.json(synced.map((t) => ({ ...t, id: String(t.id) })));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to sync bulk timetable.' });
    }
  });

  app.post('/api/db/homework', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const { grade, subject, title, description, dueDate, teacherName } = req.body ?? {};
      if (
        (grade !== '6th' && grade !== '7th') ||
        typeof subject !== 'string' ||
        !subject.trim() ||
        typeof title !== 'string' ||
        !title.trim() ||
        typeof description !== 'string' ||
        !description.trim()
      ) {
        res.status(400).json({ error: 'Class, subject, homework title, and instructions are required.' });
        return;
      }
      const created = await createDbHomework(dbUser.id, {
        grade,
        subject: subject.trim().slice(0, 60),
        title: title.trim().slice(0, 100),
        description: description.trim().slice(0, 350),
        dueDate: typeof dueDate === 'string' && dueDate.trim() ? dueDate.trim().slice(0, 40) : 'Tomorrow',
        teacherName: typeof teacherName === 'string' && teacherName.trim() ? teacherName.trim().slice(0, 60) : 'Class Teacher',
      });
      res.status(201).json({ ...created, id: String(created.id) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create homework.' });
    }
  });

  app.delete('/api/db/homework/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid homework ID.' });
        return;
      }
      const deleted = await deleteDbHomework(dbUser.id, id);
      res.json({ deleted });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete homework.' });
    }
  });

  app.post('/api/db/marks', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const { studentId, subject, marks, examName } = req.body ?? {};
      const numId = Number(studentId);
      if (!Number.isInteger(numId) || numId <= 0 || typeof subject !== 'string' || !subject.trim() || typeof marks !== 'number') {
        res.status(400).json({ error: 'Valid studentId, subject, and marks are required.' });
        return;
      }
      const updated = await upsertDbMark(dbUser.id, {
        studentId: numId,
        subject: subject.trim().slice(0, 60),
        marks: Math.max(0, Math.min(100, Math.round(marks))),
        examName: typeof examName === 'string' && examName.trim() ? examName.trim().slice(0, 60) : 'Unit Assessment',
      });
      res.status(201).json({ ...updated, id: String(updated.id), studentId: String(updated.studentId) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save marks.' });
    }
  });

  app.post('/api/db/locker-logs', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await resolveAuthenticatedDbUser(req);
      const { studentId, action, itemName, note } = req.body ?? {};
      const numId = Number(studentId);
      if (
        !Number.isInteger(numId) ||
        numId <= 0 ||
        (action !== 'TOOK_OUT' && action !== 'PLACED_INSIDE') ||
        typeof itemName !== 'string' ||
        !itemName.trim()
      ) {
        res.status(400).json({ error: 'Valid studentId, action, and itemName are required.' });
        return;
      }
      const log = await createDbLockerLog(dbUser.id, {
        studentId: numId,
        action,
        itemName: itemName.trim().slice(0, 100),
        note: typeof note === 'string' ? note.trim().slice(0, 120) : undefined,
      });
      if (!log) {
        res.status(404).json({ error: 'Student not found.' });
        return;
      }
      res.status(201).json({ ...log, id: String(log.id), studentId: String(log.studentId) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to log locker event.' });
    }
  });

  // =========================================================================
  // OPEN SCHOOL PREVIEW ENDPOINTS (Immediate non-gated preview before Sign-In)
  // =========================================================================
  app.get('/api/students', (_req: Request, res: Response) => {
    res.json(schoolStore.getStudents());
  });

  app.post('/api/students', (req: Request, res: Response) => {
    const { name, rollNo, grade, section, lockerId } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof rollNo !== 'string' ||
      !rollNo.trim() ||
      (grade !== '6th' && grade !== '7th') ||
      typeof lockerId !== 'string' ||
      !lockerId.trim()
    ) {
      res.status(400).json({ error: 'Name, roll number, grade (6th or 7th), and locker ID are required.' });
      return;
    }
    const student = schoolStore.addStudent({
      name: name.slice(0, 80),
      rollNo: rollNo.slice(0, 20),
      grade,
      section: typeof section === 'string' && section.trim() ? section.slice(0, 5) : 'A',
      lockerId: lockerId.slice(0, 20),
    });
    res.status(201).json(student);
  });

  app.get('/api/timetable', (req: Request, res: Response) => {
    const grade = req.query.grade;
    if (grade === '6th' || grade === '7th') {
      res.json(schoolStore.getTimetable(grade));
      return;
    }
    res.json(schoolStore.getTimetable());
  });

  app.post('/api/timetable', (req: Request, res: Response) => {
    const { grade, timeSlot, subject, teacherName, todaysTopic, syllabusPercent, status } = req.body ?? {};
    if (
      (grade !== '6th' && grade !== '7th') ||
      typeof timeSlot !== 'string' ||
      !timeSlot.trim() ||
      typeof subject !== 'string' ||
      !subject.trim() ||
      typeof teacherName !== 'string' ||
      !teacherName.trim() ||
      typeof todaysTopic !== 'string' ||
      !todaysTopic.trim()
    ) {
      res.status(400).json({ error: 'Class, time slot, subject, teacher name, and topic are required.' });
      return;
    }
    const pct = Math.max(0, Math.min(100, Number(syllabusPercent) || 0));
    const validStatus: TimetableStatus =
      status === 'Completed' || status === 'Live Now' || status === 'Up Next' ? status : 'Up Next';

    const created = schoolStore.addTimetableEntry({
      grade,
      timeSlot: timeSlot.trim().slice(0, 40),
      subject: subject.trim().slice(0, 60),
      teacherName: teacherName.trim().slice(0, 60),
      todaysTopic: todaysTopic.trim().slice(0, 140),
      syllabusPercent: pct,
      status: validStatus,
    });
    res.status(201).json(created);
  });

  app.delete('/api/timetable/:id', (req: Request, res: Response) => {
    const removed = schoolStore.deleteTimetableEntry(String(req.params.id));
    if (!removed) {
      res.status(404).json({ error: 'Timetable entry not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  app.post('/api/timetable/bulk', (req: Request, res: Response) => {
    const { grade, entries } = req.body ?? {};
    if ((grade !== '6th' && grade !== '7th') || !Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({ error: 'Valid grade (6th/7th) and non-empty entries array are required.' });
      return;
    }
    const sanitized = entries.slice(0, 12).map((item) => ({
      timeSlot: String(item.timeSlot || '09:00 AM - 09:45 AM').slice(0, 40),
      subject: String(item.subject || 'General Study').slice(0, 60),
      teacherName: String(item.teacherName || 'Class Teacher').slice(0, 60),
      todaysTopic: String(item.todaysTopic || 'Chapter Revision').slice(0, 140),
      syllabusPercent: Math.max(0, Math.min(100, Number(item.syllabusPercent) || 50)),
      status: (item.status === 'Completed' || item.status === 'Live Now' || item.status === 'Up Next'
        ? item.status
        : 'Up Next') as TimetableStatus,
    }));
    const synced = schoolStore.syncDriveTimetable(grade, sanitized);
    res.json(synced);
  });

  app.get('/api/homework', (req: Request, res: Response) => {
    const grade = req.query.grade;
    if (grade === '6th' || grade === '7th') {
      res.json(schoolStore.getHomework(grade));
      return;
    }
    res.json(schoolStore.getHomework());
  });

  app.post('/api/homework', (req: Request, res: Response) => {
    const { grade, subject, title, description, dueDate, teacherName } = req.body ?? {};
    if (
      (grade !== '6th' && grade !== '7th') ||
      typeof subject !== 'string' ||
      !subject.trim() ||
      typeof title !== 'string' ||
      !title.trim() ||
      typeof description !== 'string' ||
      !description.trim()
    ) {
      res.status(400).json({ error: 'Class, subject, title, and description are required.' });
      return;
    }
    const created = schoolStore.addHomework({
      grade,
      subject: subject.trim().slice(0, 60),
      title: title.trim().slice(0, 100),
      description: description.trim().slice(0, 350),
      dueDate: typeof dueDate === 'string' && dueDate.trim() ? dueDate.trim().slice(0, 40) : 'Tomorrow',
      teacherName: typeof teacherName === 'string' && teacherName.trim() ? teacherName.trim().slice(0, 60) : 'Class Teacher',
    });
    res.status(201).json(created);
  });

  app.delete('/api/homework/:id', (req: Request, res: Response) => {
    const removed = schoolStore.deleteHomework(String(req.params.id));
    if (!removed) {
      res.status(404).json({ error: 'Homework item not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  app.get('/api/paripath', (_req: Request, res: Response) => {
    res.json(schoolStore.getParipath());
  });

  app.get('/api/marks', (req: Request, res: Response) => {
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    res.json(schoolStore.getMarks(studentId));
  });

  app.post('/api/marks', (req: Request, res: Response) => {
    const { studentId, subject, marks, examName } = req.body ?? {};
    if (
      typeof studentId !== 'string' ||
      !studentId.trim() ||
      typeof subject !== 'string' ||
      !subject.trim() ||
      typeof marks !== 'number' ||
      Number.isNaN(marks)
    ) {
      res.status(400).json({ error: 'studentId, subject, and numeric marks are required.' });
      return;
    }
    const updated = schoolStore.upsertMark({
      studentId: studentId.trim(),
      subject: subject.trim().slice(0, 60),
      marks,
      examName: typeof examName === 'string' ? examName.slice(0, 60) : undefined,
    });
    res.status(201).json(updated);
  });

  app.get('/api/locker-logs', (req: Request, res: Response) => {
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    res.json(schoolStore.getLockerLogs(studentId));
  });

  app.post('/api/locker-logs', (req: Request, res: Response) => {
    const { studentId, action, itemName, note } = req.body ?? {};
    if (
      typeof studentId !== 'string' ||
      !studentId.trim() ||
      (action !== 'TOOK_OUT' && action !== 'PLACED_INSIDE') ||
      typeof itemName !== 'string' ||
      !itemName.trim()
    ) {
      res.status(400).json({ error: 'studentId, action (TOOK_OUT | PLACED_INSIDE), and itemName are required.' });
      return;
    }
    const log = schoolStore.addLockerLog({
      studentId: studentId.trim(),
      action: action as LockerAction,
      itemName: itemName.slice(0, 100),
      note: typeof note === 'string' ? note.slice(0, 120) : undefined,
    });
    if (!log) {
      res.status(404).json({ error: 'Student not found for smart locker log.' });
      return;
    }
    res.status(201).json(log);
  });

  app.get('/api/attendance', (req: Request, res: Response) => {
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    res.json(schoolStore.getAttendance(studentId));
  });

  // =========================================================================
  // AI AUTOMATION ENDPOINTS
  // =========================================================================

  // 1. AI-Automated Daily Paripath Generator (Suvichar, Din Vishesh, News, GK Q&A)
  app.post('/api/ai/auto-paripath', async (req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const ai = getGenAIClient('v1beta');
      const paripathPrompt = `Generate a fresh, inspiring, kid-friendly "Aaj Ka Paripath" (Indian school morning assembly board) for 6th & 7th grade students for date ${today}. Include:
1) suvichar: Thought of the day (1 inspiring sentence)
2) dinVishesh: Special day / science or cultural observance theme (1-2 sentences)
3) aajKiNews: Positive, educational science/space/technology/environment school news bulletin (1-2 sentences)
4) gkQuestion: An engaging middle-school general knowledge question
5) gkAnswer: Clear 1-sentence answer to the GK question.`;
      const paripathConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suvichar: { type: Type.STRING },
            dinVishesh: { type: Type.STRING },
            aajKiNews: { type: Type.STRING },
            gkQuestion: { type: Type.STRING },
            gkAnswer: { type: Type.STRING },
          },
          required: ['suvichar', 'dinVishesh', 'aajKiNews', 'gkQuestion', 'gkAnswer'],
        },
      };

      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: paripathPrompt,
            config: paripathConfig,
          }),
          12000
        );
      } catch (primaryErr) {
        if (isTransientDemandError(primaryErr)) {
          response = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: paripathPrompt,
              config: {
                ...paripathConfig,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            12000
          );
        } else {
          throw primaryErr;
        }
      }

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        suvichar: string;
        dinVishesh: string;
        aajKiNews: string;
        gkQuestion: string;
        gkAnswer: string;
      };

      const savedLocal = schoolStore.updateParipath({
        date: today,
        suvichar: parsed.suvichar,
        dinVishesh: parsed.dinVishesh,
        aajKiNews: parsed.aajKiNews,
        gkQuestion: parsed.gkQuestion,
        gkAnswer: parsed.gkAnswer,
        isAiGenerated: true,
      });

      // If caller sent an authenticated Firebase Bearer token, also persist to Cloud SQL PostgreSQL
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { adminAuth } = await import('./src/lib/firebase-admin.ts');
          const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
          const dbUser = await getOrCreateUser(decoded.uid, decoded.email || `${decoded.uid}@school.local`);
          const dbSaved = await saveDbParipath(dbUser.id, {
            date: today,
            suvichar: parsed.suvichar,
            dinVishesh: parsed.dinVishesh,
            aajKiNews: parsed.aajKiNews,
            gkQuestion: parsed.gkQuestion,
            gkAnswer: parsed.gkAnswer,
            isAiGenerated: true,
          });
          res.json({ ...dbSaved, id: String(dbSaved.id) });
          return;
        } catch {
          // Fall back to local response if token check fails
        }
      }

      res.json(savedLocal);
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message, needsPaidKey: parsed.needsPaidKey });
    }
  });

  // 2. Multi-Turn Gemini Chatbot (/api/ai/ask)
  app.post('/api/ai/ask', async (req: Request, res: Response) => {
    try {
      const { question, studentId, grade, model, history } = req.body ?? {};
      if (typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Question cannot be empty.' });
        return;
      }

      const selectedModel =
        typeof model === 'string' && ALLOWED_CHAT_MODELS.has(model) ? model : 'gemini-3.1-flash-lite';

      const validGrade: GradeLevel | undefined = grade === '6th' || grade === '7th' ? grade : undefined;
      const systemInstruction = buildSchoolContextPrompt(
        typeof studentId === 'string' ? studentId : undefined,
        validGrade
      );

      const formattedHistory: Content[] = Array.isArray(history)
        ? history
            .filter(
              (h): h is { role: 'user' | 'model'; text: string } =>
                h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string' && h.text.trim().length > 0
            )
            .slice(-16)
            .map((h) => ({
              role: h.role,
              parts: [{ text: h.text }],
            }))
        : [];
      while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
        formattedHistory.shift();
      }

      const ai = getGenAIClient('v1beta');
      const runChatTurn = async (targetModel: string) => {
        const config: {
          systemInstruction: string;
          thinkingConfig?: { thinkingLevel: ThinkingLevel };
        } = { systemInstruction };
        if (targetModel === 'gemini-4-hydrogen') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }
        const chat = ai.chats.create({
          model: targetModel,
          history: formattedHistory,
          config,
        });
        return chat.sendMessage({ message: question.trim().slice(0, 1500) });
      };

      const candidateModels =
        selectedModel === 'gemini-3.1-flash-lite'
          ? ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']
          : selectedModel === 'gemini-4-hydrogen'
          ? ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']
          : [selectedModel];

      let modelUsed = candidateModels[0];
      let response;
      let lastError: unknown;

      for (const candidate of candidateModels) {
        try {
          modelUsed = candidate;
          response = await withTimeout(runChatTurn(candidate), 12000);
          break;
        } catch (err) {
          lastError = err;
          console.error(`[Gemini /api/ai/ask ${candidate}]`, err instanceof Error ? err.message : err);
          if (!isTransientDemandError(err)) {
            throw err;
          }
        }
      }

      if (!response) {
        throw lastError ?? new Error('No response from Gemini AI.');
      }

      const answer = response.text || 'I checked the school board, but could not form a reply just now.';

      res.json({
        answer,
        modelUsed,
      });
    } catch (err) {
      console.error('[Gemini /api/ai/ask final error]', err instanceof Error ? err.message : err);
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({
        error: parsed.message,
        needsPaidKey: parsed.needsPaidKey,
      });
    }
  });

  // 3. Audio Transcription using gemini-3.5-transcribe (with multimodal flash-lite fallback)
  app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType } = req.body ?? {};
      if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
        res.status(400).json({ error: 'Recorded audio data is required for transcription.' });
        return;
      }

      const normalizedMime =
        typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : 'audio/webm';
      const safeMime = normalizedMime.startsWith('audio/') ? normalizedMime : 'audio/webm';

      const ai = getGenAIClient('v1beta');
      const transcribeContents = {
        parts: [
          {
            inlineData: {
              mimeType: safeMime,
              data: audioBase64,
            },
          },
          {
            text: 'Transcribe the spoken school question or voice note accurately in clean text. Return only the spoken words.',
          },
        ],
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: transcribeContents,
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: transcribeContents,
        });
      }

      res.json({
        transcript: (response.text || '').trim(),
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message, needsPaidKey: parsed.needsPaidKey });
    }
  });

  // 4. Gemini TTS endpoint using gemini-3.8-flash-lite-tts (v1beta)
  app.post('/api/ai/tts', async (req: Request, res: Response) => {
    try {
      const { text, style, voiceName } = req.body ?? {};
      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text for speech synthesis is required.' });
        return;
      }

      const ai = getGenAIClient('v1beta');
      const safeVoice =
        typeof voiceName === 'string' && ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName)
          ? voiceName
          : 'Kore';
      const safeStyle =
        typeof style === 'string' && style.trim()
          ? style.trim().slice(0, 120)
          : 'Warm, cheerful, friendly school robot assistant speaking clearly to a 6th grader';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim().slice(0, 1000),
                speechMetadata: {
                  style: safeStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!audioPart?.inlineData?.data) {
        res.status(502).json({ error: 'No audio data returned from TTS model.' });
        return;
      }

      res.json({
        audioBase64: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType || 'audio/wav',
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({
        error: parsed.message,
        needsPaidKey: parsed.needsPaidKey,
      });
    }
  });

  // 5. Study Poster Generation using gemini-3-pro-image
  app.post('/api/ai/generate-image', async (req: Request, res: Response) => {
    try {
      const { prompt, imageSize, aspectRatio } = req.body ?? {};
      if (typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Study poster prompt is required.' });
        return;
      }

      const safeSize = typeof imageSize === 'string' && ALLOWED_IMAGE_SIZES.has(imageSize) ? imageSize : '1K';
      const safeRatio =
        typeof aspectRatio === 'string' && ALLOWED_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : '16:9';

      const ai = getGenAIClient('v1beta');
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image',
        contents: {
          parts: [
            {
              text: `Educational middle-school visual study poster illustration for 6th/7th grade students: ${prompt.trim().slice(0, 500)}. Clean crisp textbook diagram aesthetic, high contrast, vibrant balanced colors.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: safeRatio,
            imageSize: safeSize,
          },
        },
      });

      let imageUrl = '';
      let caption = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({ error: 'The image model did not return an image. Try refining your prompt.' });
        return;
      }

      res.json({
        imageUrl,
        caption,
        imageSize: safeSize,
        aspectRatio: safeRatio,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({
        error: parsed.message,
        needsPaidKey: parsed.needsPaidKey,
      });
    }
  });

  // Vite / Static asset serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LockerBuddy Smart School Assistant server running on http://localhost:${PORT}`);
  });
}

startServer();
