package tech.hirsun.project.mahjongserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // 允许携带cookies等认证信息
        config.setAllowCredentials(true);
        
        // 允许的来源
        config.addAllowedOrigin(frontendUrl);
        
        // 允许的HTTP方法，明确包含OPTIONS预检请求
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("DELETE");
        config.addAllowedMethod("OPTIONS");
        
        // 允许的头信息
        config.addAllowedHeader("*");
        
        // 暴露的头信息
        config.addExposedHeader("*");
        
        // 缓存时间
        config.setMaxAge(3600L);
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
} 