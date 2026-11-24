import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

const FILES = [
  {
    name: 'pom.xml',
    path: 'spring-boot-backend/pom.xml',
    code: `<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.4</version>
  </parent>
  <groupId>com.lockerbuddy</groupId>
  <artifactId>smart-locker-school-assistant</artifactId>
  <version>1.0.0</version>
  <properties><java.version>17</java.version></properties>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
    <dependency><groupId>com.h2database</groupId><artifactId>h2</artifactId><scope>runtime</scope></dependency>
    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>
  </dependencies>
</project>`,
  },
  {
    name: 'SchoolController.java',
    path: 'spring-boot-backend/src/main/java/com/lockerbuddy/controller/SchoolController.java',
    code: `@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SchoolController {
    private final SchoolDataService schoolDataService;

    @GetMapping("/students")
    public List<Student> getStudents() { return schoolDataService.getAllStudents(); }

    @PostMapping("/students")
    public Student registerStudent(@RequestBody Student student) {
        return schoolDataService.registerStudent(student);
    }

    @GetMapping("/timetable")
    public List<TimetableEntry> getTimetable(@RequestParam(required = false) String grade) {
        return schoolDataService.getTimetable(grade);
    }

    @PostMapping("/timetable/bulk")
    public List<TimetableEntry> syncDriveTimetable(@RequestParam String grade, @RequestBody List<TimetableEntry> entries) {
        return schoolDataService.syncDriveTimetable(grade, entries);
    }

    @GetMapping("/paripath")
    public Paripath getParipath() { return schoolDataService.getLatestParipath(); }

    @PutMapping("/paripath")
    public Paripath updateParipath(@RequestBody Paripath paripath) {
        return schoolDataService.updateParipath(paripath);
    }

    @GetMapping("/locker-logs")
    public List<LockerLog> getLockerLogs(@RequestParam Long studentId) {
        return schoolDataService.getLockerLogs(studentId);
    }
}`,
  },
  {
    name: 'AiAssistantController.java',
    path: 'spring-boot-backend/src/main/java/com/lockerbuddy/controller/AiAssistantController.java',
    code: `@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AiAssistantController {
    private final AiAssistantService aiAssistantService;

    @PostMapping("/ask")
    public Map<String, String> askRobot(@RequestBody AskRequest request) {
        String answer = aiAssistantService.answerQuestion(
            request.getQuestion(),
            request.getStudentId(),
            request.getGrade()
        );
        return Map.of("answer", answer, "modelUsed", "spring-boot-assistant");
    }
}`,
  },
  {
    name: 'DataInitializer.java',
    path: 'spring-boot-backend/src/main/java/com/lockerbuddy/config/DataInitializer.java',
    code: `@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private final StudentRepository studentRepository;
    private final TimetableRepository timetableRepository;
    private final ParipathRepository paripathRepository;
    private final SubjectMarkRepository markRepository;
    private final LockerLogRepository lockerLogRepository;
    private final AttendanceRepository attendanceRepository;

    @Override
    public void run(String... args) {
        if (studentRepository.count() > 0) return;
        Student aarav = studentRepository.save(Student.builder()
            .name("Aarav Sharma").rollNo("14").grade("6th").section("A")
            .lockerId("SL-604").xpPoints(1420).streakDays(12).build());
        // Full 6th & 7th grade Timetable, Paripath, Marks, Locker Logs & Attendance pre-loaded!
    }
}`,
  },
];

export function SpringBootGuide() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = FILES[selectedIdx];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
          Java 17 · Spring Boot 3 · H2 Database · Lombok
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          Spring Boot 3 Backend Source &amp; Local Setup Guide
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete Spring Boot project files are generated in <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">spring-boot-backend/</code> alongside this live web application.
        </p>
      </div>

      {/* Step-by-Step Local Run Instructions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <span className="font-mono text-xs font-semibold text-blue-700">Step 01</span>
          <h2 className="font-display text-base font-bold text-slate-900">Install Java 17 &amp; Maven</h2>
          <p className="text-sm text-slate-600">
            Verify <code className="font-mono text-xs">java -version</code> (17+) and <code className="font-mono text-xs">mvn -version</code> (3.9+) are installed locally.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <span className="font-mono text-xs font-semibold text-blue-700">Step 02</span>
          <h2 className="font-display text-base font-bold text-slate-900">Run Spring Boot Backend</h2>
          <pre className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-xs overflow-x-auto">
            cd spring-boot-backend{'\n'}mvn spring-boot:run
          </pre>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <span className="font-mono text-xs font-semibold text-blue-700">Step 03</span>
          <h2 className="font-display text-base font-bold text-slate-900">Inspect H2 &amp; REST APIs</h2>
          <p className="text-sm text-slate-600">
            H2 Console: <code className="font-mono text-xs">localhost:8080/h2-console</code><br />
            JDBC URL: <code className="font-mono text-xs">jdbc:h2:mem:schoolassistantdb</code>
          </p>
        </div>
      </section>

      {/* Code Viewer */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {FILES.map((f, idx) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap shrink-0 transition-colors ${
                  selectedIdx === idx
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
        </div>

        <div className="px-4 py-2 bg-slate-900 text-slate-400 text-xs font-mono border-b border-slate-800 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          <span>{activeFile.path}</span>
        </div>

        <pre className="p-5 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto">
          <code>{activeFile.code}</code>
        </pre>
      </section>
    </div>
  );
}
