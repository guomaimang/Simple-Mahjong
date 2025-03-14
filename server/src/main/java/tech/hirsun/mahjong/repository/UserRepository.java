package tech.hirsun.mahjong.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

import tech.hirsun.mahjong.model.User;

@Repository
public class UserRepository {
    // 使用ConcurrentHashMap保证线程安全
    private final Map<String, User> users = new ConcurrentHashMap<>();

    public User findByEmail(String email) {
        return users.get(email);
    }

    public User save(User user) {
        users.put(user.getEmail(), user);
        return user;
    }

    public void delete(String email) {
        users.remove(email);
    }

    public List<User> findAll() {
        return new ArrayList<>(users.values());
    }

    public boolean existsByEmail(String email) {
        return users.containsKey(email);
    }

    public User findByToken(String token) {
        for (User user : users.values()) {
            if (token.equals(user.getToken())) {
                return user;
            }
        }
        return null;
    }
} 