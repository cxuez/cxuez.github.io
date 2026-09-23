/**
 * 上传页「标签选择」的纯逻辑
 *
 * 抽出来是为了能脱离 DOM 单测（同名去重、选中切换这些规则最容易写错）。
 * 只处理字符串数组，不碰 DOM。
 */

/** 去掉首尾空白与开头的 #，得到干净的标签名 */
export function normalizeTagInput(raw: string): string {
  return String(raw == null ? '' : raw)
    .trim()
    .replace(/^#+/, '')
    .trim();
}

/** 去重（忽略大小写与首尾空白），保留第一次出现的写法 */
export function uniqueTags(list: readonly unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list ?? []) {
    const name = normalizeTagInput(String(raw ?? ''));
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** 选中/取消：已选（忽略大小写）则移除，否则加入 */
export function toggleTag(tags: readonly string[], name: string): string[] {
  const target = normalizeTagInput(name);
  if (!target) return [...tags];
  const key = target.toLowerCase();
  const hit = tags.find((t) => normalizeTagInput(t).toLowerCase() === key);
  const next = tags.filter((t) => normalizeTagInput(t).toLowerCase() !== key);
  if (!hit) next.push(target);
  return next;
}

export type NewTagResult =
  /** 输入为空 */
  | { type: 'empty'; tag: '' }
  /** 标签池里已有同名（忽略大小写）：返回池中已有的写法，不重复创建 */
  | { type: 'exists'; tag: string }
  /** 当前文章已选过这个标签 */
  | { type: 'duplicate'; tag: string }
  /** 全新标签 */
  | { type: 'new'; tag: string };

/**
 * 新增标签时的同名校验
 *
 * knownTags：标签池（构建期已有 + 本次新增过）
 * itemTags：当前这篇笔记已选的标签
 * raw：用户输入
 */
export function resolveNewTag(knownTags: readonly string[], itemTags: readonly string[], raw: string): NewTagResult {
  const name = normalizeTagInput(raw);
  if (!name) return { type: 'empty', tag: '' };

  const key = name.toLowerCase();
  const known = knownTags.find((t) => normalizeTagInput(t).toLowerCase() === key);
  if (known) return { type: 'exists', tag: normalizeTagInput(known) };

  const dup = itemTags.find((t) => normalizeTagInput(t).toLowerCase() === key);
  if (dup) return { type: 'duplicate', tag: normalizeTagInput(dup) };

  return { type: 'new', tag: name };
}
