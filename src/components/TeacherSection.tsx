import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardPlus,
  CloudUpload,
  FileSpreadsheet,
  Maximize2,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { LottieRobot } from './LottieRobot';
import type {
  GradeLevel,
  HomeworkItem,
  Paripath,
  Student,
  TimetableEntry,
  TimetableStatus,
} from '../types/school';

export function TeacherSection({
  students,
  timetable,
  homework,
  paripath,
  authToken,
  onDataChanged,
  onAutoGenerateParipath,
  paripathRefreshing,
  onAskRobot,
  onOpen3DStudio,
}: {
  students: Student[];
  timetable: TimetableEntry[];
  homework: HomeworkItem[];
  paripath: Paripath | null;
  authToken: string | null;
  onDataChanged: () => Promise<void>;
  onAutoGenerateParipath: () => Promise<void>;
  paripathRefreshing: boolean;
  onAskRobot: (question: string) => void;
  onOpen3DStudio: () => void;
}) {
  // 1. Student Registration State (Teacher-Only Manual Action)
  const [stuName, setStuName] = useState('');
  const [stuRoll, setStuRoll] = useState('');
  const [stuGrade, setStuGrade] = useState<GradeLevel>('6th');
  const [stuSection, setStuSection] = useState('A');
  const [stuLocker, setStuLocker] = useState('SL-615');
  const [stuSaving, setStuSaving] = useState(false);

  // 2. Smart Drive Timetable Sync State (Teacher-Only Manual Action)
  const [driveGrade, setDriveGrade] = useState<GradeLevel>('6th');
  const [ttTime, setTtTime] = useState('01:35 PM - 02:20 PM');
  const [ttSubject, setTtSubject] = useState('');
  const [ttTeacher, setTtTeacher] = useState('');
  const [ttTopic, setTtTopic] = useState('');
  const [ttSyllabus, setTtSyllabus] = useState(75);
  const [ttStatus, setTtStatus] = useState<TimetableStatus>('Up Next');
  const [driveSaving, setDriveSaving] = useState(false);

  const [csvText, setCsvText] = useState(
    '08:30 AM - 09:15 AM, Mathematics, Mrs. Kavita Joshi, Fractions & Ratios Lab, 82, Completed\n09:20 AM - 10:05 AM, General Science, Mr. Rajesh Kulkarni, Photosynthesis & Plant Cells, 76, Live Now\n10:25 AM - 11:10 AM, English Literature, Ms. Meera Nair, Creative Story Writing, 88, Up Next\n11:15 AM - 12:00 PM, History & Civics, Mr. Vikram Gokhale, Ancient Civilizations Map Work, 66, Up Next'
  );
  const [showBulkDrive, setShowBulkDrive] = useState(false);

  // 3. Teacher-Only Homework Form State
  const [hwGrade, setHwGrade] = useState<GradeLevel>('6th');
  const [hwSubject, setHwSubject] = useState('Mathematics');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('Tomorrow');
  const [hwTeacher, setHwTeacher] = useState('Mrs. Kavita Joshi');
  const [hwSaving, setHwSaving] = useState(false);

  // 4. Marks Updater State
  const [markStudentId, setMarkStudentId] = useState(students[0]?.id || '');
  const [markSubject, setMarkSubject] = useState('History & Civics');
  const [markScore, setMarkScore] = useState(78);
  const [markExam, setMarkExam] = useState('Unit Assessment 2');
  const [markSaving, setMarkSaving] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!markStudentId && students.length > 0) {
      setMarkStudentId(students[0].id);
    }
  }, [students, markStudentId]);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback((curr) => (curr === msg ? null : curr)), 4500);
  };

  const apiEndpoint = (path: string) => (authToken ? `/api/db${path}` : `/api${path}`);
  const apiHeaders = () => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName.trim() || !stuRoll.trim() || !stuLocker.trim() || stuSaving) return;
    setStuSaving(true);
    try {
      const res = await fetch(apiEndpoint('/students'), {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          name: stuName,
          rollNo: stuRoll,
          grade: stuGrade,
          section: stuSection,
          lockerId: stuLocker,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setStuName('');
      setStuRoll('');
      setStuLocker(`SL-${stuGrade === '6th' ? '6' : '7'}${Math.floor(20 + Math.random() * 70)}`);
      await onDataChanged();
      notify(`Registered ${data.name} (Class ${data.grade}, Locker ${data.lockerId}).`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error registering student');
    } finally {
      setStuSaving(false);
    }
  };

  const handleAddTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttSubject.trim() || !ttTeacher.trim() || !ttTopic.trim() || driveSaving) return;
    setDriveSaving(true);
    try {
      const res = await fetch(apiEndpoint('/timetable'), {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          grade: driveGrade,
          timeSlot: ttTime,
          subject: ttSubject,
          teacherName: ttTeacher,
          todaysTopic: ttTopic,
          syllabusPercent: ttSyllabus,
          status: ttStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save timetable slot');
      setTtSubject('');
      setTtTeacher('');
      setTtTopic('');
      await onDataChanged();
      notify(`Synced "${data.subject}" directly to Class ${driveGrade} Student Section.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error saving timetable');
    } finally {
      setDriveSaving(false);
    }
  };

  const handleDeleteTimetable = async (id: string) => {
    const res = await fetch(apiEndpoint(`/timetable/${id}`), {
      method: 'DELETE',
      headers: apiHeaders(),
    });
    if (res.ok) {
      await onDataChanged();
      notify('Removed timetable period and synced Student Section.');
    }
  };

  const handleBulkDriveSync = async () => {
    const lines = csvText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        timeSlot: parts[0] || '09:00 AM - 09:45 AM',
        subject: parts[1] || 'General Study',
        teacherName: parts[2] || 'Class Teacher',
        todaysTopic: parts[3] || 'Topic Review',
        syllabusPercent: Number(parts[4]) || 70,
        status: (parts[5] === 'Completed' || parts[5] === 'Live Now' ? parts[5] : 'Up Next') as TimetableStatus,
      };
    });
    if (parsed.length === 0) return;

    setDriveSaving(true);
    try {
      const res = await fetch(apiEndpoint('/timetable/bulk'), {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ grade: driveGrade, entries: parsed }),
      });
      if (!res.ok) throw new Error('Bulk Smart Drive sync failed.');
      await onDataChanged();
      setShowBulkDrive(false);
      notify(`Smart Drive synced ${parsed.length} periods to Class ${driveGrade} Student Section.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Smart Drive sync failed');
    } finally {
      setDriveSaving(false);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !hwDescription.trim() || hwSaving) return;
    setHwSaving(true);
    try {
      const res = await fetch(apiEndpoint('/homework'), {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          grade: hwGrade,
          subject: hwSubject,
          title: hwTitle,
          description: hwDescription,
          dueDate: hwDueDate,
          teacherName: hwTeacher,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign homework');
      setHwTitle('');
      setHwDescription('');
      await onDataChanged();
      notify(`Assigned "${data.title}" to Class ${hwGrade} Student Section.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error assigning homework');
    } finally {
      setHwSaving(false);
    }
  };

  const handleDeleteHomework = async (id: string) => {
    const res = await fetch(apiEndpoint(`/homework/${id}`), {
      method: 'DELETE',
      headers: apiHeaders(),
    });
    if (res.ok) {
      await onDataChanged();
      notify('Removed homework assignment.');
    }
  };

  const handleUpdateMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markStudentId || !markSubject.trim() || markSaving) return;
    setMarkSaving(true);
    try {
      const res = await fetch(apiEndpoint('/marks'), {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          studentId: markStudentId,
          subject: markSubject,
          marks: Number(markScore),
          examName: markExam,
        }),
      });
      if (!res.ok) throw new Error('Failed to save student marks');
      await onDataChanged();
      notify(`Saved ${markSubject} score (${markScore}/100) and updated charts & alerts.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update marks');
    } finally {
      setMarkSaving(false);
    }
  };

  const filteredDriveRows = timetable.filter((t) => t.grade === driveGrade);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Teacher Admin &amp; Smart Drive
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Teacher Control: Students, Timetable &amp; Homework
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Teachers only manage New Students, Timetable sync, Homework, and Marks — daily Paripath &amp; student Q&amp;A are automated by AI.
          </p>
        </div>
        {feedback && (
          <div
            role="status"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Siri-Style AI Assistant Bar for Teachers */}
      <section className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <LottieRobot size={42} active />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold">
              Siri AI Teacher Co-Pilot
            </h2>
            <p className="text-xs text-slate-300">
              Ask LockerBot to summarize class weak subjects, generate lesson ideas, or test voice responses.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              onAskRobot(
                'Which students or subjects in Class 6th and 7th need extra revision help right now?'
              )
            }
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4 text-sky-400" />
            Ask AI Co-Pilot
          </button>
          <button
            type="button"
            onClick={onOpen3DStudio}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Maximize2 className="w-4 h-4" />
            3D Voice Robot
          </button>
        </div>
      </section>

      {/* 1. Student Registration & Roster */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={(e) => void handleRegisterStudent(e)}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-blue-700" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Register New Student
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="stu-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Student Full Name
              </label>
              <input
                id="stu-name"
                type="text"
                required
                value={stuName}
                onChange={(e) => setStuName(e.target.value)}
                placeholder="e.g. Riya Kulkarni"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="stu-roll" className="block text-xs font-semibold text-slate-700 mb-1">
                  Roll No
                </label>
                <input
                  id="stu-roll"
                  type="text"
                  required
                  value={stuRoll}
                  onChange={(e) => setStuRoll(e.target.value)}
                  placeholder="28"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="stu-grade" className="block text-xs font-semibold text-slate-700 mb-1">
                  Class
                </label>
                <select
                  id="stu-grade"
                  value={stuGrade}
                  onChange={(e) => setStuGrade(e.target.value as GradeLevel)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="6th">6th Grade</option>
                  <option value="7th">7th Grade</option>
                </select>
              </div>

              <div>
                <label htmlFor="stu-sec" className="block text-xs font-semibold text-slate-700 mb-1">
                  Section
                </label>
                <input
                  id="stu-sec"
                  type="text"
                  value={stuSection}
                  onChange={(e) => setStuSection(e.target.value)}
                  placeholder="A"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="stu-locker" className="block text-xs font-semibold text-slate-700 mb-1">
                Smart Locker ID
              </label>
              <input
                id="stu-locker"
                type="text"
                required
                value={stuLocker}
                onChange={(e) => setStuLocker(e.target.value)}
                placeholder="SL-615"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={stuSaving}
            className="w-full px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {stuSaving ? 'Saving...' : 'Save Student'}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Registered Students Roster
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {students.length} Students
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5">Roll</th>
                  <th className="py-3 px-5">Student Name</th>
                  <th className="py-3 px-5">Class</th>
                  <th className="py-3 px-5">Locker ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-700 tabular-nums">#{s.rollNo}</td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-5 text-slate-700">
                      {s.grade} {s.section}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-blue-700">{s.lockerId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 2. Smart Drive (Auto-Timetable Sync) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CloudUpload className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Smart Drive — Auto-Timetable Sync
              </h2>
              <p className="text-xs text-slate-500">
                Add or upload periods to automatically update the Student Section timetable
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(['6th', '7th'] as GradeLevel[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setDriveGrade(g)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    driveGrade === g ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Class {g}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowBulkDrive((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              {showBulkDrive ? 'Hide CSV Upload' : 'Bulk CSV / Drive Sync'}
            </button>
          </div>
        </div>

        {showBulkDrive && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                Upload a `.csv` file or edit schedule lines (`Time, Subject, Teacher, Topic, Syllabus%, Status`) for Class {driveGrade}:
              </p>
              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-800">
                Upload CSV File
                <input type="file" accept=".csv,.txt" onChange={handleCsvFileUpload} className="sr-only" />
              </label>
            </div>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={driveSaving}
                onClick={() => void handleBulkDriveSync()}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <CloudUpload className="w-4 h-4" />
                Replace &amp; Sync Class {driveGrade} Timetable
              </button>
            </div>
          </div>
        )}

        {/* Add Single Timetable Entry */}
        <form
          onSubmit={(e) => void handleAddTimetable(e)}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
        >
          <div>
            <label htmlFor="tt-time" className="block text-xs font-semibold text-slate-700 mb-1">
              Time Slot
            </label>
            <input
              id="tt-time"
              type="text"
              required
              value={ttTime}
              onChange={(e) => setTtTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label htmlFor="tt-sub" className="block text-xs font-semibold text-slate-700 mb-1">
              Subject
            </label>
            <input
              id="tt-sub"
              type="text"
              required
              value={ttSubject}
              onChange={(e) => setTtSubject(e.target.value)}
              placeholder="e.g. Geography"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label htmlFor="tt-teacher" className="block text-xs font-semibold text-slate-700 mb-1">
              Teacher Name
            </label>
            <input
              id="tt-teacher"
              type="text"
              required
              value={ttTeacher}
              onChange={(e) => setTtTeacher(e.target.value)}
              placeholder="Mrs. Priya Iyer"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label htmlFor="tt-topic" className="block text-xs font-semibold text-slate-700 mb-1">
              Today&apos;s Topic
            </label>
            <input
              id="tt-topic"
              type="text"
              required
              value={ttTopic}
              onChange={(e) => setTtTopic(e.target.value)}
              placeholder="Rivers & Deltas"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label htmlFor="tt-syl" className="block text-xs font-semibold text-slate-700 mb-1">
              Syllabus % · Status
            </label>
            <div className="flex gap-1.5">
              <input
                id="tt-syl"
                type="number"
                min={0}
                max={100}
                value={ttSyllabus}
                onChange={(e) => setTtSyllabus(Number(e.target.value))}
                className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <select
                aria-label="Period status"
                value={ttStatus}
                onChange={(e) => setTtStatus(e.target.value as TimetableStatus)}
                className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Completed">Completed</option>
                <option value="Live Now">Live Now</option>
                <option value="Up Next">Up Next</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={driveSaving}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 h-[36px] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add &amp; Sync
          </button>
        </form>

        {/* Live Timetable Preview for Selected Grade */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Topic</th>
                <th className="py-3 px-4">Syllabus</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDriveRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs whitespace-nowrap tabular-nums">{row.timeSlot}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{row.subject}</td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{row.teacherName}</td>
                  <td className="py-3 px-4 text-slate-700">{row.todaysTopic}</td>
                  <td className="py-3 px-4 font-mono text-xs tabular-nums">{row.syllabusPercent}%</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => void handleDeleteTimetable(row.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Delete period"
                      aria-label={`Delete ${row.subject}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Teacher Homework Assignment (Teacher-Only) & Marks Updater */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <ClipboardPlus className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Assign Daily Homework
              </h2>
              <p className="text-xs text-slate-500">
                Homework assigned here appears immediately in the Student Section for AI Robot explanations
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void handleAddHomework(e)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="hw-grade" className="block text-xs font-semibold text-slate-700 mb-1">
                  Class
                </label>
                <select
                  id="hw-grade"
                  value={hwGrade}
                  onChange={(e) => setHwGrade(e.target.value as GradeLevel)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="6th">6th Grade</option>
                  <option value="7th">7th Grade</option>
                </select>
              </div>
              <div>
                <label htmlFor="hw-subject" className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  id="hw-subject"
                  type="text"
                  required
                  value={hwSubject}
                  onChange={(e) => setHwSubject(e.target.value)}
                  placeholder="Mathematics"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label htmlFor="hw-due" className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  id="hw-due"
                  type="text"
                  value={hwDueDate}
                  onChange={(e) => setHwDueDate(e.target.value)}
                  placeholder="Tomorrow"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="hw-title" className="block text-xs font-semibold text-slate-700 mb-1">
                  Homework Title
                </label>
                <input
                  id="hw-title"
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="e.g. Fraction Word Problems Set B"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label htmlFor="hw-teacher" className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Name
                </label>
                <input
                  id="hw-teacher"
                  type="text"
                  value={hwTeacher}
                  onChange={(e) => setHwTeacher(e.target.value)}
                  placeholder="Mrs. Kavita Joshi"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="hw-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                Homework Instructions
              </label>
              <textarea
                id="hw-desc"
                rows={2}
                required
                value={hwDescription}
                onChange={(e) => setHwDescription(e.target.value)}
                placeholder="Complete exercises 1–5 on page 44 in your notebook."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={hwSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {hwSaving ? 'Assigning...' : 'Post Homework to Class'}
            </button>
          </form>

          {/* Active Homework List */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Homework ({homework.length})
            </h3>
            {homework.map((hw) => (
              <div
                key={hw.id}
                className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-700">
                    Class {hw.grade} · {hw.subject} · Due {hw.dueDate}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{hw.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{hw.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteHomework(hw.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                  aria-label={`Delete homework ${hw.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Update Student Test Marks */}
        <form
          onSubmit={(e) => void handleUpdateMark(e)}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-900">
            Student Test Marks Updater
          </h2>
          <p className="text-xs text-slate-500">
            Updates Student graphs, Weak Subject Alert, and Parent score history immediately.
          </p>

          <div className="space-y-3">
            <div>
              <label htmlFor="m-stu" className="block text-xs font-semibold text-slate-700 mb-1">
                Select Student
              </label>
              <select
                id="m-stu"
                value={markStudentId}
                onChange={(e) => setMarkStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.grade} · {s.lockerId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="m-sub" className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Name
              </label>
              <input
                id="m-sub"
                type="text"
                required
                value={markSubject}
                onChange={(e) => setMarkSubject(e.target.value)}
                placeholder="e.g. History & Civics"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="m-score" className="block text-xs font-semibold text-slate-700 mb-1">
                  Marks (0–100)
                </label>
                <input
                  id="m-score"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={markScore}
                  onChange={(e) => setMarkScore(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label htmlFor="m-exam" className="block text-xs font-semibold text-slate-700 mb-1">
                  Assessment Name
                </label>
                <input
                  id="m-exam"
                  type="text"
                  value={markExam}
                  onChange={(e) => setMarkExam(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={markSaving}
            className="w-full px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            {markSaving ? 'Updating...' : 'Save Test Marks'}
          </button>
        </form>
      </section>

      {/* 4. AI-Automated Daily Paripath Board (No Manual Entry Required) */}
      <section className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              AI-Automated Morning Assembly · {paripath?.date ?? 'Today'}
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
              Aaj Ka Paripath (Automatically Generated by AI)
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Today&apos;s News, Suvichar, Din Vishesh, and GK Question are generated automatically by Gemini AI.
            </p>
          </div>
          <button
            type="button"
            disabled={paripathRefreshing}
            onClick={() => void onAutoGenerateParipath()}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${paripathRefreshing ? 'animate-spin' : ''}`} />
            {paripathRefreshing ? 'Generating with AI...' : "Regenerate Today's Paripath (AI)"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-amber-200 rounded-xl p-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase">Suvichar</p>
            <p className="text-slate-900 mt-1">&ldquo;{paripath?.suvichar}&rdquo;</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase">Din Vishesh</p>
            <p className="text-slate-800 mt-1">{paripath?.dinVishesh}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-sky-700 uppercase">Aaj Ki News</p>
            <p className="text-slate-800 mt-1">{paripath?.aajKiNews}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-800 uppercase">GK Question &amp; Answer</p>
            <p className="text-slate-900 font-medium mt-1">{paripath?.gkQuestion}</p>
            <p className="text-xs text-emerald-800 mt-1">Answer: {paripath?.gkAnswer}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
