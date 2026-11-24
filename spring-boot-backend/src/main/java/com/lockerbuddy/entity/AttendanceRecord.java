package com.lockerbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "attendance_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;
    private String month;
    private int percentage;
    private int daysPresent;
    private int totalDays;
}
