package com.lockerbuddy.repository;

import com.lockerbuddy.entity.SubjectMark;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubjectMarkRepository extends JpaRepository<SubjectMark, Long> {
    List<SubjectMark> findByStudentId(Long studentId);
}
