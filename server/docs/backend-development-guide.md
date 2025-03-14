# 麻将对战系统 - 后端开发指南

## 1. 系统架构

### 1.1 技术栈
- **框架**: Spring Boot
- **通信**: WebSocket + HTTP REST API
- **认证**: JWT (JSON Web Token)
- **数据存储**: 内存存储 (无数据库)

### 1.2 项目结构
```
tech.hirsun.mahjong/
├── MahjongApplication.java        # 应用程序入口
├── config/                        # 配置类
│   ├── WebSocketConfig.java       # WebSocket配置
│   ├── SecurityConfig.java        # 安全配置
│   └── SchedulingConfig.java      # 定时任务配置
├── controller/                    # 控制器
│   ├── AuthController.java        # 认证控制器
│   ├── RoomController.java        # 房间管理控制器
│   └── WebSocketController.java   # WebSocket控制器
├── model/                         # 数据模型
│   ├── User.java                  # 用户模型
│   ├── Room.java                  # 房间模型
│   ├── Game.java                  # 游戏模型
│   ├── Tile.java                  # 麻将牌模型
│   └── GameAction.java            # 游戏操作模型
├── service/                       # 服务层
│   ├── AuthService.java           # 认证服务
│   ├── RoomService.java           # 房间管理服务
│   ├── GameService.java           # 游戏服务
│   └── CleanupService.java        # 清理服务(定时任务)
├── repository/                    # 数据存储层
│   ├── UserRepository.java        # 用户存储
│   └── RoomRepository.java        # 房间存储
├── util/                          # 工具类
│   ├── JwtUtil.java               # JWT工具
│   └── TileUtil.java              # 麻将牌工具
└── exception/                     # 异常处理
    ├── GlobalExceptionHandler.java # 全局异常处理
    └── CustomExceptions.java      # 自定义异常
```

## 2. 数据模型设计

### 2.1 用户模型 (User)
```java
public class User {
    private String email;          // 用户邮箱，作为唯一标识
    private String nickname;       // 用户昵称，默认为邮箱@前的部分
    private String token;          // JWT令牌
    private Date lastActive;       // 最后活跃时间
    // 构造函数、getter和setter方法
}
```

### 2.2 房间模型 (Room)
```java
public class Room {
    private int roomId;            // 房间号(1-999)
    private String password;       // 房间密码(4位数字)
    private User creator;          // 房间创建者
    private List<User> players;    // 房间内的玩家
    private Date createdTime;      // 创建时间
    private Date expiryTime;       // 过期时间(创建后24小时)
    private Game currentGame;      // 当前游戏
    private boolean gameInProgress; // 游戏是否进行中
    // 构造函数、getter和setter方法
}
```

### 2.3 游戏模型 (Game)
```java
public class Game {
    private Room room;             // 所属房间
    private List<User> players;    // 参与游戏的玩家
    private Map<User, List<Tile>> playerTiles; // 玩家手牌
    private List<Tile> discardedTiles; // 已打出的牌
    private List<Tile> remainingTiles; // 牌库中剩余的牌
    private User dealer;           // 庄家
    private User winner;           // 获胜者
    private List<GameAction> actions; // 游戏操作记录
    private GameStatus status;     // 游戏状态(准备中、进行中、已结束)
    // 构造函数、getter和setter方法
}
```

### 2.4 麻将牌模型 (Tile)
```java
public class Tile {
    private TileType type;         // 牌类型(万子、筒子、条子、风牌、箭牌)
    private int value;             // 牌值(1-9或东南西北中发白)
    private boolean revealed;      // 是否明牌
    // 构造函数、getter和setter方法
}

public enum TileType {
    WAN,    // 万子
    TONG,   // 筒子
    TIAO,   // 条子
    FENG,   // 风牌(东南西北)
    JIAN    // 箭牌(中发白)
}
```

