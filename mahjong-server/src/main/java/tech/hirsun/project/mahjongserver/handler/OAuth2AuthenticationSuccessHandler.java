package tech.hirsun.project.mahjongserver.handler;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tech.hirsun.project.mahjongserver.model.User;
import tech.hirsun.project.mahjongserver.service.AuthService;
import tech.hirsun.project.mahjongserver.util.JwtUtil;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthService authService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) 
            throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        
        // 打印所有属性以便调试
        System.out.println("=== GitHub OAuth2 响应属性 ===");
        oAuth2User.getAttributes().forEach((key, value) -> 
            System.out.println(key + ": " + (value == null ? "null" : value.toString()))
        );
        
        String email = oAuth2User.getAttribute("email");
        System.out.println("直接获取的email属性: " + email);
        
        // 尝试获取私有邮箱信息
        // 首先从不同可能的属性名称获取邮箱
        if (email == null) {
            email = oAuth2User.getAttribute("private_email");
            System.out.println("尝试获取private_email: " + email);
        }
        
        // 如果GitHub没有返回email，尝试从其他属性获取
        if (email == null) {
            // 从GitHub返回的Map属性中获取邮箱列表
            Object emails = oAuth2User.getAttribute("emails");
            System.out.println("emails属性: " + (emails == null ? "null" : emails.toString()));
            
            if (emails instanceof Iterable) {
                for (Object emailObj : (Iterable<?>) emails) {
                    System.out.println("邮箱对象: " + emailObj);
                    if (emailObj instanceof java.util.Map) {
                        java.util.Map<?, ?> emailMap = (java.util.Map<?, ?>) emailObj;
                        System.out.println("邮箱Map: " + emailMap);
                        if (Boolean.TRUE.equals(emailMap.get("primary")) && emailMap.get("email") instanceof String) {
                            email = (String) emailMap.get("email");
                            System.out.println("从emails列表找到主邮箱: " + email);
                            break;
                        }
                    }
                }
            }
        }
        
        if (email == null) {
            // 如果仍然获取不到邮箱，使用login作为唯一标识
            String login = oAuth2User.getAttribute("login");
            System.out.println("未能获取邮箱，使用登录名: " + login);
            if (login != null) {
                email = login + "@github.com";
                System.out.println("生成临时邮箱: " + email);
            }
        }

        // 使用邮箱创建或获取用户
        User user = authService.getUserByEmail(email);
        if (user == null) {
            // 如果用户不存在，创建新用户
            String token = authService.login(email);
            user = authService.getUserFromToken(token);
        }

        // 生成JWT token
        String token = jwtUtil.generateToken(email);

        // 构建重定向URL（将token作为查询参数附加到前端URL上）
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                .queryParam("token", token)
                .build().toUriString();

        // 设置重定向URL
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
} 