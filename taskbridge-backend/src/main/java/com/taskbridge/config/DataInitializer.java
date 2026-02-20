package com.taskbridge.config;

import com.taskbridge.entity.Role;
import com.taskbridge.entity.User;
import com.taskbridge.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Seed base users if they don't exist
            seedUserIfAbsent(userRepository, passwordEncoder, "admin@test.com", "System Admin", "password", Role.ADMIN);
            seedUserIfAbsent(userRepository, passwordEncoder, "manager@test.com", "Lead Manager", "password",
                    Role.MANAGER);
            seedUserIfAbsent(userRepository, passwordEncoder, "user@test.com", "Standard Employee", "password",
                    Role.USER);
        };
    }

    private void seedUserIfAbsent(UserRepository repo, PasswordEncoder encoder, String email, String name,
            String rawPassword, Role role) {
        if (repo.findByEmail(email).isEmpty()) {
            User user = new User();
            user.setName(name);
            user.setEmail(email);
            user.setPassword(encoder.encode(rawPassword));
            user.setRole(role);
            repo.save(user);
            System.out.println("Seeded User: " + email);
        } else {
            System.out.println("User already exists, skipping seed: " + email);
        }
    }
}