### 2.5 游戏操作模型 (GameAction)
```java
public class GameAction {
    private User player;           // 执行操作的玩家
    private ActionType type;       // 操作类型
    private List<Tile> tiles;      // 相关的牌
    private Date timestamp;        // 操作时间戳
    // 构造函数、getter和setter方法
}

public enum ActionType {
    DRAW,           // 抽牌
    DISCARD,        // 打出牌
    TAKE,           // 拿取牌
    REVEAL,         // 明牌
    DECLARE_WIN,    // 宣布胜利
    CONFIRM_WIN,    // 确认胜利
    REJECT_WIN      // 拒绝胜利宣言
}
```

## 3. API设计

### 3.1 HTTP REST API

#### 3.1.1 认证API
- **登录/注册**
  - 路径: `/api/auth/login`
  - 方法: POST
  - 请求体: `{ "email": "user@example.com" }`
  - 响应: `{ "token": "jwt_token", "user": { "email": "user@example.com", "nickname": "user" } }`

- **更新昵称**
  - 路径: `/api/auth/nickname`
  - 方法: PUT
  - 请求头: `Authorization: Bearer jwt_token`
  - 请求体: `{ "nickname": "新昵称" }`
  - 响应: `{ "email": "user@example.com", "nickname": "新昵称" }`

#### 3.1.2 房间管理API
- **创建房间**
  - 路径: `/api/rooms`
  - 方法: POST
  - 请求头: `Authorization: Bearer jwt_token`
  - 响应: `{ "roomId": 123, "password": "1234", "creator": {...}, "players": [...], "expiryTime": "..." }`

- **获取房间列表**
  - 路径: `/api/rooms`
  - 方法: GET
  - 请求头: `Authorization: Bearer jwt_token`
  - 响应: `[ { "roomId": 123, "creator": {...}, "playerCount": 2, "gameInProgress": false }, ... ]`

- **加入房间**
  - 路径: `/api/rooms/{roomId}/join`
  - 方法: POST
  - 请求头: `Authorization: Bearer jwt_token`
  - 请求体: `{ "password": "1234" }`
  - 响应: `{ "roomId": 123, "creator": {...}, "players": [...], "expiryTime": "..." }`

- **获取房间详情**
  - 路径: `/api/rooms/{roomId}`
  - 方法: GET
  - 请求头: `Authorization: Bearer jwt_token`
  - 响应: `{ "roomId": 123, "creator": {...}, "players": [...], "expiryTime": "...", "gameInProgress": false }`

### 3.2 WebSocket API

#### 3.2.1 连接
- 连接URL: `/ws/mahjong?token=jwt_token`

#### 3.2.2 消息类型
所有WebSocket消息都使用JSON格式，包含`type`字段指定消息类型。

1. **房间消息**
   - `ROOM_JOIN`: 玩家加入房间
   - `ROOM_LEAVE`: 玩家离开房间
   - `ROOM_UPDATE`: 房间信息更新
   - `ROOM_EXPIRE`: 房间过期通知

2. **游戏消息**
   - `GAME_START`: 游戏开始
   - `GAME_END`: 游戏结束
   - `GAME_ACTION`: 游戏操作
   - `GAME_STATE`: 游戏状态更新

#### 3.2.3 消息格式示例

- **游戏开始消息**
```json
{
  "type": "GAME_START",
  "data": {
    "roomId": 123,
    "players": [
      {"email": "user1@example.com", "nickname": "user1", "position": 1},
      {"email": "user2@example.com", "nickname": "user2", "position": 2},
      {"email": "user3@example.com", "nickname": "user3", "position": 3},
      {"email": "user4@example.com", "nickname": "user4", "position": 4}
    ],
    "dealer": {"email": "user1@example.com", "nickname": "user1"},
    "tiles": ["1万", "2万", "3万", ...],  // 只发送给对应玩家
    "remainingTileCount": 84
  }
}
```

- **游戏操作消息**
```json
{
  "type": "GAME_ACTION",
  "data": {
    "roomId": 123,
    "player": {"email": "user1@example.com", "nickname": "user1"},
    "action": "DISCARD",
    "tiles": ["1万"],
    "timestamp": "2023-03-14T12:34:56Z"
  }
}
```

