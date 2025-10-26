# Next.js 迁移草稿

本目录包含一个将原始 `index.html` 页面拆分后的组件化结构，方便迁移到使用 **Next.js + TypeScript** 的新仓库。文件遵循 App Router 约定，可直接复制到 Next.js 项目的根目录下，并根据需要调整依赖。

## 目录结构

- `app/page.tsx`：页面入口，组合各个功能区域。
- `app/api/*`：示例 API Route，占位符逻辑可替换为真实实现。
- `components/`：按功能区拆分的 React 组件。
- `hooks/`：与占位符逻辑相关的 React Hooks。
- `lib/placeholders/`：示例数据与工具函数。
- `types/`：共享的 TypeScript 类型定义。

## 后续接入建议

1. **真实数据源**：替换 `lib/placeholders` 与 `hooks` 中的假数据逻辑，改为调用实际的 API 或数据库。
2. **状态管理**：根据需求选择使用 React Context、Redux、Zustand 等工具管理全局状态。
3. **样式与 UI**：当前沿用了 Tailwind CSS class 名称，在 Next.js 中可继续使用 `tailwind.config.js` 进行配置。
4. **API 安全**：在 `app/api` 路由中实现鉴权、错误处理与日志上报。

将该目录复制到新的 Next.js 仓库后，安装必要依赖并补充实际业务逻辑即可开始开发与部署。
