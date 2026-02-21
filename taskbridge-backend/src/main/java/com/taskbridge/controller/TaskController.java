package com.taskbridge.controller;

import java.security.Principal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
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

    @PutMapping("/{id}/quality-score")
    public org.springframework.http.ResponseEntity<?> setQualityScore(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body,
            Principal principal) {
        try {
            User manager = userRepo.findByEmail(principal.getName()).orElseThrow();
            if (manager.getRole() != Role.MANAGER && manager.getRole() != Role.ADMIN)
                return org.springframework.http.ResponseEntity.status(403).body("Unauthorized");

            Task task = taskRepo.findById(id).orElseThrow();
            int score = body.getOrDefault("score", 0);
            if (score < 1 || score > 5)
                return org.springframework.http.ResponseEntity.badRequest().body("Score must be between 1 and 5");

            task.setQualityScore(score);
            Task saved = taskRepo.save(task);

            if (saved.getAssignedBy() != null) {
                createNotification(saved.getAssignedBy(), "Quality Review",
                        "Your task \"" + saved.getTitle() + "\" received a quality score of " + score + "/5.");
            }
            return org.springframework.http.ResponseEntity.ok(saved);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/backup-assignee")
    public org.springframework.http.ResponseEntity<?> setBackupAssignee(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            Principal principal) {
        try {
            User manager = userRepo.findByEmail(principal.getName()).orElseThrow();
            if (manager.getRole() != Role.MANAGER && manager.getRole() != Role.ADMIN)
                return org.springframework.http.ResponseEntity.status(403).body("Unauthorized");

            Task task = taskRepo.findById(id).orElseThrow();
            Long backupId = body.get("backupUserId");
            if (backupId == null)
                return org.springframework.http.ResponseEntity.badRequest().body("backupUserId is required");

            User backup = userRepo.findById(backupId)
                    .orElseThrow(() -> new RuntimeException("Backup user not found"));
            task.setBackupAssignee(backup);
            Task saved = taskRepo.save(task);

            createNotification(backup, "Backup Assignment",
                    "You have been set as the backup assignee for task \"" + saved.getTitle() + "\".");
            return org.springframework.http.ResponseEntity.ok(saved);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/finance-stats")
    public org.springframework.http.ResponseEntity<?> getFinanceStats(Principal principal) {
        try {
            User manager = userRepo.findByEmail(principal.getName()).orElseThrow();

            // Get all tasks assigned TO this manager
            List<Task> myTasks = taskRepo.findByAssignedTo(manager);

            long completedCount = myTasks.stream().filter(t -> "COMPLETED".equals(t.getStatus())).count();
            long rejectedCount = myTasks.stream().filter(t -> "REJECTED".equals(t.getStatus())).count();

            // Earnings: $50 per completed task
            double totalEarnings = completedCount * 50.0;

            // Efficiency: completed / (completed + rejected) * 100, default 100 if no data
            double efficiency = 100.0;
            long denominator = completedCount + rejectedCount;
            if (denominator > 0) {
                efficiency = Math.round((completedCount * 100.0 / denominator) * 10.0) / 10.0;
            }

            // Avg completion time in hours (startedAt -> completedAt)
            List<Task> completedTasks = myTasks.stream()
                    .filter(t -> "COMPLETED".equals(t.getStatus())
                            && t.getStartedAt() != null
                            && t.getCompletedAt() != null)
                    .toList();

            double avgHours = 0.0;
            if (!completedTasks.isEmpty()) {
                double totalHours = completedTasks.stream()
                        .mapToDouble(t -> Duration.between(t.getStartedAt(), t.getCompletedAt()).toMinutes() / 60.0)
                        .sum();
                avgHours = Math.round((totalHours / completedTasks.size()) * 10.0) / 10.0;
            }

            // Heatmap: count of tasks completed per day-of-week (last 90 days)
            // Keys: MON, TUE, WED, THU, FRI, SAT, SUN
            Map<String, Integer> heatmap = new LinkedHashMap<>();
            String[] days = { "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN" };
            for (String d : days)
                heatmap.put(d, 0);

            LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
            myTasks.stream()
                    .filter(t -> "COMPLETED".equals(t.getStatus())
                            && t.getCompletedAt() != null
                            && t.getCompletedAt().isAfter(cutoff))
                    .forEach(t -> {
                        DayOfWeek dow = t.getCompletedAt().getDayOfWeek();
                        String key = switch (dow) {
                            case MONDAY -> "MON";
                            case TUESDAY -> "TUE";
                            case WEDNESDAY -> "WED";
                            case THURSDAY -> "THU";
                            case FRIDAY -> "FRI";
                            case SATURDAY -> "SAT";
                            case SUNDAY -> "SUN";
                        };
                        heatmap.merge(key, 1, Integer::sum);
                    });

            Map<String, Object> result = new HashMap<>();
            result.put("totalEarnings", totalEarnings);
            result.put("efficiency", efficiency);
            result.put("avgHours", avgHours);
            result.put("completedCount", completedCount);
            result.put("heatmap", heatmap);

            return org.springframework.http.ResponseEntity.ok(result);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
