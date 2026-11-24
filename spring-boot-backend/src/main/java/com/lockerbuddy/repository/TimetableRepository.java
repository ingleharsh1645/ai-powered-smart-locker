package com.lockerbuddy.repository;

import com.lockerbuddy.entity.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TimetableRepository extends JpaRepository<TimetableEntry, Long> {
    List<TimetableEntry> findByGrade(String grade);
    void deleteByGrade(String grade);
}
