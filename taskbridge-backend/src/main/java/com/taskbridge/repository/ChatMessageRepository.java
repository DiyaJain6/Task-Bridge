package com.taskbridge.repository;

import com.taskbridge.entity.ChatMessage;
import com.taskbridge.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySenderOrReceiverOrderByTimestampAsc(User sender, User receiver);
}
