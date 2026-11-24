import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase';
import { StudentSection } from './components/StudentSection';
import { TeacherSection } from './components/TeacherSection';
import { ParentSection } from './components/ParentSection';
import { SpringBootGuide } from './components/SpringBootGuide';
import { FloatingAiRobot } from './components/FloatingAiRobot';

const FullScreen3DRobotModal = lazy(() =>
  import('./components/FullScreen3DRobotModal').then((m) => ({ default: m.FullScreen3DRobotModal }))
);
import type {
  AttendanceRecord,
  GradeLevel,
  HomeworkItem,
  LockerLog,
  Paripath,
  Student,
  SubjectMark,
  TimetableEntry,
} from './types/school';

type ActiveSection = 'student' | 'teacher' | 'parent' | 'springboot';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('student');
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [activeGrade, setActiveGrade] = useState<GradeLevel>('6th');

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [paripath, setParipath] = useState<Paripath | null>(null);
  const [marks, setMarks] = useState<SubjectMark[]>([]);
  const [lockerLogs, setLockerLogs] = useState<LockerLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Firebase Auth in-memory session (no localStorage token persistence)
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [robotOpen, setRobotOpen] = useState(false);
  const [studio3DOpen, setStudio3DOpen] = useState(false);
  const [robotPrefill, setRobotPrefill] = useState<string | null>(null);
  const [paripathRefreshing, setParipathRefreshing] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          setAuthError(null);
        } catch {
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadSchoolData = useCallback(
    async (preferredStudentId?: string) => {
      try {
        setLoadError(null);

        if (authToken) {
          const res = await fetch('/api/db/bootstrap', {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (!res.ok) {
            throw new Error('Could not load saved school records.');
          }
          const data = (await res.json()) as {
            students: Student[];
            timetable: TimetableEntry[];
            homework: HomeworkItem[];
            paripath: Paripath | null;
          };

          setStudents(data.students);
          setTimetable(data.timetable);
          setHomework(data.homework || []);
          setParipath(data.paripath);

          const resolvedId =
            preferredStudentId && data.students.some((s) => s.id === preferredStudentId)
              ? preferredStudentId
              : data.students[0]?.id || '';
          setActiveStudentId(resolvedId);
          const chosen = data.students.find((s) => s.id === resolvedId);
          if (chosen) setActiveGrade(chosen.grade);
          return;
        }

        const [stuRes, ttRes, hwRes, pariRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/timetable'),
          fetch('/api/homework'),
          fetch('/api/paripath'),
        ]);

        if (!stuRes.ok || !ttRes.ok || !hwRes.ok || !pariRes.ok) {
          throw new Error('Could not load school records from server.');
        }

        const stuData: Student[] = await stuRes.json();
        const ttData: TimetableEntry[] = await ttRes.json();
        const hwData: HomeworkItem[] = await hwRes.json();
        const pariData: Paripath = await pariRes.json();

        setStudents(stuData);
        setTimetable(ttData);
        setHomework(hwData);
        setParipath(pariData);

        const resolvedId =
          preferredStudentId && stuData.some((s) => s.id === preferredStudentId)
            ? preferredStudentId
            : stuData[0]?.id || '';

        setActiveStudentId(resolvedId);

        if (resolvedId) {
          const chosen = stuData.find((s) => s.id === resolvedId);
          if (chosen) {
            setActiveGrade(chosen.grade);
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Unable to load application data.');
      } finally {
        setLoading(false);
      }
    },
    [authToken]
  );

  const loadStudentDetails = useCallback(
    async (studentId: string) => {
      if (!studentId) return;
      try {
        if (authToken) {
          const res = await fetch(`/api/db/student-details?studentId=${encodeURIComponent(studentId)}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const data = (await res.json()) as {
              marks: SubjectMark[];
              lockerLogs: LockerLog[];
              attendance: AttendanceRecord[];
            };
            setMarks(data.marks);
            setLockerLogs(data.lockerLogs);
            setAttendance(data.attendance);
          }
          return;
        }

        const [marksRes, logsRes, attRes] = await Promise.all([
          fetch(`/api/marks?studentId=${encodeURIComponent(studentId)}`),
          fetch(`/api/locker-logs?studentId=${encodeURIComponent(studentId)}`),
          fetch(`/api/attendance?studentId=${encodeURIComponent(studentId)}`),
        ]);
        if (marksRes.ok) setMarks(await marksRes.json());
        if (logsRes.ok) setLockerLogs(await logsRes.json());
        if (attRes.ok) setAttendance(await attRes.json());
      } catch {
        // Keep previous metrics if transient network blip occurs
      }
    },
    [authToken]
  );

  useEffect(() => {
    void loadSchoolData();
  }, [loadSchoolData]);

  useEffect(() => {
    if (activeStudentId) {
      void loadStudentDetails(activeStudentId);
    }
  }, [activeStudentId, loadStudentDetails]);

  const handleSelectStudent = (studentId: string) => {
    setActiveStudentId(studentId);
    const stu = students.find((s) => s.id === studentId);
    if (stu) {
      setActiveGrade(stu.grade);
    }
  };

  const handleDataChanged = async () => {
    await loadSchoolData(activeStudentId);
    if (activeStudentId) {
      await loadStudentDetails(activeStudentId);
    }
  };

  const handleAutoGenerateParipath = async () => {
    if (paripathRefreshing) return;
    setParipathRefreshing(true);
    try {
      const res = await fetch('/api/ai/auto-paripath', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok) {
        setParipath(data as Paripath);
      } else {
        setAuthError(data.error || 'Could not refresh Paripath automatically.');
      }
    } catch {
      setAuthError('Could not connect to AI Paripath service.');
    } finally {
      setParipathRefreshing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !googleAuthProvider) {
      setAuthError('Google Sign-In is unavailable in this embedded preview context.');
      return;
    }
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in cancelled or failed.');
    }
  };

  const handleGoogleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    setAuthToken(null);
  };

  const handleAskRobot = (question: string) => {
    setRobotPrefill(question);
    setRobotOpen(true);
  };

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? students[0];

  const navItems: { id: ActiveSection; label: string }[] = [
    { id: 'student', label: 'Student Section' },
    { id: 'teacher', label: 'Teacher Section' },
    { id: 'parent', label: 'Parent Section' },
    { id: 'springboot', label: 'Spring Boot Code' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveSection('student')}
            className="font-display text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            LockerBuddy
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav aria-label="Primary sections" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`py-1.5 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    isActive
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setStudio3DOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              3D Voice Robot
            </button>
          </div>
        </div>

        {/* Mobile Section Switcher */}
        <div className="md:hidden border-t border-slate-200 px-4 py-2 flex items-center gap-4 overflow-x-auto bg-slate-50">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`py-1 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 ${
                  isActive ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Clean Account Sync Strip (Optional Cloud Save via Google Sign-In) */}
      <div className="bg-slate-100/80 border-b border-slate-200 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-600">
            {authUser
              ? `Signed in as ${authUser.email || authUser.displayName || 'School Account'} · Classroom records synced to your personal workspace`
              : 'Instant Classroom Mode · Sign in with Google anytime to keep your own personal school workspace'}
          </span>
          <div className="flex items-center gap-3">
            {authError && <span className="text-amber-800 font-medium">{authError}</span>}
            {authUser ? (
              <button
                type="button"
                onClick={() => void handleGoogleSignOut()}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-900"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 pb-28">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-600">
            Loading school timetable, smart locker logs, and student dashboards...
          </div>
        ) : loadError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-900">
            {loadError}
          </div>
        ) : (
          <>
            {activeSection === 'student' && (
              <StudentSection
                students={students}
                activeStudent={activeStudent}
                activeGrade={activeGrade}
                onSelectStudent={handleSelectStudent}
                onSelectGrade={setActiveGrade}
                timetable={timetable}
                homework={homework}
                paripath={paripath}
                marks={marks}
                onAskRobot={handleAskRobot}
                onOpen3DStudio={() => setStudio3DOpen(true)}
                onAutoGenerateParipath={handleAutoGenerateParipath}
                paripathRefreshing={paripathRefreshing}
              />
            )}

            {activeSection === 'teacher' && (
              <TeacherSection
                students={students}
                timetable={timetable}
                homework={homework}
                paripath={paripath}
                authToken={authToken}
                onDataChanged={handleDataChanged}
                onAutoGenerateParipath={handleAutoGenerateParipath}
                paripathRefreshing={paripathRefreshing}
                onAskRobot={handleAskRobot}
                onOpen3DStudio={() => setStudio3DOpen(true)}
              />
            )}

            {activeSection === 'parent' && (
              <ParentSection
                students={students}
                activeStudent={activeStudent}
                onSelectStudent={handleSelectStudent}
                lockerLogs={lockerLogs}
                attendance={attendance}
                marks={marks}
                authToken={authToken}
                onDataChanged={handleDataChanged}
                onAskRobot={handleAskRobot}
                onOpen3DStudio={() => setStudio3DOpen(true)}
              />
            )}

            {activeSection === 'springboot' && <SpringBootGuide />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>LockerBuddy · Smart Locker &amp; School Assistant for Grades 6 &amp; 7</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('student')}
              className="hover:text-slate-900"
            >
              Student View
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('teacher')}
              className="hover:text-slate-900"
            >
              Teacher Drive
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('parent')}
              className="hover:text-slate-900"
            >
              Parent Monitor
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('springboot')}
              className="hover:text-slate-900"
            >
              Spring Boot 3 Source
            </button>
          </div>
        </div>
      </footer>

      {/* Full-Screen Interactive 3D Siri Robot Live Voice Studio (Lazy-loaded on demand) */}
      {studio3DOpen && (
        <Suspense fallback={null}>
          <FullScreen3DRobotModal
            isOpen={studio3DOpen}
            onClose={() => setStudio3DOpen(false)}
            activeStudent={activeStudent}
            activeGrade={activeGrade}
          />
        </Suspense>
      )}

      {/* Persistent Floating 3D Siri-Style AI Robot (Available in All Sections) */}
      <FloatingAiRobot
        isOpen={robotOpen}
        onToggle={setRobotOpen}
        onOpen3DStudio={() => {
          setRobotOpen(false);
          setStudio3DOpen(true);
        }}
        activeStudent={activeStudent}
        activeGrade={activeGrade}
        prefillQuestion={robotPrefill}
        onClearPrefill={() => setRobotPrefill(null)}
      />
    </div>
  );
}
