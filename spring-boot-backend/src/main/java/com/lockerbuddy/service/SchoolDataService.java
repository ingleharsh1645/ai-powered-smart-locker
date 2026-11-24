package com.lockerbuddy.service;

import com.lockerbuddy.entity.*;
import com.lockerbuddy.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolDataService {
    private final StudentRepository studentRepository;
    private final TimetableRepository timetableRepository;
    private final ParipathRepository paripathRepository;
    private final SubjectMarkRepository markRepository;
    private final LockerLogRepository lockerLogRepository;
    private final AttendanceRepository attendanceRepository;

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Student registerStudent(Student student) {
        if (student.getSection() == null || student.getSection().isBlank()) {
            student.setSection("A");
        }
        if (student.getXpPoints() == 0) {
            student.setXpPoints(250);
        }
        return studentRepository.save(student);
    }

    public List<TimetableEntry> getTimetable(String grade) {
        if (grade != null && !grade.isBlank()) {
            return timetableRepository.findByGrade(grade);
        }
        return timetableRepository.findAll();
    }

    public TimetableEntry addTimetableEntry(TimetableEntry entry) {
        return timetableRepository.save(entry);
    }

    @Transactional
    public List<TimetableEntry> syncDriveTimetable(String grade, List<TimetableEntry> entries) {
        timetableRepository.deleteByGrade(grade);
        entries.forEach(e -> e.setGrade(grade));
        return timetableRepository.saveAll(entries);
    }

    public Paripath getLatestParipath() {
        return paripathRepository.findAll().stream().findFirst().orElse(null);
    }

    public Paripath updateParipath(Paripath updated) {
        Paripath current = getLatestParipath();
        if (current == null) {
            updated.setDate(LocalDate.now().toString());
            return paripathRepository.save(updated);
        }
        current.setSuvichar(updated.getSuvichar());
        current.setDinVishesh(updated.getDinVishesh());
        current.setAajKiNews(updated.getAajKiNews());
        current.setGkQuestion(updated.getGkQuestion());
        current.setGkAnswer(updated.getGkAnswer());
        current.setDate(LocalDate.now().toString());
        return paripathRepository.save(current);
    }

    public List<SubjectMark> getMarksByStudent(Long studentId) {
        return markRepository.findByStudentId(studentId);
    }

    public SubjectMark saveOrUpdateMark(SubjectMark incoming) {
        List<SubjectMark> existing = markRepository.findByStudentId(incoming.getStudentId());
        for (SubjectMark m : existing) {
            if (m.getSubject().equalsIgnoreCase(incoming.getSubject())) {
                m.setUnit1Score(m.getMidTermScore());
                m.setMidTermScore(m.getMarks());
                m.setMarks(incoming.getMarks());
                m.setExamName(incoming.getExamName());
                return markRepository.save(m);
            }
        }
        if (incoming.getMaxMarks() == 0) incoming.setMaxMarks(100);
        return markRepository.save(incoming);
    }

    public List<LockerLog> getLockerLogs(Long studentId) {
        return lockerLogRepository.findByStudentIdOrderByIdDesc(studentId);
    }

    public LockerLog logLockerActivity(LockerLog log) {
        if (log.getTimestamp() == null || log.getTimestamp().isBlank()) {
            log.setTimestamp(LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a")));
        }
        return lockerLogRepository.save(log);
    }

    public List<AttendanceRecord> getAttendance(Long studentId) {
        return attendanceRepository.findByStudentId(studentId);
    }
}
