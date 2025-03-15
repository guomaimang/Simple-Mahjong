package tech.hirsun.project.mahjongserver.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class User {
    private String email;
    private String nickname;

    public User(String email) {
        this.email = email;
        this.nickname = generateDefaultNickname(email);
    }

    public User(String email, String nickname) {
        this.email = email;
        this.nickname = nickname != null && !nickname.isEmpty() ? nickname : generateDefaultNickname(email);
    }

    private String generateDefaultNickname(String email) {
        // Default nickname is the part before @ in email
        if (email != null && email.contains("@")) {
            return email.substring(0, email.indexOf('@'));
        }
        return email;
    }
} 