package tech.hirsun.project.mahjongserver.handler;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import tech.hirsun.project.mahjongserver.util.JwtUtil;

@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, 
                                  WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        // Get JWT token from URL parameter
        String query = request.getURI().getQuery();
        String token = UriComponentsBuilder.newInstance().query(query).build().getQueryParams().getFirst("token");

        if (token == null || token.trim().isEmpty()) {
            return false;
        }

        try {
            // Validate JWT token
            String email = jwtUtil.extractEmail(token);
            if (email != null && jwtUtil.validateToken(token)) {
                // Store user email in attributes
                attributes.put("userEmail", email);
                return true;
            }
        } catch (Exception e) {
            // Log exception (token validation failed)
            return false;
        }

        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, 
                              WebSocketHandler wsHandler, Exception exception) {
        // Nothing to do after handshake
    }
} 