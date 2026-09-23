/**
 * 上传页标签选择的逻辑自检：npm run test:tags
 * 覆盖去重、选中切换、新增时的同名校验。
 */
import { normalizeTagInput, uniqueTags, toggleTag, resolveNewTag } from '../src/lib/tag-picker.ts';

const results = [];
const eq = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push([ok ? 'PASS' : 'FAIL', name, ok ? '' : `实际=${JSON.stringify(actual)} 期望=${JSON.stringify(expected)}`]);
};

eq('去掉 # 与空白', normalizeTagInput('  ##C++  '), 'C++');
eq('去重忽略大小写', uniqueTags(['Astro', 'astro', ' ASTRO ', 'CSS', 'css']), ['Astro', 'CSS']);
eq('去重时保留首次写法', uniqueTags(['git', 'Git']), ['git']);
eq('过滤空标签', uniqueTags(['', '   ', '#', '前端']), ['前端']);

eq('选中新标签', toggleTag(['Astro'], 'CSS'), ['Astro', 'CSS']);
eq('取消已选标签', toggleTag(['Astro', 'CSS'], 'css'), ['Astro']);
eq('大小写不同视为同一个', toggleTag(['Astro'], 'astro'), []);

eq('空输入', resolveNewTag(['Astro'], [], '   ').type, 'empty');
eq('与标签池同名（大小写不同）→ exists', resolveNewTag(['Astro', 'CSS'], [], 'css'), { type: 'exists', tag: 'CSS' });
eq('当前文章已选过 → duplicate', resolveNewTag(['Astro'], ['笔记'], '笔记'), { type: 'duplicate', tag: '笔记' });
eq('全新标签 → new', resolveNewTag(['Astro'], [], '随笔'), { type: 'new', tag: '随笔' });
eq('带 # 的新标签会被清理', resolveNewTag([], [], '#前端'), { type: 'new', tag: '前端' });

console.log('\n' + '-'.repeat(60));
for (const [status, name, extra] of results) {
  console.log(`${status}  ${name}${extra ? '  ← ' + extra : ''}`);
}
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log('-'.repeat(60));
console.log(`${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
