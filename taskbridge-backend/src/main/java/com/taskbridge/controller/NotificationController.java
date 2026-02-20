package com.taskbridge.controller;

import com.taskbridge.entity.Notification;
import com.taskbridge.entity.User;
import com.taskbridge.repository.NotificationRepository;
import com.taskbridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepo;

    @Autowired
    private UserRepository userRepo;

    @GetMapping
    public List<Notification> getNotifications(Principal principal) {
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();
        return notificationRepo.findByUserOrderByTimestampDesc(user);
    }

    @GetMapping("/unread-count")
    public long getUnreadCount(Principal principal) {
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();
        return notificationRepo.countByUserAndIsRead(user, false);
    }

    @PutMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepo.findById(id).orElseThrow();
        notification.setRead(true); // Lombok handles boolean isRead with setRead
        notificationRepo.save(notification);
    }
}
