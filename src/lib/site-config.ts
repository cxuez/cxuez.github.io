/**
 * 站点基础信息 —— 改这里就能换成你自己的博客
 */
export const SITE = {
  title: '技术笔记',
  subtitle: '记录写代码时踩过的坑与想明白的事',
  description: '一个用 Astro 搭建的纯静态个人技术博客，部署在 GitHub Pages。',
  author: 'cxuez',
  /** 底部社交链接，不需要的删掉即可 */
  links: [{ label: 'GitHub', href: 'https://github.com/cxuez' }, { label: 'RSS', href: 'rss.xml' }] as {
    label: string;
    href: string;
  }[],
  /** 每页文章数（首页暂不做分页，保留配置） */
  pageSize: 10,
  /** localStorage 中保存主题偏好的键名 */
  themeStorageKey: 'tech-notes-theme',
};
