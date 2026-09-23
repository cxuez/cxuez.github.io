---
title: 用 Astro 从零搭一个静态博客
date: 2026-09-20
tags: [Astro, 前端, 静态站点]
summary: 记录用 Astro 5 搭建这个博客的完整过程：内容集合、Markdown 渲染、代码高亮，以及如何把产物部署到 GitHub Pages。
cover: /images/cover-astro.svg
---

![封面](/images/cover-astro.svg)

之前博客用的是 Hexo，主题改起来很痛苦。这次换成 **Astro**：它默认输出零 JavaScript 的静态 HTML，写页面就是写组件，构建期把 Markdown 编译好，访问速度非常快。

## 为什么选 Astro

- **默认不打包 JS**：页面只有 HTML + CSS，首屏几乎是瞬时。
- **组件化但输出静态**：`.astro` 组件语法接近 JSX，但构建后是纯 HTML。
- **内容集合（Content Collections）**：Markdown 的 frontmatter 有 schema 校验，写错字段名会直接报错。
- **Shiki 代码高亮**：构建期高亮，不需要在浏览器里跑高亮库。

> 如果你只是想写文章，Astro 的学习成本大概在一个下午。

## 目录结构

```text
src/
├── content.config.ts   # 定义 posts 集合与 frontmatter schema
├── content/posts/      # 所有 Markdown 文章
├── layouts/            # 页面骨架
├── pages/              # 路由（文件即路由）
├── components/         # 可复用组件
└── styles/global.css   # 主题变量与排版
```

`pages/` 下的文件直接对应 URL：`src/pages/about.astro` → `/about/`，动态路由用方括号：`src/pages/posts/[slug].astro`。

## 定义内容集合

Astro 5 用 `glob` loader 读取目录，schema 用 zod 声明：

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),
    private: z.boolean().default(false),
  }),
});

export const collections = { posts };
```

之后在任何页面都能这样取文章：

```astro
---
import { getCollection } from 'astro:content';
const posts = (await getCollection('posts')).sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
);
---
```

## 渲染 Markdown

详情页里用 `render()` 拿到内容组件：

```astro
---
import { render } from 'astro:content';
const { Content } = await render(post);
---
<div class="prose"><Content /></div>
```

代码块高亮在 `astro.config.mjs` 里配置，双主题可以跟着站点深浅色切换：

```js
markdown: {
  shikiConfig: {
    themes: { light: 'github-light', dark: 'github-dark' },
    wrap: true,
  },
},
```

## 部署到 GitHub Pages

要点只有两个：

1. `astro.config.mjs` 里设置 `site` 和 `base`（子目录部署时 `base` 是 `/仓库名/`）。
2. 用官方的 `actions/deploy-pages` 工作流，推送到 `main` 就自动发布。

| 场景 | site | base |
| --- | --- | --- |
| 用户主页仓库 `用户名.github.io` | `https://用户名.github.io` | `/` |
| 项目仓库 `用户名.github.io/仓库名` | `https://用户名.github.io` | `/仓库名/` |

## 踩过的坑

1. **子目录下绝对路径失效**：Markdown 里写 `/images/a.png`，部署到 `/仓库名/` 会 404。解决办法是在 `astro.config.mjs` 里加一个 remark 插件，把 `/` 开头的链接自动加上 base 前缀（这个项目里已经内置了）。
2. **`crypto.subtle` 需要 HTTPS**：登录页用到了 Web Crypto 做 SHA-256，本地 `localhost` 和 GitHub Pages 的 HTTPS 都可用，但如果你用局域网 IP 访问会失败。
3. **日期要写全**：frontmatter 的 `date` 用 `2026-09-20` 没问题，但如果带时区要注意 `z.coerce.date()` 会按本地时区解析。

## 小结

整个博客的构建产物只有几 MB 的静态文件，扔到任何静态托管上都能跑。下一步打算加上全文搜索和文章分页——不过就目前四十来篇的量级，一个标签页其实够用了。
