# 技术笔记 · 个人博客

一个用 **Astro 5** 搭建的纯静态个人博客，文章全部是本地 Markdown 文件，通过 GitHub Actions 自动部署到 **GitHub Pages**。

- 首页文章列表（按日期倒序，私密文章显示锁图标）- 文章详情（代码高亮、表格、引用、图片、链接）
- 标签分类页（`/tags/` 与 `/tags/<标签>/`）
- 关于页、登录页、404 页、RSS
- 深浅色主题切换（记忆偏好）
- 密码登录 + localStorage 7 天有效期，私密文章登录后可见

---

## 一、本地运行

```bash
npm install     # 安装依赖（Astro 5）
npm run dev     # 本地开发，打开 http://localhost:4321/
npm run build   # 构建到 dist/
npm run preview # 预览构建产物
```

> 线上地址：**https://cxuez.github.io**（仓库 `cxuez/cxuez.github.io`，用户主页仓库，`base` 为 `/`）
> 本地 `npm run dev` 访问 http://localhost:4321/

## 二、目录结构

```
/
├── src/
│   ├── content.config.ts        # posts 集合定义 + frontmatter 校验
│   ├── content/posts/           # ★ 所有 Markdown 文章放这里
│   ├── layouts/BaseLayout.astro # 页面骨架（导航 / 页脚 / 主题与登录态脚本）
│   ├── components/              # Nav、PostCard、IconLock
│   ├── lib/
│   │   ├── auth.ts              # 密码哈希、存储键名、有效期
│   │   ├── site.ts              # URL 与日期工具
│   │   └── site-config.ts       # 站名、作者、底部链接
│   ├── pages/
│   │   ├── index.astro          # 首页
│   │   ├── posts/[slug].astro   # 文章详情
│   │   ├── tags/index.astro     # 标签总览
│   │   ├── tags/[tag].astro     # 单标签文章列表
│   │   ├── about.astro          # 关于页
│   │   ├── login.astro          # 登录页
│   │   ├── upload.astro         # ★ 上传页：浏览器里提交 Markdown 到仓库
│   │   ├── 404.astro
│   │   └── rss.xml.ts           # RSS 输出（仅公开文章）
│   └── styles/global.css        # 主题变量 + 排版样式
├── public/
│   ├── images/                  # 图片，Markdown 里用 /images/xxx.png 引用
│   ├── files/                   # 附件，用 /files/xxx.pdf 引用
│   └── favicon.svg
├── .github/workflows/deploy.yml # GitHub Actions 自动部署
├── astro.config.mjs             # site / base / 代码高亮 / Markdown 插件
└── package.json
```

## 三、部署到 GitHub Pages（详细步骤）

### 1. 改两处配置

打开 `astro.config.mjs`，修改顶部两行（当前已按本项目填好）：

```js
const GITHUB_USERNAME = 'cxuez';
const rawRepo = 'cxuez.github.io';   // 用户主页仓库 → base 自动为 '/'
```

- **用户主页仓库**（仓库名必须是 `用户名.github.io`，访问地址 `https://用户名.github.io/`）：
  就像现在这样填，代码会自动识别并把 `base` 设为 `/`。
- **项目仓库**（访问地址 `https://用户名.github.io/仓库名/`）：把 `rawRepo` 换成普通仓库名，
  例如 `const rawRepo = 'tech-notes';`，`base` 会自动变成 `/tech-notes/`。

> `.github/workflows/deploy.yml` 里已经用 `GITHUB_USERNAME: ${{ github.repository_owner }}`
> 和 `REPO_NAME: ${{ github.event.repository.name }}` 注入了同样的值，
> 所以 CI 里不需要再手动改；只有本地 `dev` 想复现线上路径时才需要改 `astro.config.mjs`。

### 2. 创建 GitHub 仓库并推送

```bash
# 已初始化过就跳过 git init
git add .
git commit -m "feat: init astro blog"

# 用 SSH
git remote add origin git@github.com:cxuez/cxuez.github.io.git
# 或用 HTTPS
git remote add origin https://github.com/cxuez/cxuez.github.io.git

git branch -M main
git push -u origin main
```

