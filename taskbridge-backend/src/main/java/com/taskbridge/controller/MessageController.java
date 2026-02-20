package com.taskbridge.controller;

import com.taskbridge.entity.ChatMessage;
import com.taskbridge.entity.User;
import com.taskbridge.entity.Notification;
import com.taskbridge.repository.ChatMessageRepository;
import com.taskbridge.repository.UserRepository;
import com.taskbridge.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.taskbridge.service.SupportAiService;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/messages")
public class MessageController {

    @Autowired
    private ChatMessageRepository messageRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private NotificationRepository notificationRepo;

    @Autowired
    private SupportAiService supportAiService;

    private void createNotification(User user, String title, String message) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notificationRepo.save(notification);
    }

    @GetMapping
    public List<ChatMessage> getMessages(Principal principal) {
        User user = userRepo.findByEmail(principal.getName()).orElseThrow();
        return messageRepo.findBySenderOrReceiverOrderByTimestampAsc(user, user);
    }

    @PostMapping
    public ChatMessage sendMessage(@RequestBody ChatMessage message, Principal principal) {
        User sender = userRepo.findByEmail(principal.getName()).orElseThrow();
        message.setSender(sender);
        message.setType("sent");
        ChatMessage saved = messageRepo.save(message);

        // AI Bot Reply
        ChatMessage botReply = new ChatMessage();
        String botContent = supportAiService.generateResponse(message.getContent());
        botReply.setContent(botContent);
        botReply.setReceiver(sender);
        botReply.setType("received");
        messageRepo.save(botReply);

        createNotification(sender, "New Support Message", "The Support Bot has replied to your query.");

        return saved;
    }
}
