package tech.hirsun.project.mahjongserver.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import tech.hirsun.project.mahjongserver.model.User;
import tech.hirsun.project.mahjongserver.repository.UserRepository;
import tech.hirsun.project.mahjongserver.util.JwtUtil;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Login a user with email only (no password required)
     * @param email User's email
     * @return JWT token
     */
    public String login(String email) {
        // Create or update user
        User user = userRepository.findByEmail(email);
        if (user == null) {
            user = new User(email);
            userRepository.save(user);
        }
        
        // Generate JWT token
        return jwtUtil.generateToken(email);
    }

    /**
     * Get user by email
     * @param email User's email
     * @return User or null if not found
     */
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Validate a token
     * @param token JWT token
     * @return true if valid, false if invalid
     */
    public boolean validateToken(String token) {
        try {
            return jwtUtil.validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Get user from token
     * @param token JWT token
     * @return User object if valid, null if invalid
     */
    public User getUserFromToken(String token) {
        try {
            String email = jwtUtil.extractEmail(token);
            if (email != null) {
                User user = userRepository.findByEmail(email);
                if (user == null) {
                    user = new User(email);
                    userRepository.save(user);
                }
                return user;
            }
        } catch (Exception e) {
            // Invalid token
        }
        return null;
    }

    /**
     * Update user's nickname
     * @param email User's email
     * @param nickname New nickname
     * @return Updated user
     */
    public User updateNickname(String email, String nickname) {
        User user = userRepository.findByEmail(email);
        if (user != null) {
            user.setNickname(nickname);
            userRepository.save(user);
        } else {
            user = new User(email, nickname);
            userRepository.save(user);
        }
        return user;
    }
} 