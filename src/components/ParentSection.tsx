import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck,
  Lock,
  Maximize2,
  MessageCircle,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import { AttendanceLineChart, TermProgressChart } from './SchoolCharts';
import { LottieRobot } from './LottieRobot';
import type {
  AttendanceRecord,
  LockerAction,
  LockerLog,
  Student,
  SubjectMark,
} from '../types/school';

export function ParentSection({
  students,
  activeStudent,
  onSelectStudent,
  lockerLogs,
  attendance,
  marks,
  authToken,
  onDataChanged,
  onAskRobot,
  onOpen3DStudio,
}: {
  students: Student[];
  activeStudent: Student | undefined;
  onSelectStudent: (studentId: string) => void;
  lockerLogs: LockerLog[];
  attendance: AttendanceRecord[];
  marks: SubjectMark[];
  authToken: string | null;
  onDataChanged: () => Promise<void>;
  onAskRobot: (question: string) => void;
  onOpen3DStudio: () => void;
}) {
  const [simAction, setSimAction] = useState<LockerAction>('TOOK_OUT');
  const [simItem, setSimItem] = useState('English Grammar Workbook');
  const [simSaving, setSimSaving] = useState(false);

  const avgAttendance =
    attendance.length > 0
      ? Math.round(attendance.reduce((sum, a) => sum + a.percentage, 0) / attendance.length)
      : 0;
  const totalPresent = attendance.reduce((sum, a) => sum + a.daysPresent, 0);
  const totalDays = attendance.reduce((sum, a) => sum + a.totalDays, 0);
  const avgMarks =
    marks.length > 0 ? Math.round(marks.reduce((sum, m) => sum + m.marks, 0) / marks.length) : 0;

  const handleLogLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !simItem.trim() || simSaving) return;
    setSimSaving(true);
    try {
      const endpoint = authToken ? '/api/db/locker-logs' : '/api/locker-logs';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          studentId: activeStudent.id,
          action: simAction,
          itemName: simItem,
          note: 'Smart Locker Sensor Trigger',
        }),
      });
      if (res.ok) {
        setSimItem('');
        await onDataChanged();
      }
    } finally {
      setSimSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Child Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Parent Live Monitoring
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Smart Locker Timeline &amp; Progress Analytics
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time item logs from your child&apos;s smart locker alongside monthly attendance and exam growth.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
          <label htmlFor="parent-child-select" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Select Child
          </label>
          <select
            id="parent-child-select"
            value={activeStudent?.id || ''}
            onChange={(e) => onSelectStudent(e.target.value)}
            className="text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (Class {s.grade} · {s.lockerId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Siri-Style AI Parent Assistant Banner */}
      <section className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <LottieRobot size={42} active />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold">
              Ask Siri AI Robot About {activeStudent?.name ?? 'Your Child'}
            </h2>
            <p className="text-xs text-slate-300">
              Get instant spoken answers on locker items, attendance trends, or today&apos;s homework.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              onAskRobot(
                `What did ${activeStudent?.name ?? 'my child'} take out or place inside the smart locker today?`
              )
            }
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            Check Locker with AI
          </button>
          <button
            type="button"
            onClick={() =>
              onAskRobot(
                `Summarize ${activeStudent?.name ?? 'my child'}'s attendance (${avgAttendance}%) and test performance, including any weak subject.`
              )
            }
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            Attendance &amp; Marks Summary
          </button>
          <button
            type="button"
            onClick={onOpen3DStudio}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Maximize2 className="w-4 h-4" />
            3D Voice Studio
          </button>
        </div>
      </section>

      {/* Summary KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Assigned Smart Locker</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-700" />
            {activeStudent?.lockerId ?? '--'}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Class {activeStudent?.grade} {activeStudent?.section} · Roll #{activeStudent?.rollNo}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Average Attendance</p>
          <p className="font-mono text-2xl font-bold text-emerald-700 mt-1 tabular-nums flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            {avgAttendance}%
          </p>
          <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
            {totalPresent} / {totalDays} School Days Present
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Overall Exam Average</p>
          <p className="font-mono text-2xl font-bold text-blue-700 mt-1 tabular-nums flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {avgMarks}%
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Across {marks.length} graded subjects
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Locker Events Logged</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {lockerLogs.length}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Latest at {lockerLogs[0]?.timestamp ?? 'N/A'}
          </p>
        </div>
      </section>

      {/* Main Split: Smart Locker Timeline + Graphs */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Real-Time Locker Activity Log */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Smart Locker Activity Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live RFID &amp; weight-sensor timeline for {activeStudent?.name}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-blue-700">
              {activeStudent?.lockerId}
            </span>
          </div>

          {/* Interactive RFID Test Trigger */}
          <form
            onSubmit={(e) => void handleLogLocker(e)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5"
          >
            <p className="text-xs font-semibold text-slate-700">
              Record Live Smart Locker Event
            </p>
            <div className="flex gap-2">
              <select
                aria-label="Locker action"
                value={simAction}
                onChange={(e) => setSimAction(e.target.value as LockerAction)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="TOOK_OUT">Took Out</option>
                <option value="PLACED_INSIDE">Placed Inside</option>
              </select>
              <input
                type="text"
                required
                value={simItem}
                onChange={(e) => setSimItem(e.target.value)}
                placeholder="Item name (e.g. Maths Book)"
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={simSaving}
                className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Log
              </button>
            </div>
          </form>

          {/* Timeline List */}
          <div className="divide-y divide-slate-200">
            {lockerLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No locker events recorded yet for this student.
              </p>
            ) : (
              lockerLogs.map((log) => {
                const isTookOut = log.action === 'TOOK_OUT';
                return (
                  <div key={log.id} className="py-3.5 flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isTookOut
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isTookOut ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {isTookOut ? 'Took Out' : 'Placed Inside'} · {log.itemName}
                        </p>
                        <span className="font-mono text-xs text-slate-600 shrink-0 tabular-nums">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Locker {log.lockerId} {log.note ? `· ${log.note}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performance & Attendance Charts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Monthly Attendance Percentage
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jun – Nov academic term attendance trend
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                {avgAttendance}% Avg
              </span>
            </div>
            {attendance.length > 0 ? (
              <AttendanceLineChart records={attendance} />
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">No attendance data yet.</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="mb-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Test Score History Across Terms
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing Unit 1, Mid-Term, and Latest Assessment scores
              </p>
            </div>
            {marks.length > 0 ? (
              <TermProgressChart marks={marks} />
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">No exam history yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
