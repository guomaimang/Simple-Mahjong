package tech.hirsun.project.mahjongserver.repository;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

import tech.hirsun.project.mahjongserver.model.User;

@Repository
public class UserRepository {
    // Store users by email
    private final Map<String, User> userMap = new ConcurrentHashMap<>();

    /**
     * Save or update a user
     * @param user The user to save
     * @return The saved user
     */
    public User save(User user) {
        if (user != null && user.getEmail() != null) {
            userMap.put(user.getEmail(), user);
        }
        return user;
    }

    /**
     * Find a user by email
     * @param email The email to search for
     * @return The user if found, null otherwise
     */
    public User findByEmail(String email) {
        return userMap.get(email);
    }

    /**
     * Check if a user exists
     * @param email The email to check
     * @return true if the user exists, false otherwise
     */
    public boolean existsByEmail(String email) {
        return userMap.containsKey(email);
    }

    /**
     * Get all users
     * @return Collection of all users
     */
    public Collection<User> findAll() {
        return userMap.values();
    }

    /**
     * Delete a user by email
     * @param email The email of the user to delete
     */
    public void deleteByEmail(String email) {
        userMap.remove(email);
    }

    /**
     * Clear all users
     */
    public void clear() {
        userMap.clear();
    }
} 