package com.lockerbuddy.config;

import com.lockerbuddy.entity.*;
import com.lockerbuddy.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
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

        Student ananya = studentRepository.save(Student.builder()
                .name("Ananya Patel").rollNo("07").grade("7th").section("B")
                .lockerId("SL-712").xpPoints(1680).streakDays(18).build());

        timetableRepository.saveAll(List.of(
                TimetableEntry.builder().grade("6th").timeSlot("08:30 AM - 09:15 AM")
                        .subject("Mathematics").teacherName("Mrs. Kavita Joshi")
                        .todaysTopic("Fractions, Decimals & Number Line Puzzles")
                        .syllabusPercent(78).status("Completed").build(),
                TimetableEntry.builder().grade("6th").timeSlot("09:20 AM - 10:05 AM")
                        .subject("General Science").teacherName("Mr. Rajesh Kulkarni")
                        .todaysTopic("Photosynthesis & Leaf Stomata Lab")
                        .syllabusPercent(72).status("Live Now").build(),
                TimetableEntry.builder().grade("6th").timeSlot("11:15 AM - 12:00 PM")
                        .subject("History & Civics").teacherName("Mr. Vikram Gokhale")
                        .todaysTopic("Indus Valley Town Planning & Crafts")
                        .syllabusPercent(64).status("Up Next").build(),
                TimetableEntry.builder().grade("7th").timeSlot("08:30 AM - 09:15 AM")
                        .subject("Mathematics").teacherName("Mr. Arvind Rao")
                        .todaysTopic("Linear Equations in One Variable")
                        .syllabusPercent(80).status("Completed").build(),
                TimetableEntry.builder().grade("7th").timeSlot("09:20 AM - 10:05 AM")
                        .subject("Physics & Chemistry").teacherName("Dr. Sunita Menon")
                        .todaysTopic("Acids, Bases & Litmus Paper Test")
                        .syllabusPercent(68).status("Live Now").build()
        ));

        paripathRepository.save(Paripath.builder()
                .date(LocalDate.now().toString())
                .suvichar("Small daily curiosities grow into mighty discoveries—ask one thoughtful question in every class today.")
                .dinVishesh("National Science Curiosity Week — Celebrating young inventors and hands-on experiments.")
                .aajKiNews("ISRO engineers conducted a successful school outreach satellite workshop for middle-school robotics clubs.")
                .gkQuestion("Which gas do green plants absorb from the air during photosynthesis?")
                .gkAnswer("Carbon dioxide (CO2), which plants convert with water and sunlight into glucose and oxygen.")
                .build());

        markRepository.saveAll(List.of(
                SubjectMark.builder().studentId(aarav.getId()).subject("Mathematics").marks(88).maxMarks(100).examName("Unit Assessment 2").unit1Score(79).midTermScore(84).build(),
                SubjectMark.builder().studentId(aarav.getId()).subject("General Science").marks(82).maxMarks(100).examName("Unit Assessment 2").unit1Score(74).midTermScore(78).build(),
                SubjectMark.builder().studentId(aarav.getId()).subject("History & Civics").marks(54).maxMarks(100).examName("Unit Assessment 2").unit1Score(60).midTermScore(57).build(),
                SubjectMark.builder().studentId(ananya.getId()).subject("Mathematics").marks(93).maxMarks(100).examName("Unit Assessment 2").unit1Score(87).midTermScore(90).build(),
                SubjectMark.builder().studentId(ananya.getId()).subject("Physics & Chemistry").marks(58).maxMarks(100).examName("Unit Assessment 2").unit1Score(65).midTermScore(61).build()
        ));

        lockerLogRepository.saveAll(List.of(
                LockerLog.builder().studentId(aarav.getId()).lockerId("SL-604").timestamp("08:25 AM").action("TOOK_OUT").itemName("Maths Textbook & Geometry Box").note("Period 1").build(),
                LockerLog.builder().studentId(aarav.getId()).lockerId("SL-604").timestamp("09:18 AM").action("TOOK_OUT").itemName("Science Lab Notebook").note("Period 2").build(),
                LockerLog.builder().studentId(aarav.getId()).lockerId("SL-604").timestamp("12:05 PM").action("TOOK_OUT").itemName("Lunch Box & Steel Bottle").note("Recess").build(),
                LockerLog.builder().studentId(ananya.getId()).lockerId("SL-712").timestamp("09:17 AM").action("TOOK_OUT").itemName("Chemistry Safety Goggles").note("Lab").build()
        ));

        attendanceRepository.saveAll(List.of(
                AttendanceRecord.builder().studentId(aarav.getId()).month("Jun").percentage(92).daysPresent(22).totalDays(24).build(),
                AttendanceRecord.builder().studentId(aarav.getId()).month("Jul").percentage(96).daysPresent(24).totalDays(25).build(),
                AttendanceRecord.builder().studentId(aarav.getId()).month("Aug").percentage(88).daysPresent(22).totalDays(25).build(),
                AttendanceRecord.builder().studentId(aarav.getId()).month("Sep").percentage(95).daysPresent(21).totalDays(22).build(),
                AttendanceRecord.builder().studentId(aarav.getId()).month("Oct").percentage(96).daysPresent(23).totalDays(24).build(),
                AttendanceRecord.builder().studentId(aarav.getId()).month("Nov").percentage(98).daysPresent(19).totalDays(19).build()
        ));
    }
}
