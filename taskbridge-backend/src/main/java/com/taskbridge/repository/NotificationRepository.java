package com.taskbridge.repository;

import com.taskbridge.entity.Notification;
import com.taskbridge.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByTimestampDesc(User user);

    long countByUserAndIsRead(User user, boolean isRead);
}
