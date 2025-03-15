package tech.hirsun.project.mahjongserver.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.Data;
import tech.hirsun.project.mahjongserver.model.User;
import tech.hirsun.project.mahjongserver.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;
    
    @Autowired
    private ClientRegistrationRepository clientRegistrationRepository;
    
    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;
    
    @Value("${server.url:http://localhost:8080}")
    private String serverUrl;

    /**
     * GitHub 登录URL获取端点
     * @return GitHub 授权URL
     */
    @GetMapping("/github-login-url")
    public ResponseEntity<Map<String, String>> getGithubLoginUrl() {
        ClientRegistration githubRegistration = clientRegistrationRepository.findByRegistrationId("github");
        
        if (githubRegistration == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "GitHub OAuth configuration not found"));
        }
        
        // 获取完整的后端服务器URL
        String authorizationRequestBaseUri = "/oauth2/authorization";
        String githubLoginUrl = serverUrl + authorizationRequestBaseUri + "/github";
        
        return ResponseEntity.ok(Map.of("url", githubLoginUrl));
    }

    /**
     * Update nickname endpoint
     * @param request Nickname update request
     * @param token JWT token
     * @return Updated user
     */
    @PostMapping("/nickname")
    public ResponseEntity<Map<String, Object>> updateNickname(@RequestBody NicknameRequest request, 
                                                             @RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        String jwtToken = token.substring(7);
        if (!authService.validateToken(jwtToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        User user = authService.getUserFromToken(jwtToken);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
        }
        
        if (request.getNickname() == null || request.getNickname().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nickname is required"));
        }
        
        User updatedUser = authService.updateNickname(user.getEmail(), request.getNickname());
        
        return ResponseEntity.ok(Map.of("user", updatedUser));
    }

    /**
     * Validate token endpoint
     * @param token JWT token
     * @return User information if token is valid
     */
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        String jwtToken = token.substring(7);
        if (!authService.validateToken(jwtToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        User user = authService.getUserFromToken(jwtToken);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
        }
        
        return ResponseEntity.ok(Map.of("user", user));
    }

    // Request classes
    @Data
    public static class NicknameRequest {
        private String nickname;
    }
} 