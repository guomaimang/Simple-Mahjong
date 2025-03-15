package tech.hirsun.mahjong.model;

public enum ActionType {
    DRAW,           // 抽牌
    DISCARD,        // 打出牌
    TAKE,           // 拿取牌
    REVEAL,         // 明牌
    DECLARE_WIN,    // 宣布胜利
    CONFIRM_WIN,    // 确认胜利
    REJECT_WIN      // 拒绝胜利宣言
} 