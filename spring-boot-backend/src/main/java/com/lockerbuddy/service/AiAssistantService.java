package com.lockerbuddy.service;

import com.lockerbuddy.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiAssistantService {
    private final SchoolDataService schoolDataService;

    public String answerQuestion(String question, Long studentId, String grade) {
        String q = question == null ? "" : question.toLowerCase();
        String targetGrade = (grade != null && !grade.isBlank()) ? grade : "6th";
        Long activeStudentId = studentId != null ? studentId : 1L;

        if (q.contains("timetable") || q.contains("schedule") || q.contains("class") || q.contains("period")) {
            List<TimetableEntry> entries = schoolDataService.getTimetable(targetGrade);
            if (entries.isEmpty()) {
                return "No timetable entries have been uploaded yet for Class " + targetGrade + ".";
            }
            String list = entries.stream()
                    .map(e -> e.getTimeSlot() + ": " + e.getSubject() + " with " + e.getTeacherName()
                            + " (Topic: " + e.getTodaysTopic() + ")")
                    .collect(Collectors.joining("; "));
            return "Here is today's timetable for Class " + targetGrade + ": " + list;
        }

        if (q.contains("paripath") || q.contains("suvichar") || q.contains("thought") || q.contains("news") || q.contains("gk")) {
            Paripath p = schoolDataService.getLatestParipath();
            if (p == null) return "Today's Paripath board has not been updated yet.";
            return "Today's Aaj Ka Paripath: Suvichar — " + p.getSuvichar()
                    + ". Din Vishesh — " + p.getDinVishesh()
                    + ". News — " + p.getAajKiNews()
                    + ". GK Question — " + p.getGkQuestion() + " Answer: " + p.getGkAnswer();
        }

        if (q.contains("locker") || q.contains("take") || q.contains("took") || q.contains("placed")) {
            List<LockerLog> logs = schoolDataService.getLockerLogs(activeStudentId);
            if (logs.isEmpty()) return "No locker activity has been recorded yet.";
            LockerLog latest = logs.get(0);
            return "Latest smart locker activity at " + latest.getTimestamp() + ": "
                    + (latest.getAction().equals("TOOK_OUT") ? "Took out " : "Placed inside ")
                    + latest.getItemName() + " from locker " + latest.getLockerId() + ".";
        }

        if (q.contains("weak") || q.contains("marks") || q.contains("score") || q.contains("improve")) {
            List<SubjectMark> marks = schoolDataService.getMarksByStudent(activeStudentId);
            if (marks.isEmpty()) return "No test marks are recorded yet.";
            SubjectMark weakest = marks.stream()
                    .min(Comparator.comparingInt(SubjectMark::getMarks))
                    .orElse(marks.get(0));
            return "Your subject needing extra practice is " + weakest.getSubject()
                    + " with " + weakest.getMarks() + " out of 100. Try 15 minutes of daily revision!";
        }

        return "Hello! I am LockerBot. Ask me about today's timetable, Aaj Ka Paripath, your smart locker activity, or your test marks!";
    }
}