- **游戏状态更新消息**
```json
{
  "type": "GAME_STATE",
  "data": {
    "roomId": 123,
    "discardedTiles": ["1万", "2筒", "3条", ...],
    "remainingTileCount": 70,
    "playerTiles": {  // 只发送给对应玩家
      "user1@example.com": ["1万", "2万", "3万", ...],
    },
    "revealedTiles": {
      "user2@example.com": ["1筒", "1筒", "1筒"]
    },
    "recentActions": [
      {"player": "user1", "action": "DISCARD", "tiles": ["1万"]},
      {"player": "user2", "action": "DRAW", "tiles": []}
    ]
  }
}
```

## 4. 服务层实现

### 4.1 认证服务 (AuthService)
- 用户登录/注册
- JWT令牌生成与验证
- 用户昵称管理

### 4.2 房间服务 (RoomService)
- 房间创建与管理
- 房间号和密码生成
- 玩家加入/离开房间
- 房间信息查询

### 4.3 游戏服务 (GameService)
- 游戏初始化
- 牌组生成与洗牌
- 处理游戏操作
- 胜利确认流程
- 游戏状态更新

### 4.4 清理服务 (CleanupService)
- 定时检查房间过期
- 清理过期房间
- 通知房间内玩家房间即将过期

## 5. 定时任务

### 5.1 房间清理任务
- 每小时执行一次
- 检查所有房间的创建时间
- 删除创建时间超过24小时的房间
- 对于创建时间超过12小时但未到24小时的房间，发送即将过期通知

```java
@Scheduled(fixedRate = 3600000) // 每小时执行一次
public void cleanupRooms() {
    Date now = new Date();
    List<Room> rooms = roomRepository.getAllRooms();
    
    for (Room room : rooms) {
        // 检查是否过期(24小时)
        if (now.getTime() - room.getCreatedTime().getTime() > 24 * 60 * 60 * 1000) {
            // 通知房间内所有玩家
            notifyRoomExpired(room);
            // 删除房间
            roomRepository.deleteRoom(room.getRoomId());
        }
        // 检查是否即将过期(12小时)
        else if (now.getTime() - room.getCreatedTime().getTime() > 12 * 60 * 60 * 1000) {
            // 通知房间内所有玩家
            notifyRoomExpiringSoon(room);
        }
    }
}
```

## 6. 安全考虑

### 6.1 JWT认证
- 使用密钥签名JWT令牌
- 设置合理的令牌过期时间
- 验证所有API请求的令牌有效性

### 6.2 WebSocket安全
- 通过URL参数传递JWT令牌进行认证
- 验证WebSocket连接的用户身份
- 确保用户只能访问自己有权限的房间和游戏数据

### 6.3 输入验证
- 验证所有API请求的输入参数
- 防止恶意输入和注入攻击

## 7. 错误处理

### 7.1 全局异常处理
- 实现全局异常处理器捕获所有未处理的异常
- 返回统一格式的错误响应

### 7.2 自定义异常
- 定义业务逻辑相关的自定义异常
- 为不同类型的错误提供明确的错误消息

## 8. 测试策略

### 8.1 单元测试
- 测试各个服务层的核心功能
- 使用模拟对象隔离依赖

### 8.2 集成测试
- 测试API端点的功能
- 测试WebSocket通信

### 8.3 负载测试
- 测试系统在多用户同时在线时的性能
- 确保内存使用在可接受范围内

## 9. 部署考虑

### 9.1 内存管理
- 由于所有数据都存储在内存中，需要监控内存使用情况
- 实现数据清理策略，避免内存泄漏

### 9.2 日志记录
- 记录关键操作和错误
- 实现适当的日志级别配置

### 9.3 性能优化
- 优化WebSocket消息处理
- 减少不必要的对象创建 

上述文档仅供参考，如果必要可以适当修改。