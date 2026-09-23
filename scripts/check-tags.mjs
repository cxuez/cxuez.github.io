/**
 * 标签一致性自检（构建后运行：npm run build && npm run test:tags）
 *
 * 检查三件事：
 *   1. 标签列表页里每个标签的计数，是否等于该标签详情页实际列出的文章数；
 *   2. 每个标签链接是否都能在 dist 里找到对应文件（防止再出现点进去 404）；
 *   3. 是否存在「计数 > 0 但详情页为空」或反向不一致的标签。
 *
 * 只用 Node 内置模块，无额外依赖。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const indexHtml = readFileSync(new URL('tags/index.html', dist), 'utf8');

/** 列表页：href + 计数 */
const listed = [];
const re = /<a[^>]+href="\/tags\/([^"]+)\/"[^>]*>\s*#([^<]*?)<span[^>]*class="[^"]*tag-count[^"]*"[^>]*>(\d+)<\/span>/g;
let m;
while ((m = re.exec(indexHtml))) {
  listed.push({ href: decodeURIComponent(m[1]), raw: m[1], name: m[2].trim(), count: Number(m[3]) });
}

/** 兜底：上面的正则依赖 HTML 结构，若没匹配到再试一次宽松写法 */
if (listed.length === 0) {
  const loose = /href="\/tags\/([^"]+)\/"/g;
  while ((m = loose.exec(indexHtml))) {
    if (m[1] === 'tags') continue;
    listed.push({ href: decodeURIComponent(m[1]), raw: m[1], name: decodeURIComponent(m[1]), count: NaN });
  }
}

const results = [];
const check = (name, ok, extra = '') => results.push([ok ? 'PASS' : 'FAIL', name, ok ? '' : extra]);

check('标签列表页解析到标签', listed.length > 0, '一个都没解析到，可能 HTML 结构变了');

for (const item of listed) {
  const dir = join(new URL('tags/', dist).pathname.replace(/^\/([A-Za-z]:)/, '$1'), item.href);
  const file = join(dir, 'index.html');
  const exists = existsSync(file);

  check(`「#${item.name}」详情页文件存在`, exists, '找不到 ' + file);

  if (!exists) continue;
  const html = readFileSync(file, 'utf8');
  const mm = /(\d+)\s*篇文章/.exec(html);
  const actual = mm ? Number(mm[1]) : -1;

  if (Number.isNaN(item.count)) {
    check(`「#${item.name}」详情页有文章`, actual > 0, '实际 ' + actual + ' 篇');
  } else {
    check(
      `「#${item.name}」计数一致（列表 ${item.count} / 详情 ${actual}）`,
      item.count === actual && actual > 0,
      '不一致',
    );
  }
}

/** 反向检查：dist/tags 下的目录是否都在列表里出现过 */
const listedSlugs = new Set(listed.map((i) => i.href));
const dirs = readdirSync(new URL('tags/', dist), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
for (const dir of dirs) {
  check(`目录 /tags/${dir}/ 在列表中有链接`, listedSlugs.has(dir), '列表里没有指向它的链接');
}

console.log('\n' + '-'.repeat(60));
for (const [status, name, extra] of results) {
  console.log(`${status}  ${name}${extra ? '  ← ' + extra : ''}`);
}
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log('-'.repeat(60));
console.log(`${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
