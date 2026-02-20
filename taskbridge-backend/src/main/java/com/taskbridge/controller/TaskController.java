package com.taskbridge.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.taskbridge.entity.Role;
import com.taskbridge.entity.Task;
import com.taskbridge.entity.User;
import com.taskbridge.repository.TaskRepository;
import com.taskbridge.repository.UserRepository;
import com.taskbridge.repository.AuditLogRepository;
import com.taskbridge.repository.NotificationRepository;
import com.taskbridge.entity.AuditLog;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    @Autowired
    private TaskRepository taskRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private AuditLogRepository auditLogRepo;

    @Autowired
    private NotificationRepository notificationRepo;

    private void createNotification(User user, String title, String message) {
        com.taskbridge.entity.Notification notification = new com.taskbridge.entity.Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notificationRepo.save(notification);
    }

    @PostMapping
    public org.springframework.http.ResponseEntity<?> createTask(@RequestBody Task task, Principal principal) {
        try {
            if (principal == null) {
                return org.springframework.http.ResponseEntity.status(401).body("User not authenticated");
            }
            User creator = userRepo.findByEmail(principal.getName()).orElseThrow();

            task.setAssignedBy(creator);
            task.setStatus("PENDING");

            if (task.getAssignedTo() != null && task.getAssignedTo().getId() != null) {
                User assignee = userRepo.findById(task.getAssignedTo().getId())
                        .orElseThrow(() -> new RuntimeException("Assignee not found"));
                task.setAssignedTo(assignee);
                task.setAssignedAt(java.time.LocalDateTime.now());
            }

            Task savedTask = taskRepo.save(task);
            createNotification(creator, "Task Created",
                    "Your request \"" + savedTask.getTitle() + "\" has been submitted successfully.");
            return org.springframework.http.ResponseEntity.ok(savedTask);
        } catch (Exception e) {
            e.printStackTrace();
            return org.springframework.http.ResponseEntity.status(500).body("Error creating task: " + e.getMessage());
        }
    }

    @GetMapping
    public List<Task> getTasks(Principal principal) {
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();

        if (user.getRole() == Role.ADMIN) {
            return taskRepo.findAll();
        } else if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
            return taskRepo.findAll();
        } else {
            // User sees tasks they CREATED (Requests)
            return taskRepo.findByAssignedBy(user);
        }
    }

    @PutMapping("/{id}/start")
    public Task startTask(@PathVariable Long id, Principal principal) {
        Task task = taskRepo.findById(id).orElseThrow();
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();

        // Only assignee can start
        if (task.getAssignedTo() != null && task.getAssignedTo().getId().equals(user.getId())) {
            task.setStatus("IN_PROGRESS");
            task.setStartedAt(java.time.LocalDateTime.now());
            Task savedTask = taskRepo.save(task);
            if (task.getAssignedBy() != null) {
                createNotification(task.getAssignedBy(), "Operation Started",
                        "Field Agent " + user.getName() + " has started \"" + task.getTitle() + "\".");
            }
            return savedTask;
        } else {
            throw new RuntimeException("Unauthorized to start this task");
        }
    }

    @PutMapping("/{id}/complete")
    public Task completeTask(@PathVariable Long id, @RequestBody java.util.Map<String, String> data,
            Principal principal) {
        Task task = taskRepo.findById(id).orElseThrow();
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();

        // Allow assignee, admin OR the original requester to complete
        if ((task.getAssignedTo() != null && task.getAssignedTo().getId().equals(user.getId()))
                || (task.getAssignedBy() != null && task.getAssignedBy().getId().equals(user.getId()))
                || user.getRole() == Role.ADMIN) {
            task.setStatus("COMPLETED");
            task.setCompletedAt(java.time.LocalDateTime.now());
            if (data.containsKey("feedback"))
                task.setFeedback(data.get("feedback"));
            if (data.containsKey("proof"))
                task.setCompletionProof(data.get("proof"));

            Task saved = taskRepo.save(task);
            if (saved.getAssignedBy() != null) {
                createNotification(saved.getAssignedBy(), "Task Complete",
                        "Your request \"" + saved.getTitle() + "\" has been finalized and verified.");
            }
            return saved;
        } else {
            throw new RuntimeException("Unauthorized");
        }
    }

    @PutMapping("/{id}/reject")
    public Task rejectTask(@PathVariable Long id, @RequestBody String reason, Principal principal) {
        Task task = taskRepo.findById(id).orElseThrow();
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();

        if (user.getRole() == Role.MANAGER || user.getRole() == Role.ADMIN) {
            task.setStatus("REJECTED");
            task.setRejectionReason(reason);
            Task saved = taskRepo.save(task);
            if (saved.getAssignedBy() != null) {
                createNotification(saved.getAssignedBy(), "Task Rejected",
                        "Your request \"" + saved.getTitle() + "\" was rejected. Reason: " + reason);
            }
            return saved;
        } else {
            throw new RuntimeException("Unauthorized");
        }
    }

    @PutMapping("/{id}/claim")
    public Task claimTask(@PathVariable Long id, @RequestBody(required = false) Map<String, String> data,
            Principal principal) {
        Task task = taskRepo.findById(id).orElseThrow();
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();

        if (task.getAssignedTo() != null) {
            throw new RuntimeException("Task already assigned");
        }

        task.setAssignedTo(user);
        task.setAssignedAt(java.time.LocalDateTime.now());
        task.setStatus("PENDING");

        if (data != null && data.containsKey("toDoPlan")) {
            task.setToDoPlan(data.get("toDoPlan"));
        }

        Task saved = taskRepo.save(task);
        if (saved.getAssignedBy() != null) {
            createNotification(saved.getAssignedBy(), "Assigned to Agent",
                    "Field Agent " + user.getName() + " has accepted your mission: " + saved.getTitle());
        }
        return saved;
    }

    @PutMapping("/{id}/rerequest")
    public Task reRequestTask(@PathVariable Long id, Principal principal) {
        Task task = taskRepo.findById(id).orElseThrow();
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();

        // Only the requester or admin can re-request
        if ((task.getAssignedBy() != null && task.getAssignedBy().getId().equals(user.getId()))
                || user.getRole() == Role.ADMIN) {
            task.setStatus("PENDING");
            task.setCompletedAt(null);
            task.setFeedback(null);
            return taskRepo.save(task);
        } else {
            throw new RuntimeException("Unauthorized to re-request this task");
        }
    }

    @PutMapping("/{id}/reassign")
    public Task reassignTask(@PathVariable Long id, @RequestBody Long newAssigneeId, Principal principal) {
        User admin = userRepo.findByEmail(principal.getName()).orElseThrow();
        if (admin.getRole() != Role.ADMIN)
            throw new RuntimeException("Unauthorized");

        Task task = taskRepo.findById(id).orElseThrow();
        User assignee = userRepo.findById(newAssigneeId).orElseThrow();

        User oldAssignee = task.getAssignedTo();
        task.setAssignedTo(assignee);
        task.setStatus("PENDING");
        Task saved = taskRepo.save(task);

        AuditLog log = new AuditLog();
        log.setAction("REASSIGN_TASK");
        log.setPerformedBy(admin.getEmail());
        log.setDetails("Reassigned task '" + task.getTitle() + "' from "
                + (oldAssignee != null ? oldAssignee.getEmail() : "none") + " to " + assignee.getEmail());
        auditLogRepo.save(log);

        return saved;
    }

    @PutMapping("/{id}/resolve")
    public Task resolveTask(@PathVariable Long id, Principal principal) {
        User admin = userRepo.findByEmail(principal.getName()).orElseThrow();
        if (admin.getRole() != Role.ADMIN)
            throw new RuntimeException("Unauthorized");

        Task task = taskRepo.findById(id).orElseThrow();
        task.setStatus("COMPLETED");
        Task saved = taskRepo.save(task);

        AuditLog log = new AuditLog();
        log.setAction("RESOLVE_TASK");
        log.setPerformedBy(admin.getEmail());
        log.setDetails("Administratively resolved task '" + task.getTitle() + "'");
        auditLogRepo.save(log);

        return saved;
    }
}
