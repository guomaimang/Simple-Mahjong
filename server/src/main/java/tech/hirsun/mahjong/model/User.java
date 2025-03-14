package tech.hirsun.mahjong.model;

import java.util.Date;
import java.util.Objects;

public class User {
    private String email;          // 用户邮箱，作为唯一标识
    private String nickname;       // 用户昵称，默认为邮箱@前的部分
    private String token;          // JWT令牌
    private Date lastActive;       // 最后活跃时间

    public User() {
    }

    public User(String email) {
        this.email = email;
        this.nickname = email.split("@")[0];
        this.lastActive = new Date();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Date getLastActive() {
        return lastActive;
    }

    public void setLastActive(Date lastActive) {
        this.lastActive = lastActive;
    }

    public void updateLastActive() {
        this.lastActive = new Date();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(email, user.email);
    }

    @Override
    public int hashCode() {
        return Objects.hash(email);
    }
} 