package com.lockerbuddy.controller;

import com.lockerbuddy.entity.*;
import com.lockerbuddy.service.SchoolDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SchoolController {
    private final SchoolDataService schoolDataService;

    @GetMapping("/students")
    public List<Student> getStudents() {
        return schoolDataService.getAllStudents();
    }

    @PostMapping("/students")
    public Student registerStudent(@RequestBody Student student) {
        return schoolDataService.registerStudent(student);
    }

    @GetMapping("/timetable")
    public List<TimetableEntry> getTimetable(@RequestParam(required = false) String grade) {
        return schoolDataService.getTimetable(grade);
    }

    @PostMapping("/timetable")
    public TimetableEntry addTimetable(@RequestBody TimetableEntry entry) {
        return schoolDataService.addTimetableEntry(entry);
    }

    @PostMapping("/timetable/bulk")
    public List<TimetableEntry> syncDriveTimetable(
            @RequestParam String grade,
            @RequestBody List<TimetableEntry> entries) {
        return schoolDataService.syncDriveTimetable(grade, entries);
    }

    @GetMapping("/paripath")
    public Paripath getParipath() {
        return schoolDataService.getLatestParipath();
    }

    @PutMapping("/paripath")
    public Paripath updateParipath(@RequestBody Paripath paripath) {
        return schoolDataService.updateParipath(paripath);
    }

    @GetMapping("/marks")
    public List<SubjectMark> getMarks(@RequestParam Long studentId) {
        return schoolDataService.getMarksByStudent(studentId);
    }

    @PostMapping("/marks")
    public SubjectMark saveMark(@RequestBody SubjectMark mark) {
        return schoolDataService.saveOrUpdateMark(mark);
    }

    @GetMapping("/locker-logs")
    public List<LockerLog> getLockerLogs(@RequestParam Long studentId) {
        return schoolDataService.getLockerLogs(studentId);
    }

    @PostMapping("/locker-logs")
    public LockerLog addLockerLog(@RequestBody LockerLog log) {
        return schoolDataService.logLockerActivity(log);
    }

    @GetMapping("/attendance")
    public List<AttendanceRecord> getAttendance(@RequestParam Long studentId) {
        return schoolDataService.getAttendance(studentId);
    }
}
