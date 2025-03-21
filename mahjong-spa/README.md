# 麻将对战系统（演示版）

这是麻将对战系统的前端演示版本，所有数据都在前端模拟，无需后端服务。

## 特点

- 基于React的单页应用
- 使用zustand进行状态管理
- 前端模拟数据，无需后端
- 支持基本的麻将游戏规则
- 响应式设计，适配不同设备

## 运行方式

1. 确保已安装Node.js（推荐v16以上版本）
2. 安装依赖:
```bash
npm install
# 或者使用pnpm
pnpm install
```

3. 启动开发服务器:
```bash
npm run dev
# 或者使用pnpm
pnpm dev
```

4. 在浏览器中访问 `http://localhost:5173`

## 构建生产版本

```bash
npm run build
# 或者使用pnpm
pnpm build
```

## 注意事项

- 这是一个演示版本，所有数据都在前端模拟
- 不支持真实的多人游戏
- 在实际应用中，需要配合后端服务使用

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
