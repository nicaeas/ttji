# 天天记 · 日记小程序 — 项目总览

## 项目结构

```
miniprogram/
├── app.js                          # 应用入口，初始化存储与系统信息
├── app.json                        # 全局配置（5 页面 + 4 TabBar）
├── app.wxss                        # 全局样式（温暖纸张日记风格设计系统）
├── project.config.json             # 微信开发者工具配置
├── sitemap.json                    # 搜索索引配置
├── assets/icons/                   # TabBar 图标（8 枚占位图标）
├── pages/
│   ├── index/                      # 日记列表页（首页）
│   ├── detail/                     # 日记详情/编辑页
│   ├── template/                   # 模板管理页
│   ├── category/                   # 分类管理页
│   └── about/                      # 关于页面
├── components/
│   ├── diary-card/                 # 日记卡片组件
│   ├── markdown-view/              # Markdown 渲染组件
│   └── mood-icon/                  # 心情图标组件
└── utils/
    ├── constants.js                # 常量（心情、模板、排序选项）
    ├── date.js                     # 日期工具（格式化、分组、相对时间）
    ├── markdown.js                 # 自研 Markdown 解析器
    └── storage.js                  # 数据 CRUD（日记/分类/模板）
```

## 已实现功能

### 页面结构
| 页面 | 路径 | 功能 |
|------|------|------|
| 日记列表 | pages/index | 按日期分组展示、搜索过滤、心情/分类筛选、排序、多选批量删除、统计概览 |
| 日记详情 | pages/detail | 完整展示、Markdown 渲染、编辑/预览切换、心情选择、分类选择、删除确认 |
| 模板管理 | pages/template | 8 种预设模板、用户自定义模板、图标/心情/内容编辑 |
| 分类管理 | pages/category | 新增/编辑/删除分类、图标颜色自定义、分类下日记数量统计 |
| 关于页面 | pages/about | 功能介绍、统计概览、开发者信息 |

### 核心特性
- **Markdown 渲染引擎**：自研轻量解析器，支持标题（H1-H6）、粗体、斜体、删除线、行内代码、代码块、引用、有序/无序列表、分隔线
- **日记字段**：标题、正文（Markdown）、分类标签、心情标签、创建/更新时间
- **数据持久化**：基于 `wx.getStorageSync` 的本地存储，日记/分类/模板独立管理
- **视觉设计**：温暖纸张日记风格，暖米色主调，Georgia 衬线标题 + PingFang 正文，柔和阴影与圆角

### 设计系统
- 主色：`#C4956A`（温暖棕褐）
- 背景：`#F5F0E8`（米白）
- 卡片：`#FFFDF7`（暖白）
- 10 种心情配色、CSS 变量驱动的完整设计 Token

## 使用方式

1. 用微信开发者工具打开 `miniprogram/` 目录
2. 在 `project.config.json` 中替换 `appid` 为你的小程序 AppID
3. 替换 `assets/icons/` 下的图标为正式设计稿（当前为纯色占位图）
4. 编译预览即可使用

## 后续建议

- 替换 TabBar 图标为正式设计稿
- 如需云端同步，可接入微信云开发或自有后端
- 可添加日记导出（图片/PDF）、提醒功能
- 可通过 subpackage 拆分将模板/关于页移到分包，控制主包体积
