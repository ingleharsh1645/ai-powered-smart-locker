package com.lockerbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "paripath_board")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paripath {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String date;

    @Column(length = 500)
    private String suvichar;

    @Column(length = 500)
    private String dinVishesh;

    @Column(length = 600)
    private String aajKiNews;

    @Column(length = 400)
    private String gkQuestion;

    @Column(length = 400)
    private String gkAnswer;
}
