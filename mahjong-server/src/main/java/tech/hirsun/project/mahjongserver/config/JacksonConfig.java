package tech.hirsun.project.mahjongserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * 全局 Jackson 配置类
 * 用于配置 ObjectMapper，确保正确处理 Java 8 的日期/时间类型
 */
@Configuration
public class JacksonConfig {

    /**
     * 创建一个全局的 ObjectMapper Bean
     * 注册 JavaTimeModule 以支持 Java 8 的日期/时间类型
     */
    @Bean
    @Primary
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper objectMapper = builder.createXmlMapper(false).build();
        objectMapper.registerModule(new JavaTimeModule());
        return objectMapper;
    }
} 