### 3. 打开 GitHub Pages

进入仓库 **Settings → Pages**，在 **Build and deployment → Source** 里选择 **GitHub Actions**（不是 "Deploy from a branch"）。

> 新版 GitHub 在你推送了 `.github/workflows/deploy.yml` 之后，通常会自动识别；
> 如果没有，就从上面的路径手动切一次。

### 4. 触发部署

推送到 `main` 即自动触发；也可以在仓库的 **Actions** 页选中 `Deploy to GitHub Pages` 点 **Run workflow** 手动触发。

工作流做了两件事：`npm ci && npm run build` → 上传 `dist/` → `actions/deploy-pages` 发布。
完成后 Actions 页面会给出访问地址。

### 5.（可选）自定义域名

1. 在 `public/` 下新建 `CNAME` 文件，内容只写域名，例如 `notes.example.com`。
2. 域名 DNS 加一条 CNAME 记录指向 `用户名.github.io`。
3. 仓库 Settings → Pages → Custom domain 填入域名，勾选 Enforce HTTPS。
4. `astro.config.mjs` 里的 `site` 建议同步改成 `https://notes.example.com`（影响 RSS / sitemap 的绝对链接）。

### 常见问题

| 现象 | 原因 / 解决 |
| --- | --- |
| 页面能打开但 CSS / 图片 404 | `base` 不对。确认 `astro.config.mjs` 的仓库名与 GitHub 仓库名完全一致（区分大小写） |
| Actions 报 `npm ci` 失败 | 本地 `package-lock.json` 没提交。把它一起 `git add` 推上去 |
| 部署成功但 404 | Settings → Pages 的 Source 还是 "Deploy from a branch"，改成 GitHub Actions |
| 中文标签页 404 | 标签 URL 做了 encodeURIComponent，浏览器地址栏正常；不要用未编码的路径硬编码 |

## 四、写一篇文章

在 `src/content/posts/` 新建 `xxx.md`，frontmatter 如下：

```markdown
---
title: 文章标题              # 必填
date: 2026-09-23             # 必填，支持 2026-09-23 10:30 这种写法
tags: [Astro, 前端]           # 标签数组
summary: 一句话摘要，显示在列表页
private: false               # 可选，true 时需要登录才能看正文
draft: false                 # 可选，true 时生产构建不输出
cover: /images/cover.png     # 可选封面
---

正文从这里开始，支持标题、列表、表格、引用、代码块、图片、链接。

![图片说明](/images/demo.png)
[下载附件](/files/demo.pdf)
```

要点：

- **文件名即 URL**：`hello-world.md` → `/posts/hello-world/`。
- **图片放 `public/images/`**，用 `/images/xxx.png` 引用（构建时会自动补上 base 前缀，不用担心子目录部署）。
- **附件放 `public/files/`**，引用方式同理。
- **草稿**用 `draft: true`，本地 `npm run dev` 仍能看到，线上构建会自动跳过。
- 字段写错（比如 `tag:` 少了 s）会在构建时报错并提示哪一行。

## 五、用上传页发文（不装 Git 也能发）

线上有个上传页：**https://cxuez.github.io/upload/**（需先登录，导航栏「写文章」入口登录后可见）。

流程：**拖入或选择 .md 文件**（支持多文件，也可直接粘贴文本）→ 自动解析/补全
frontmatter 并生成可编辑卡片 → 确认文件名、标题、日期、标签、摘要、私密/草稿 → 提交。

### 两种提交方式

| 方式 | 需要什么 | 特点 |
| --- | --- | --- |
| **方式二：Token 提交**（默认） | 一个 GitHub Personal Access Token | 全自动，点一次就进仓库，Actions 1~2 分钟后发布；文章再长也没问题 |
| **方式一：GitHub 网页确认** | 浏览器登录着 GitHub | 不需要 Token。短文（<6000 字符）直接预填打开；**长文会自动把内容复制到剪贴板**，打开只预填路径的新建页，粘贴后点 Commit |

生成 Token：

- 细粒度（推荐）：https://github.com/settings/personal-access-tokens/new
  → Repository access 选 `cxuez.github.io` → Permissions 里 **Contents: Read and write**
