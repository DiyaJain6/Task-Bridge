package com.taskbridge.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.taskbridge.entity.User;
import com.taskbridge.repository.UserRepository;
import com.taskbridge.security.JwtResponse;
import com.taskbridge.security.JwtUtil;
import com.taskbridge.security.LoginRequest;

@RestController
@RequestMapping("/auth")
@CrossOrigin
public class AuthController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public String register(@RequestBody User user) {
        String normalizedEmail = user.getEmail() != null ? user.getEmail().trim().toLowerCase() : "";
        System.out.println("REGISTER REQUEST: " + normalizedEmail + " | Role: " + user.getRole());
        user.setEmail(normalizedEmail);
        user.setPassword(encoder.encode(user.getPassword()));
        userRepo.save(user);
        return "User Registered Successfully";
    }

    @PostMapping("/login")
    public org.springframework.http.ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        System.out.println("LOGIN REQUEST: " + email);

        // Fetch all users and find matching email case-insensitively
        java.util.Optional<User> userOpt = userRepo.findAll().stream()
                .filter(u -> u.getEmail().trim().equalsIgnoreCase(email))
                .findFirst();

        if (userOpt.isEmpty()) {
            return org.springframework.http.ResponseEntity.status(401).body("User not found");
        }

        User user = userOpt.get();

        if (!encoder.matches(request.getPassword(), user.getPassword())) {
            return org.springframework.http.ResponseEntity.status(401).body("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        String role = user.getRole() != null ? user.getRole().name() : "USER";
        return org.springframework.http.ResponseEntity.ok(new JwtResponse(token, role));
    }

    @PostMapping("/forgot-password")
    public org.springframework.http.ResponseEntity<?> forgotPassword(
            @RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        if (email.isEmpty()) {
            return org.springframework.http.ResponseEntity.badRequest().body("Email cannot be empty");
        }

        // Find user with high tolerance for whitespace and casing
        java.util.Optional<User> userOpt = userRepo.findByEmailIgnoreCase(email);

        if (userOpt.isEmpty()) {
            return org.springframework.http.ResponseEntity.status(404).body("User not found with email: " + email);
        }

        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        User user = userOpt.get();
        user.setOtp(otp);
        user.setOtpExpiry(java.time.LocalDateTime.now().plusMinutes(15));
        userRepo.save(user);

        return org.springframework.http.ResponseEntity
                .ok(java.util.Map.of(
                        "message", "Captcha code generated! Please use the code below to reset your password.",
                        "code", otp));
    }

    // Helper classes
    public static class ForgotPasswordRequest {
        private String email;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }

    @PostMapping("/reset-password")
    public org.springframework.http.ResponseEntity<?> resetPassword(
            @RequestBody java.util.Map<String, String> request) {
        String email = request.get("email") != null ? request.get("email").trim().toLowerCase() : "";
        String newPassword = request.get("password");
        String otp = request.get("otp");

        if (email.isEmpty() || newPassword == null || newPassword.isEmpty() || otp == null) {
            return org.springframework.http.ResponseEntity.badRequest()
                    .body("Email, OTP, and new password are required");
        }

        java.util.Optional<User> userOpt = userRepo.findAll().stream()
                .filter(u -> u.getEmail().trim().equalsIgnoreCase(email))
                .findFirst();

        if (userOpt.isEmpty()) {
            return org.springframework.http.ResponseEntity.status(404).body("User not found");
        }

        User user = userOpt.get();

        // Verify OTP
        if (user.getOtp() == null || !user.getOtp().equals(otp)) {
            return org.springframework.http.ResponseEntity.status(401).body("Invalid OTP");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            return org.springframework.http.ResponseEntity.status(401).body("OTP has expired");
        }

        user.setPassword(encoder.encode(newPassword));
        user.setOtp(null); // Clear OTP after use
        user.setOtpExpiry(null);
        userRepo.save(user);

        return org.springframework.http.ResponseEntity.ok("Password reset successfully!");
    }
}
