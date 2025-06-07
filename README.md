# Simple-Mahjong

一个基于内存的 Web 麻将对战系统，允许用户创建房间、加入房间并进行麻将游戏。

![版本](https://img.shields.io/badge/版本-0.1.0-blue)
![协议](https://img.shields.io/badge/协议-GPL--3.0-green)

## 项目概述

Simple-Mahjong是一个简单的麻将对战平台，专注于提供基本的牌操作功能，由玩家自行判断胜负。系统不内置完整的麻将规则，给玩家提供了更多的自由度。

![cover](https://github.com/guomaimang/Simple-Mahjong/blob/main/cover.png)

主要特点：
- 简单的房间创建和管理系统
- 基于WebSocket的实时通信
- 完全内存存储，无数据库依赖
- 支持2-4人游戏模式
- 支持断线重连
- 支持自定义牌组操作

## 技术栈

### 前端
- React
- JavaScript
- Zustand (状态管理)
- React Router
- WebSocket

### 后端
- Spring Boot
- Spring Security
- JWT认证
- WebSocket

## 安装说明

### 前置条件
- Node.js 18+
- Java 17+
- Maven 3.6+

### 后端服务器

```bash
# 进入服务器目录
cd mahjong-server

# 编译
mvn clean package

# 运行
java -jar target/mahjong-server-0.0.1-SNAPSHOT.jar
```

### 前端应用

```bash
# 进入前端目录
cd mahjong-spa

# 安装依赖
npm install
# 或使用pnpm
pnpm install

# 开发模式运行
npm run dev
# 或
pnpm dev

# 构建生产版本
npm run build
# 或
pnpm build
```

### Docker 指南

```
docker run -p 3130:8080 --name simple-mahjong -e JWT_SECRET=xxxxxx -e FRONTEND_URL=https://xxx.com -e SERVER_URL=https://api.xxx.com -e GITHUB_CLIENT_ID=xxx -e GITHUB_CLIENT_SECRET=xxx -e TZ=Asia/Shanghai -d hanjiaming/simple-mahjong:v0.0.4
```

## 使用指南

1. 启动后端服务器
2. 启动前端应用
3. 使用邮箱注册/登录系统
4. 创建房间或加入已有房间
5. 邀请好友加入（需要2-4人）
6. 开始游戏

## 游戏玩法

游戏界面分为五个区域：上、下、左、右、中。每位玩家在自己的视角中位于下方位置，其他玩家按顺时针顺序排列。

基本操作：
- 打出一张牌
- 从牌库中抽取牌
- 从桌面上拿取别人出的牌
- 明牌（展示）一张或多张牌
- 宣布自己是胜利者（需其他玩家确认）

## 牌组说明

中国麻将牌组共136张牌：
- 万子牌：一万到九万，每种4张（共36张）
- 筒子牌：一筒到九筒，每种4张（共36张）
- 条子牌：一条到九条，每种4张（共36张）
- 字牌：
  - 风牌：东、南、西、北，每种4张（共16张）
  - 箭牌：中、发、白，每种4张（共12张）

## 系统限制

- 所有数据存储在内存中，服务重启将丢失数据
- 房间有效期为24小时
- 不内置麻将规则和胜利条件判断
- 最少需要2名玩家才能开始游戏
- 每个房间最多容纳4名玩家

## 贡献指南

欢迎提交Pull Request或Issue来改进项目。

 
