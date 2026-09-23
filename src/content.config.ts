import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { SITE } from './lib/site-config';

/** 文章集合：src/content/posts/**\/*.md */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    /** 标题 */
    title: z.string(),
    /** 发布日期（支持 2026-09-23 或 2026-09-23T10:00:00） */
    date: z.coerce.date(),
    /** 标签数组 */
    tags: z.array(z.string()).default([]),
    /** 摘要 */
    summary: z.string().default(''),
    /** 是否私密（登录后才可见） */
    private: z.boolean().default(false),
    /** 草稿：生产构建时不会输出 */
    draft: z.boolean().default(false),
    /** 可选封面图，例如 /images/cover.png */
    cover: z.string().optional(),
    /** 可选更新时间 */
    updated: z.coerce.date().optional(),
    /**
     * 作者（删除权限校验用）：只有以该身份登录的用户能删除这篇笔记。
     * 不填则视为站长本人 SITE.author。
     */
    author: z.string().default(SITE.author),
  }),
});

export const collections = { posts };
