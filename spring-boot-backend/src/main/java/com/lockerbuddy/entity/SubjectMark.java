package com.lockerbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subject_marks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubjectMark {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;
    private String subject;
    private int marks;
    private int maxMarks;
    private String examName;
    private int unit1Score;
    private int midTermScore;
}
