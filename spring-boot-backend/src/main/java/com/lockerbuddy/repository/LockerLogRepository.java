package com.lockerbuddy.repository;

import com.lockerbuddy.entity.LockerLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LockerLogRepository extends JpaRepository<LockerLog, Long> {
    List<LockerLog> findByStudentIdOrderByIdDesc(Long studentId);
}
