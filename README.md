# BA8AKA - 子谦的个人网站 ✨

这是我的个人网站项目，用来记录文章、项目、书签、相册、旅行、健身、待办事项和一些日常灵感。网站部署在阿里云服务器上，通过 GitHub Actions 构建发布，尽量把构建压力从 2 核 2G 的服务器上挪走。

线上地址：[ba8aka.com](https://ba8aka.com)

## 🌱 这个网站用来做什么

- 📝 **写作与文章**：记录技术学习、生活思考、业余无线电、AI 和前端开发内容。
- 📚 **书签收藏**：整理常用链接、资料和工具，方便以后快速查找。
- 🖼️ **生活相册**：保存照片，支持 EXIF 信息、影调分析和瀑布流展示。
- 🎬 **生活视频**：相册支持视频内容，后台上传后可在前台视频板块观看。
- ✅ **任务清单**：只对管理员可见，用来管理个人待办和项目计划。
- 🧭 **项目与时间线**：展示做过的项目、经历、旅行、健身记录和阶段性动态。
- 🔐 **后台管理**：文章、相册、友链、项目、书签等内容都可以在后台维护。

## 🛠️ 技术栈

- **框架**：Next.js 14 / App Router
- **语言**：TypeScript / React
- **样式**：Tailwind CSS、Ant Design、Radix UI、Framer Motion
- **数据库**：MongoDB
- **对象存储**：阿里云 OSS
- **认证**：JWT / jose
- **图片与媒体**：browser-image-compression、Sharp、ExifTool
- **内容处理**：MDX、Remark、Rehype、Prism、Shiki
- **部署**：GitHub Actions + 阿里云服务器

## 🚀 本地运行

```bash
pnpm install
pnpm dev
```

访问：`http://localhost:3000`

生产构建：

```bash
pnpm build
pnpm start
```

## 🔑 环境变量

项目依赖 `.env.local` 或服务器环境变量。不要把真实密钥提交到仓库。

```env
# 站点
NEXT_PUBLIC_BASE_URL=https://ba8aka.com
ALLOWED_ORIGIN=https://ba8aka.com

# 数据库
MONGODB_URI=

# 管理员登录
ADMIN_USERNAME=
ADMIN_PASSWORD=
JWT_SECRET=

# 阿里云 OSS
OSS_REGION=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
```

`JWT_SECRET` 建议使用 32 位以上随机字符串，并保持 GitHub Secrets 与服务器 `/srv/ba8aka/shared/.env.local` 一致。

## 📦 部署说明

这个项目主要通过 GitHub Actions 构建部署。原因是服务器配置较小，直接在服务器构建容易卡死或失败。

大致流程：

1. 推送代码到 GitHub。
2. GitHub Actions 读取 Repository Secrets。
3. 在 GitHub Runner 上完成构建。
4. 将构建产物同步到阿里云服务器。
5. 服务器使用共享环境变量文件启动应用。

## 🧩 项目结构

```text
src/
├── app/                 # Next.js App Router 页面和 API
│   ├── admin/           # 后台管理
│   ├── album/           # 生活相册与视频
│   ├── api/             # API Routes
│   ├── articles/        # 文章页面
│   ├── bookmarks/       # 书签页面
│   ├── todos/           # 管理员任务清单
│   └── ...
├── components/          # 通用组件
├── config/              # 静态配置
├── hooks/               # React Hooks
├── lib/                 # 数据库、工具库
├── styles/              # 样式文件
├── utils/               # 通用工具函数
└── app/model/           # MongoDB 数据模型
```

## 🔒 安全笔记

- OSS 密钥只应存在于服务器环境变量和 GitHub Secrets 中。
- 不要使用 `NEXT_PUBLIC_` 暴露任何敏感配置。
- 后台接口、上传接口、待办接口都应要求管理员登录。
- 上传文件有大小限制，当前限制为 300M。

## 🙋‍♂️ 关于我

我是子谦，呼号 BA8AKA。这个网站是我的个人数字花园，也是一个持续迭代的小作品。

它不只是博客，更像是把生活、学习和项目慢慢收拢起来的地方。
