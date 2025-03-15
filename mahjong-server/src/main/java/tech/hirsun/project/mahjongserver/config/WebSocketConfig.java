package tech.hirsun.project.mahjongserver.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import tech.hirsun.project.mahjongserver.controller.WebSocketController;
import tech.hirsun.project.mahjongserver.handler.WebSocketHandshakeInterceptor;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Value("${websocket.endpoint}")
    private String websocketEndpoint;

    @Autowired
    private WebSocketController webSocketController;

    @Autowired
    private WebSocketHandshakeInterceptor handshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketController, websocketEndpoint)
                .addInterceptors(handshakeInterceptor)
                .withSockJS();  // 添加SockJS支持，提高兼容性
    }
} 