package com.lockerbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String rollNo;

    @Column(nullable = false)
    private String grade; // "6th" or "7th"

    private String section;

    @Column(nullable = false, unique = true)
    private String lockerId;

    private int xpPoints;
    private int streakDays;
}
