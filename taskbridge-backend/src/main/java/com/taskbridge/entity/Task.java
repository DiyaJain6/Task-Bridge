package com.taskbridge.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;

    @Enumerated(EnumType.STRING)
    private TaskPriority priority;

    @Enumerated(EnumType.STRING)
    private TaskCategory category;

    private String deadline;
    private String feedback;
    private String rejectionReason;
    private String toDoPlan;
    private String completionProof;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime assignedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    @ManyToOne
    private User assignedTo;

    @ManyToOne
    private User assignedBy;

    @ManyToOne
    private User backupAssignee;

    private Integer qualityScore;

    private String status = "PENDING";

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
