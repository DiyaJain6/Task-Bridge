package com.taskbridge.service;

import org.springframework.stereotype.Service;

@Service
public class SupportAiService {

    public String generateResponse(String message) {
        if (message == null || message.trim().isEmpty()) {
            return "I'm here to help! Please type your question or issue.";
        }

        String lowerMsg = message.toLowerCase();

        if (lowerMsg.contains("hello") || lowerMsg.contains("hi") || lowerMsg.contains("hey")) {
            return "Hello! I'm the TaskBridge Support AI. How can I assist you with your missions today?";
        }

        if (lowerMsg.contains("password") || lowerMsg.contains("reset") || lowerMsg.contains("forgot")) {
            return "To reset your password, go to the Login page and click 'Forgot Password'. You'll receive a secure 6-digit CAPTCHA code directly on the screen to use for the reset. No email wait required!";
        }

        if (lowerMsg.contains("task") || lowerMsg.contains("mission") || lowerMsg.contains("create")) {
            return "You can create a new mission by clicking the 'My Requests' tab and filling out the 'Create New Request' form. Make sure to set a priority and a deadline!";
        }

        if (lowerMsg.contains("status") || lowerMsg.contains("progress") || lowerMsg.contains("track")) {
            return "You can track your mission progress in the 'Request History' section. Look for the live tracker bars: Pending (0%), In Progress (50%), and Verified (100%).";
        }

        if (lowerMsg.contains("who are you") || lowerMsg.contains("bot") || lowerMsg.contains("ai")) {
            return "I am the TaskBridge Intelligence Unit, designed to provide instant support for field operatives. I can help with account access, mission creation, and platform navigation.";
        }

        if (lowerMsg.contains("priority") || lowerMsg.contains("urgent")) {
            return "We offer four priority levels: Low, Medium, High, and Urgent. High priority tasks are prioritized by managers for faster assignment.";
        }

        return "I've logged your query about \"" + message
                + "\". While I'm looking into the specifics, you can check the 'My Requests' tab for quick actions or wait for a human manager to chime in. Ticket status: Processing.";
    }
}
