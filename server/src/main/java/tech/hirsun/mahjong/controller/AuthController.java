package tech.hirsun.mahjong.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import tech.hirsun.mahjong.model.User;
import tech.hirsun.mahjong.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * 用户登录/注册
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(createErrorResponse("邮箱不能为空"));
        }
        
        User user = authService.loginOrRegister(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("token", user.getToken());
        response.put("user", createUserResponse(user));
        
        return ResponseEntity.ok(response);
    }

    /**
     * 更新用户昵称
     */
    @PutMapping("/nickname")
    public ResponseEntity<?> updateNickname(@RequestBody Map<String, String> request,
                                           @RequestHeader("Authorization") String token) {
        String nickname = request.get("nickname");
        
        if (nickname == null || nickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(createErrorResponse("昵称不能为空"));
        }
        
        User user = authService.getUserByToken(token);
        
        if (user == null) {
            return ResponseEntity.status(401).body(createErrorResponse("无效的令牌"));
        }
        
        user = authService.updateNickname(user.getEmail(), nickname);
        
        return ResponseEntity.ok(createUserResponse(user));
    }

    /**
     * 创建用户响应数据
     */
    private Map<String, String> createUserResponse(User user) {
        Map<String, String> userResponse = new HashMap<>();
        userResponse.put("email", user.getEmail());
        userResponse.put("nickname", user.getNickname());
        return userResponse;
    }

    /**
     * 创建错误响应数据
     */
    private Map<String, String> createErrorResponse(String message) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", message);
        return errorResponse;
    }
} 