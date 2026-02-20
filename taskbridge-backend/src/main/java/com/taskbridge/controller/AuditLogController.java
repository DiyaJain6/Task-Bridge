package com.taskbridge.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.taskbridge.entity.AuditLog;
import com.taskbridge.repository.AuditLogRepository;

@RestController
@RequestMapping("/admin/logs")
@CrossOrigin
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepo;

    @GetMapping
    public List<AuditLog> getLogs() {
        return auditLogRepo.findAllByOrderByTimestampDesc();
    }
}
