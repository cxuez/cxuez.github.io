/** 站点基础路径，永远以 "/" 结尾（本地为 "/"，子目录部署为 "/repo/"） */
export const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** 生成站内链接，自动带上 base 前缀 */
export function url(path = ''): string {
  return BASE + String(path).replace(/^\/+/, '');
}

/** 日期格式化：2026 年 09 月 23 日 */
export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 标签 slug 化（中文标签也能安全出现在 URL 中） */
export function slugifyTag(tag: string): string {
  return encodeURIComponent(tag.trim().toLowerCase().replace(/\s+/g, '-'));
}

/** 统计标签及其文章数（只统计公开可见的文章） */
export function countTags(posts: { data: { tags: string[] } }[]) {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count, slug: slugifyTag(tag) }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}
