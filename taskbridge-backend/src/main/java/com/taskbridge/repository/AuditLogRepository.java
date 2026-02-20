package com.taskbridge.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.taskbridge.entity.AuditLog;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findAllByOrderByTimestampDesc();
}