- 或经典 Token：https://github.com/settings/tokens/new?scopes=repo&description=blog-upload （勾 `repo`）

> Token 只存在你自己浏览器的 localStorage（勾「记住 Token」才会存），不会发给本站以外的任何服务。
> 上传页本身是纯前端页面，仓库信息写在 `src/lib/site-config.ts` 的 `REPO` 里。

注意事项：

- **文件名决定 URL**：`my-note.md` → `/posts/my-note/`，卡片里可以改。
- 提交同名文件会**覆盖更新**（脚本会先取 sha）。
- 提交成功后不要立刻刷新线上页面，等 Actions 跑完（1~2 分钟）。
- 如果 Actions 报 frontmatter 校验错，说明 `title` 或 `date` 缺失/格式不对，在上传页改好重新提交即可。

## 六、修改密码

默认密码是 **`admin123`**，务必改掉：

```bash
npm run hash 你的新密码
```

会输出类似：

```
export const AUTH_SALT = 'tech-notes';
export const PASSWORD_HASH = 'abcdef1234...';
```

把这两行复制到 `src/lib/auth.ts` 里替换即可（改 `AUTH_SALT` 会让所有人的登录态立即失效）。

相关配置都在 `src/lib/auth.ts`：

| 常量 | 说明 |
| --- | --- |
| `AUTH_SALT` | 加盐值，可随意改 |
| `PASSWORD_HASH` | SHA-256 哈希，用 `npm run hash` 生成 |
| `AUTH_STORAGE_KEY` | localStorage 键名 |
| `AUTH_TTL_MS` | 有效期，默认 7 天 |

> ⚠️ **关于"私密"的真实强度**：这是纯静态站点，没有服务端，哈希必然随页面一起下发，
> 所以私密功能只能挡住随手点进来的访客，**不能保护真正敏感的信息**。
> 未登录时正文根本不渲染进可见区域（CSS 层面隐藏），但 HTML 源码里仍然存在。
> 真正敏感的内容请不要放进公开仓库。
>
> 另外登录页用了 `crypto.subtle`，需要 HTTPS 或 localhost 环境（GitHub Pages 默认是 HTTPS，没问题）。

## 七、替换主题 / 改外观

### 1. 站点信息

改 `src/lib/site-config.ts`：站名、副标题、作者、底部链接。

### 2. 配色

改 `src/styles/global.css` 顶部的 CSS 变量：

```css
:root { --accent: #0969da; ... }        /* 浅色 */
:root[data-theme='dark'] { ... }        /* 深色 */
```

改 `--accent` 就能整体换主色，其余变量（背景、边框、文字）同理。

### 3. 代码高亮主题

改 `astro.config.mjs` 里的 Shiki 主题名（可用 `dracula`、`nord`、`one-dark-pro` 等）：

```js
markdown: {
  shikiConfig: {
    themes: { light: 'github-light', dark: 'github-dark' },
    wrap: true,
  },
},
```

浅色写在内联样式里，深色通过 `--shiki-dark` 变量在深色模式下覆盖（见 `global.css` 底部），所以两者要成对配置。

### 4. 关于页

直接编辑 `src/pages/about.astro`。如果你想用 Markdown 写，可以新建
`src/content/posts/...` 之外的独立文件，或把 `about.astro` 改成读取一个 .md 文件。

## 八、技术说明

- **Astro 5** + `astro:content` 内容集合（glob loader + zod schema 校验）
- **输出**：纯静态 HTML/CSS，默认几乎不带运行时 JS（只有主题切换与登录的几十行脚本）
- **代码高亮**：Shiki，构建期完成，支持深浅双主题
- **RSS**：`/rss.xml`，仅包含公开文章
- **Markdown 路径插件**：`astro.config.mjs` 里的 `remarkBaseUrls`，保证 `/images/xxx.png` 在子目录部署下也能正确解析

## 九、常用命令

```bash
npm run dev       # 开发
npm run build     # 构建
npm run preview   # 预览构建结果
npm run hash xxx  # 生成密码哈希
```
