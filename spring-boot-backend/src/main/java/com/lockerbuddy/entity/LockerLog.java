package com.lockerbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locker_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LockerLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;
    private String lockerId;
    private String timestamp;
    private String action; // "TOOK_OUT" or "PLACED_INSIDE"
    private String itemName;
    private String note;
}
