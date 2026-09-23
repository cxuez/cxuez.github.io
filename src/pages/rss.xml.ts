import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { BASE } from '../lib/site';
import { SITE } from '../lib/site-config';

/** 纯手写 RSS，不引入额外依赖。私密文章只输出标题与提示，不泄露正文。 */
export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://example.com')).origin;
  const posts = (await getCollection('posts', ({ data }) => !data.draft && !data.private)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const items = posts
    .map((post) => {
      const link = new URL(`${BASE}posts/${post.id}/`, origin).toString();
      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.data.summary)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.title)}</title>
    <link>${new URL(BASE, origin).toString()}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
