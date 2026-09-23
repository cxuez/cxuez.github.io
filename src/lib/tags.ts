/**
 * 标签相关的统一逻辑
 *
 * 以前标签的「生成链接」「统计数量」「详情页取文章」散落在三个页面里各写一遍，
 * 容易出现计数与实际内容对不上、或者链接进不去详情页的问题。
 * 这里收敛成同一套函数，三个页面都用它。
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { url } from './site';

export type Post = CollectionEntry<'posts'>;

/**
 * 线上可见的文章：生产构建排除草稿，开发时全部保留。
 * 标签统计与标签详情页必须用同一份数据，否则会出现「列表显示有、点进去没有」。
 */
export async function getVisiblePosts(): Promise<Post[]> {
  return getCollection('posts', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
}

/**
 * 标签 slug —— 只做「URL 安全」处理，不做百分号编码。
 *
 * ⚠️ 关键：以前这里返回 encodeURIComponent(...) 的结果，Astro 拿它当路由参数时
 *    会把 % 再当成普通字符生成一个名为 "%E9%9A%8F%E7%AC%94" 的物理目录，
 *    而浏览器请求 /tags/%E9%9A%8F%E7%AC%94/ 会被服务器解码成 /tags/随笔/ ——
 *    两者对不上，于是中文标签一点就 404。
 *    现在 slug 保留原始中文，由链接处的 encodeURIComponent 负责编码，
 *    服务器解码后正好匹配 Astro 生成的中文目录。
 */
export function slugifyTag(tag: string): string {
  return String(tag ?? '')
    .trim()
    .replace(/\s+/g, '-')
    // 去掉在 URL 路径里会出问题的字符（/ ? # % & = + 等）
    .replace(/[/?#%&=+<>[\]{}|\\^~`]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/** 标签详情页链接（slug 在这里才做 URL 编码） */
export function tagHref(tag: string): string {
  const slug = slugifyTag(tag);
  return slug ? url(`tags/${encodeURIComponent(slug)}/`) : url('tags/');
}

export interface TagStat {
  /** 展示用的原始标签名 */
  tag: string;
  /** URL slug */
  slug: string;
  /** 该标签下的文章数 */
  count: number;
}

/**
 * 统计标签及其文章数
 *
 * - 按 slug 归并，所以 "Astro" 与 "astro" 不会被算成两个标签（以前会，导致计数错乱）
 * - 空标签直接丢弃，不会产生 /tags// 这种路由
 */
export function collectTags(posts: Post[]): TagStat[] {
  const map = new Map<string, { tag: string; count: number }>();
  for (const post of posts) {
    // 同一篇文章里重复写同一个标签（含大小写不同）只算一次，
    // 否则会出现「列表显示 2 篇、点进去只有 1 篇」
    const seen = new Set<string>();
    for (const raw of post.data.tags ?? []) {
      const slug = slugifyTag(raw);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const hit = map.get(slug);
      if (hit) hit.count += 1;
      else map.set(slug, { tag: String(raw).trim(), count: 1 });
    }
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ slug, tag: v.tag, count: v.count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

/** 取某个 slug 下的全部文章（按日期倒序） */
export function postsOfTag(posts: Post[], slug: string): Post[] {
  return posts
    .filter((post) => (post.data.tags ?? []).some((t) => slugifyTag(t) === slug))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
