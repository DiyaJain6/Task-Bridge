package com.taskbridge.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.taskbridge.entity.Task;
import com.taskbridge.entity.User;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignedTo(User user);

    List<Task> findByAssignedBy(User user);

    List<Task> findByAssignedToIsNull();
}
