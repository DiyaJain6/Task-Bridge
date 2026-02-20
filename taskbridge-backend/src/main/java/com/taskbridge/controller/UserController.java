package com.taskbridge.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.taskbridge.entity.Role;
import com.taskbridge.entity.User;
import com.taskbridge.repository.UserRepository;

@RestController
@RequestMapping("/users")
@CrossOrigin
public class UserController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private com.taskbridge.repository.AuditLogRepository auditLogRepo;

    @GetMapping
    public List<User> getAllUsers() {
        return userRepo.findAll();
    }

    @GetMapping("/employees")
    public List<User> getEmployees() {
        return userRepo.findAll().stream()
                .filter(u -> u.getRole() == Role.USER)
                .collect(Collectors.toList());
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public void deleteUser(@org.springframework.web.bind.annotation.PathVariable Long id) {
        userRepo.deleteById(id);
    }

    @GetMapping("/current")
    public User getCurrentUser(java.security.Principal principal) {
        return userRepo.findByEmail(principal.getName()).orElseThrow();
    }

    @org.springframework.web.bind.annotation.PutMapping("/availability")
    public User updateAvailability(
            @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, Object> data,
            java.security.Principal principal) {
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();
        if (data.containsKey("available")) {
            user.setAvailable((boolean) data.get("available"));
        }
        if (data.containsKey("status")) {
            user.setAvailabilityStatus((String) data.get("status"));
        }
        return userRepo.save(user);
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}/role")
    public User updateRole(@org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestBody String role, java.security.Principal principal) {
        User user = userRepo.findById(id).orElseThrow();
        Role oldRole = user.getRole();
        user.setRole(Role.valueOf(role.replace("\"", "")));
        User updated = userRepo.save(user);

        com.taskbridge.entity.AuditLog log = new com.taskbridge.entity.AuditLog();
        log.setAction("UPDATE_ROLE");
        log.setPerformedBy(principal.getName());
        log.setDetails("Updated user " + user.getEmail() + " from " + oldRole + " to " + role);
        auditLogRepo.save(log);

        return updated;
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}/status")
    public User toggleStatus(@org.springframework.web.bind.annotation.PathVariable Long id,
            java.security.Principal principal) {
        User user = userRepo.findById(id).orElseThrow();
        user.setSuspended(!user.isSuspended());
        User updated = userRepo.save(user);

        com.taskbridge.entity.AuditLog log = new com.taskbridge.entity.AuditLog();
        log.setAction(user.isSuspended() ? "SUSPEND_USER" : "ACTIVATE_USER");
        log.setPerformedBy(principal.getName());
        log.setDetails((user.isSuspended() ? "Suspended" : "Activated") + " user " + user.getEmail());
        auditLogRepo.save(log);

        return updated;
    }
}
