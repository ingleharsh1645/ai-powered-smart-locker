package com.lockerbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "timetable_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String grade; // "6th" or "7th"

    @Column(nullable = false)
    private String timeSlot;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String teacherName;

    @Column(nullable = false)
    private String todaysTopic;

    private int syllabusPercent;
    private String status; // "Completed", "Live Now", "Up Next"
}
