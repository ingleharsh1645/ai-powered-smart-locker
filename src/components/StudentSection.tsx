import { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Image as ImageIcon,
  Lock,
  Maximize2,
  MessageCircle,
  Radio,
  RefreshCw,
  Trophy,
  User,
  Volume2,
} from 'lucide-react';
import { SubjectMarksBarChart, SyllabusDoughnutChart } from './SchoolCharts';
import { LottieRobot } from './LottieRobot';
import { speakWithGeminiTTS } from '../utils/ttsPlayer';
import type {
  GradeLevel,
  HomeworkItem,
  Paripath,
  Student,
  SubjectMark,
  TimetableEntry,
} from '../types/school';

const CAMPUS_HERO_IMG = '/src/assets/images/hero_smart_locker_campus_1795534191605.jpg';
const PARIPATH_IMG = '/src/assets/images/paripath_morning_assembly_1795534192112.jpg';

const POSTER_SUGGESTIONS = [
  'Labeled plant cell showing chloroplast and cell wall for 6th grade science',
  'Solar system planets orbiting the sun in clear textbook diagram style',
  'Fractions pie chart visual guide showing halves, quarters, and eighths',
];

export function StudentSection({
  students,
  activeStudent,
  activeGrade,
  onSelectStudent,
  onSelectGrade,
  timetable,
  homework,
  paripath,
  marks,
  onAskRobot,
  onOpen3DStudio,
  onAutoGenerateParipath,
  paripathRefreshing,
}: {
  students: Student[];
  activeStudent: Student | undefined;
  activeGrade: GradeLevel;
  onSelectStudent: (studentId: string) => void;
  onSelectGrade: (grade: GradeLevel) => void;
  timetable: TimetableEntry[];
  homework: HomeworkItem[];
  paripath: Paripath | null;
  marks: SubjectMark[];
  onAskRobot: (question: string) => void;
  onOpen3DStudio: () => void;
  onAutoGenerateParipath: () => Promise<void>;
  paripathRefreshing: boolean;
}) {
  const [gkRevealed, setGkRevealed] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [paripathImgFailed, setParipathImgFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Study Poster Studio (gemini-3-pro-image-preview with 1K / 2K / 4K selector)
  const [posterPrompt, setPosterPrompt] = useState(POSTER_SUGGESTIONS[0]);
  const [posterSize, setPosterSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [posterRatio, setPosterRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);

  const classTimetable = timetable.filter((t) => t.grade === activeGrade);
  const classHomework = homework.filter((h) => h.grade === activeGrade);
  const sortedMarks = [...marks].sort((a, b) => a.marks - b.marks);
  const weakestSubject = sortedMarks[0];
  const needsHelp = weakestSubject && weakestSubject.marks < 70;

  const avgScore =
    marks.length > 0 ? Math.round(marks.reduce((sum, m) => sum + m.marks, 0) / marks.length) : 0;

  const xpGoal = 2000;
  const xpPercent = activeStudent ? Math.min(100, Math.round((activeStudent.xpPoints / xpGoal) * 100)) : 50;

  const handleListenParipath = () => {
    if (!paripath) return;
    setTtsNotice(null);
    const script = `Good morning! Here is today's Aaj Ka Paripath. Suvichar: ${paripath.suvichar}. Din Vishesh: ${paripath.dinVishesh}. Today's News: ${paripath.aajKiNews}. GK Question: ${paripath.gkQuestion}`;
    void speakWithGeminiTTS(script, {
      style: 'Cheerful morning school assembly announcer speaking clearly',
      onError: (msg) => setTtsNotice(msg),
    });
  };

  const handleGeneratePoster = async () => {
    if (!posterPrompt.trim() || posterLoading) return;
    setPosterLoading(true);
    setPosterError(null);

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: posterPrompt,
          imageSize: posterSize,
          aspectRatio: posterRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Could not generate study poster.');
      }
      setPosterUrl(data.imageUrl);
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : 'Poster generation failed.');
    } finally {
      setPosterLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Sub-toolbar: Grade & Student Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Class View
          </span>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(['6th', '7th'] as GradeLevel[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onSelectGrade(g)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeGrade === g
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Class {g} Grade
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="student-select-bar" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Active Student
          </label>
          <select
            id="student-select-bar"
            value={activeStudent?.id || ''}
            onChange={(e) => {
              setAvatarFailed(false);
              onSelectStudent(e.target.value);
            }}
            className="text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (Class {s.grade} · Locker {s.lockerId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Split Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-blue-50 border border-slate-200 shrink-0 flex items-center justify-center">
              {activeStudent?.avatarUrl && !avatarFailed ? (
                <img
                  src={activeStudent.avatarUrl}
                  alt={activeStudent.name}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-blue-700" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                Smart Locker Companion · Class {activeStudent?.grade ?? activeGrade} {activeStudent?.section ?? 'A'}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5 text-balance">
                Welcome back, {activeStudent?.name ?? 'Student'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
                <span>Roll #{activeStudent?.rollNo ?? '--'}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                  <Lock className="w-3.5 h-3.5 text-blue-700" />
                  Locker {activeStudent?.lockerId ?? '--'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Avg Score {avgScore}%</span>
              </div>
            </div>
          </div>

          {/* Kid-friendly XP & Streak Progress */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-slate-800">
                <Trophy className="w-4 h-4 text-amber-600" />
                Explorer Level Progress
              </span>
              <span className="font-mono text-blue-700 tabular-nums">
                {activeStudent?.xpPoints ?? 0} / {xpGoal} XP
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-700 rounded-full transition-all duration-300"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                <Flame className="w-3.5 h-3.5" />
                {activeStudent?.streakDays ?? 1}-Day Learning Streak
              </span>
              <span>Keep unlocking chapters to earn badges</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[240px]">
          {!heroImgFailed ? (
            <img
              src={CAMPUS_HERO_IMG}
              alt="Sunlit school hallway with cobalt and marigold smart lockers"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full lg:h-full object-cover max-h-[320px] lg:max-h-none"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 via-slate-50 to-amber-50 flex flex-col items-center justify-center p-8 text-center">
              <Lock className="w-10 h-10 text-blue-700 mb-2" />
              <p className="font-display font-semibold text-slate-800">LockerBuddy Smart Hallway</p>
            </div>
          )}
        </div>
      </section>

      {/* Siri-Style Talking AI Robot Companion Card (Student Section) */}
      <section className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <LottieRobot size={50} active />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Siri-Style AI Study Robot · Always Ready
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold mt-0.5">
              Talk to LockerBot About Homework, Science, or Your Schedule
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Ask any school question by voice or open the interactive 3D Live Robot Studio for real-time voice answers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              onAskRobot(
                `Hi LockerBot! Please explain today's homework and help me plan my study for Class ${activeGrade}.`
              )
            }
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 text-sky-400" />
            Ask Study Question
          </button>
          <button
            type="button"
            onClick={onOpen3DStudio}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Maximize2 className="w-4 h-4" />
            Launch 3D Voice Robot
          </button>
        </div>
      </section>

      {/* Weak Subject Alert */}
      {weakestSubject && (
        <section
          aria-label="Weak subject learning alert"
          className={`rounded-2xl border p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            needsHelp
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-emerald-50/60 border-emerald-200'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                needsHelp ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {needsHelp ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className={needsHelp ? 'text-amber-900' : 'text-emerald-900'}>
                  {needsHelp ? 'Needs Extra Practice' : 'Strong Progress'}
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {weakestSubject.subject}: {weakestSubject.marks}/{weakestSubject.maxMarks}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
                {needsHelp
                  ? `Let's boost your ${weakestSubject.subject} score together!`
                  : `Great job! Your lowest score is still ${weakestSubject.marks}% in ${weakestSubject.subject}.`}
              </h2>
              <p className="text-sm text-slate-700 mt-1">
                {needsHelp
                  ? `Friendly tip: Spend 15 minutes reviewing today's ${weakestSubject.subject} notes and ask LockerBot for 3 quick practice questions.`
                  : 'Keep up the steady revision rhythm and challenge yourself with bonus quiz puzzles.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() =>
                void speakWithGeminiTTS(
                  `Friendly study tip for ${weakestSubject.subject}: Spend 15 minutes reviewing key ideas and try 3 short practice questions today!`,
                  { onError: (m) => setTtsNotice(m) }
                )
              }
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Volume2 className="w-4 h-4 text-blue-700" />
              Listen to Tip
            </button>
            <button
              type="button"
              onClick={() =>
                onAskRobot(
                  `Can you give me 3 fun practice tips and a mini quiz for ${weakestSubject.subject} (${activeGrade} grade)? My current score is ${weakestSubject.marks}/100.`
                )
              }
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              Ask LockerBot for Help
            </button>
          </div>
        </section>
      )}

      {/* Teacher-Assigned Homework Board */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Today&apos;s Teacher-Assigned Homework
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Posted by teachers for Class {activeGrade} · Tap any task to have the Siri AI Robot explain it step-by-step
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-slate-600 tabular-nums">
            {classHomework.length} Active Tasks
          </span>
        </div>

        {classHomework.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No homework assigned for Class {activeGrade} right now. Teachers can post new homework from the Teacher Section.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classHomework.map((hw) => (
              <article
                key={hw.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="text-blue-700">{hw.subject}</span>
                    <span className="inline-flex items-center gap-1 font-mono text-slate-600 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {hw.dueDate}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                    {hw.title}
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{hw.description}</p>
                  <p className="text-[11px] text-slate-500">Assigned by {hw.teacherName}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      void speakWithGeminiTTS(
                        `${hw.subject} homework assigned by ${hw.teacherName}: ${hw.title}. ${hw.description}. Due ${hw.dueDate}.`,
                        { onError: (m) => setTtsNotice(m) }
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center gap-1 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-blue-700" />
                    Listen
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onAskRobot(
                        `Please help me understand and solve my ${hw.subject} homework: "${hw.title}" — ${hw.description}`
                      )
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    Ask AI Robot to Explain
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Daily Timetable & Live Tracker */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Today&apos;s Timetable &amp; Live Tracker
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Class {activeGrade} live schedule synced automatically from Teacher Smart Drive
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-600 tabular-nums">
            {classTimetable.length} Periods Scheduled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-5 whitespace-nowrap">Time</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Subject</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Teacher</th>
                <th className="py-3.5 px-5">Today&apos;s Topic</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Syllabus</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {classTimetable.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-6 text-center text-slate-500">
                    No timetable entries found for Class {activeGrade}. Teachers can add periods in the Teacher Section.
                  </td>
                </tr>
              ) : (
                classTimetable.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                      {row.timeSlot}
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-900 whitespace-nowrap">
                      {row.subject}
                    </td>
                    <td className="py-4 px-5 text-slate-700 whitespace-nowrap">{row.teacherName}</td>
                    <td className="py-4 px-5 text-slate-700 min-w-[220px]">{row.todaysTopic}</td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 rounded-full"
                            style={{ width: `${row.syllabusPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-medium text-slate-700 tabular-nums">
                          {row.syllabusPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      {row.status === 'Live Now' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                          <Radio className="w-3.5 h-3.5" />
                          Live Now
                        </span>
                      )}
                      {row.status === 'Completed' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      )}
                      {row.status === 'Up Next' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Clock className="w-3.5 h-3.5" />
                          Up Next
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Graphical Visualizations (Chart.js) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Subject-Wise Test Marks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scores below 65% are highlighted in coral for quick revision focus
            </p>
          </div>
          {marks.length > 0 ? (
            <SubjectMarksBarChart marks={marks} />
          ) : (
            <p className="text-sm text-slate-500 py-12 text-center">No marks recorded yet.</p>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Syllabus Covered vs. Remaining
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Average completion across Class {activeGrade} subjects
            </p>
          </div>
          <SyllabusDoughnutChart timetable={classTimetable} />
        </div>
      </section>

      {/* Aaj Ka Paripath (AI-Automated Morning Assembly Board) */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-4 bg-amber-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
            <div className="h-56 lg:h-64 overflow-hidden">
              {!paripathImgFailed ? (
                <img
                  src={PARIPATH_IMG}
                  alt="School morning assembly courtyard with chalkboard"
                  referrerPolicy="no-referrer"
                  onError={() => setParipathImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-amber-700" />
                </div>
              )}
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs font-mono text-amber-900 tabular-nums">
                AI-Automated Paripath · {paripath?.date ?? 'Today'}
              </p>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Aaj Ka Paripath
              </h2>
              <p className="text-sm text-slate-700">
                Automatically curated daily thought, special day, news bulletin, and GK challenge.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleListenParipath}
                  className="w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  Listen to Paripath
                </button>
                <button
                  type="button"
                  disabled={paripathRefreshing}
                  onClick={() => void onAutoGenerateParipath()}
                  className="w-full px-4 py-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100/60 disabled:opacity-50 text-amber-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${paripathRefreshing ? 'animate-spin' : ''}`} />
                  {paripathRefreshing ? 'Generating Fresh Paripath...' : 'Auto-Refresh Today’s Paripath (AI)'}
                </button>
              </div>
              {ttsNotice && <p className="text-xs text-amber-900">{ttsNotice}</p>}
            </div>
          </div>

          <div className="lg:col-span-8 p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Suvichar (Thought of the Day)
              </h3>
              <p className="text-base font-medium text-slate-900 leading-relaxed">
                &ldquo;{paripath?.suvichar}&rdquo;
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Din Vishesh (Special Day)
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">
                {paripath?.dinVishesh}
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Aaj Ki News (Today&apos;s News)
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">
                {paripath?.aajKiNews}
              </p>
            </div>

            <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Daily GK Challenge
                </h3>
                <button
                  type="button"
                  onClick={() => setGkRevealed((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors"
                >
                  {gkRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {gkRevealed ? 'Hide Answer' : 'Reveal Answer'}
                </button>
              </div>
              <p className="text-sm font-semibold text-slate-900">{paripath?.gkQuestion}</p>
              {gkRevealed && (
                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Answer: {paripath?.gkAnswer}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Study Poster Studio (gemini-3-pro-image-preview with 1K / 2K / 4K selector) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Visual Study Poster Studio
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Create custom science diagrams or topic posters in 1K, 2K, or 4K resolution using Gemini 3 Pro Image
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label htmlFor="poster-prompt" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Study Topic Prompt
              </label>
              <textarea
                id="poster-prompt"
                rows={3}
                value={posterPrompt}
                onChange={(e) => setPosterPrompt(e.target.value)}
                placeholder="Describe a science diagram or math poster..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {POSTER_SUGGESTIONS.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPosterPrompt(item)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition-colors text-left"
                >
                  Idea {i + 1}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Image Size
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                  {(['1K', '2K', '4K'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPosterSize(sz)}
                      className={`py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                        posterSize === sz
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="poster-ratio" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Aspect Ratio
                </label>
                <select
                  id="poster-ratio"
                  value={posterRatio}
                  onChange={(e) => setPosterRatio(e.target.value as '16:9' | '4:3' | '1:1')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="16:9">16:9 Landscape</option>
                  <option value="4:3">4:3 Textbook</option>
                  <option value="1:1">1:1 Square</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={posterLoading || !posterPrompt.trim()}
              onClick={() => void handleGeneratePoster()}
              className="w-full px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              {posterLoading ? `Generating ${posterSize} Poster...` : `Generate ${posterSize} Study Poster`}
            </button>

            {posterError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {posterError}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl min-h-[240px] flex items-center justify-center overflow-hidden p-3">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt="Generated educational study poster"
                referrerPolicy="no-referrer"
                className="w-full max-h-[380px] object-contain rounded-xl"
              />
            ) : (
              <div className="text-center p-8 max-w-sm">
                <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  Your generated {posterSize} study diagram will appear here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Choose 1K, 2K, or 4K resolution and describe any school concept to visualize.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
