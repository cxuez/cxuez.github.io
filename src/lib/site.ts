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
