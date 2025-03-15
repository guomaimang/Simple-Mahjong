package tech.hirsun.project.mahjongserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // 允许携带cookies等认证信息
        config.setAllowCredentials(true);
        
        // 允许的来源
        config.addAllowedOrigin("http://localhost:5173");
        
        // 允许的HTTP方法
        config.addAllowedMethod("*");
        
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