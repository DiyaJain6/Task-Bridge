package com.taskbridge.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.taskbridge.entity.SystemSetting;
import com.taskbridge.entity.AuditLog;
import com.taskbridge.repository.SystemSettingRepository;
import com.taskbridge.repository.AuditLogRepository;
import java.security.Principal;

@RestController
@RequestMapping("/admin")
@CrossOrigin
public class SystemSettingController {

    @Autowired
    private SystemSettingRepository settingRepo;

    @Autowired
    private AuditLogRepository auditLogRepo;

    @GetMapping("/settings")
    public List<SystemSetting> getSettings() {
        return settingRepo.findAll();
    }

    @PostMapping("/settings")
    public SystemSetting updateSetting(@RequestBody SystemSetting setting, Principal principal) {
        SystemSetting saved = settingRepo.save(setting);

        AuditLog log = new AuditLog();
        log.setAction("UPDATE_SETTING");
        log.setPerformedBy(principal.getName());
        log.setDetails("Updated system setting: " + setting.getSettingKey() + " to " + setting.getSettingValue());
        auditLogRepo.save(log);

        return saved;
    }

    @GetMapping("/public/settings")
    public java.util.Map<String, String> getPublicSettings() {
        java.util.List<SystemSetting> all = settingRepo.findAll();
        java.util.Map<String, String> publicMap = new java.util.HashMap<>();
        for (SystemSetting s : all) {
            if (s.getSettingKey().equals("platformName") || s.getSettingKey().equals("maintenanceMode")) {
                publicMap.put(s.getSettingKey(), s.getSettingValue());
            }
        }
        return publicMap;
    }
}
