package tech.hirsun.mahjong.service;

import org.springframework.stereotype.Service;

import tech.hirsun.mahjong.model.User;
import tech.hirsun.mahjong.repository.UserRepository;
import tech.hirsun.mahjong.util.JwtUtil;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    /**
     * 根据邮箱查找用户
     * @param email 用户邮箱
     * @return 用户对象
     */
    public User findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * 用户登录或注册
     * @param email 用户邮箱
     * @return 用户对象
     */
    public User loginOrRegister(String email) {
        User user = userRepository.findByEmail(email);
        
        if (user == null) {
            // 新用户注册
            user = new User(email);
        }
        
        // 生成JWT令牌
        String token = jwtUtil.generateToken(email);
        user.setToken(token);
        user.updateLastActive();
        
        // 保存用户
        return userRepository.save(user);
    }

    /**
     * 更新用户昵称
     * @param email 用户邮箱
     * @param nickname 新昵称
     * @return 更新后的用户对象
     */
    public User updateNickname(String email, String nickname) {
        User user = userRepository.findByEmail(email);
        
        if (user != null) {
            user.setNickname(nickname);
            user.updateLastActive();
            return userRepository.save(user);
        }
        
        return null;
    }

    /**
     * 根据令牌获取用户
     * @param token JWT令牌
     * @return 用户对象
     */
    public User getUserByToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        try {
            String email = jwtUtil.extractEmail(token);
            if (email != null && !jwtUtil.isTokenExpired(token)) {
                return userRepository.findByEmail(email);
            }
        } catch (Exception e) {
            // 令牌无效
        }
        
        return null;
    }
} 