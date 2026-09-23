/**
 * 笔记删除：登录态 / 作者归属校验 + 调用 GitHub Contents API 删除仓库里的 Markdown
 *
 * ⚠️ 这是纯静态站点，没有自建服务端。所谓「删除接口」，实际是 GitHub 的
 *    DELETE /repos/{owner}/{repo}/contents/{path} —— 文件从仓库删掉后，
 *    GitHub Actions 重新构建，线上文章才会消失（约 1~2 分钟）。
 *
 * 权限设计：
 *   1. 登录态校验：localStorage 里的登录凭证是否存在、是否过期；
 *   2. 归属校验：笔记 frontmatter 的 author 必须等于当前登录身份；
 *   3. 写入校验：真正的删除必须持有具备 Contents 写权限的 GitHub Token。
 *      前两步是浏览器端的门禁（静态站只能做到这里），第三步才是不可绕过的一关 ——
 *      没有 Token 的人，哪怕改了 localStorage 也删不掉仓库里的任何文件。
 */

import { REPO } from './site-config';
import { AUTH_STORAGE_KEY, AUTH_TTL_MS, AUTH_DEFAULT_USER, readAuth } from './auth';

/** GitHub Token 在 localStorage 里的键名（与上传页共用一份） */
export const GH_TOKEN_KEY = 'tech-notes-gh-token';

export type DeleteCode =
  | 'OK'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NO_TOKEN'
  | 'NOT_FOUND'
  | 'HTTP'
  | 'NETWORK';

export interface DeleteResult {
  ok: boolean;
  code: DeleteCode;
  /** 面向用户的中文提示，可直接展示 */
  message: string;
  status?: number;
}

/** 归一化身份：去空白、忽略大小写，避免 "Cxuez" 和 "cxuez" 判成两个人 */
export function normalizeUser(name: string): string {
  return String(name || '').trim().toLowerCase() || AUTH_DEFAULT_USER.toLowerCase();
}

/**
 * 校验「能不能删这篇笔记」
 * 只做登录态与归属判断，不碰网络，可同步调用。
 */
export function checkDeletePermission(author: string): DeleteResult {
  const auth = readAuth();
  if (!auth.ok) {
    return { ok: false, code: 'UNAUTHENTICATED', message: '尚未登录，无法删除笔记。请先登录后重试。' };
  }
  const owner = normalizeUser(author || AUTH_DEFAULT_USER);
  const me = normalizeUser(auth.user);
  if (owner !== me) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: `无权删除：这篇笔记的作者是「${owner}」，而你当前的登录身份是「${me}」。只能删除自己创建的笔记。`,
    };
  }
  return { ok: true, code: 'OK', message: '' };
}

/** 读取本地保存的 GitHub Token */
export function getToken(): string {
  try {
    return localStorage.getItem(GH_TOKEN_KEY) || '';
  } catch (err) {
    return '';
  }
}

export function saveToken(token: string): void {
  try {
    if (token) localStorage.setItem(GH_TOKEN_KEY, token);
    else localStorage.removeItem(GH_TOKEN_KEY);
  } catch (err) {}
}

function contentsUrl(path: string): string {
  const encoded = path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `https://api.github.com/repos/${REPO.owner}/${REPO.name}/contents/${encoded}`;
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function httpMessage(status: number, gh?: string): string {
  const extra = gh ? '：' + gh : '';
  if (status === 401) return 'Token 无效或已过期（401），请重新生成后重试' + extra;
  if (status === 403)
    return `Token 权限不足（403），需要 ${REPO.owner}/${REPO.name} 的 Contents 读写权限` + extra;
  if (status === 404) return '仓库里找不到这个文件（404），可能已被删除或改过名' + extra;
  if (status === 409) return '文件与仓库内容冲突（409），请刷新页面后重试' + extra;
  if (status === 422) return '请求被拒绝（422），通常是文件已不存在' + extra;
  return '删除失败（HTTP ' + status + '）' + extra;
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * 删除仓库里的一篇笔记
 *
 * 会先校验登录态与归属，再调用 GitHub Contents API。
 * 任何一步不通过都返回明确的中文错误信息，不抛异常。
 */
export async function deletePost(opts: {
  /** 仓库内路径，例如 src/content/posts/hello.md */
  path: string;
  /** 笔记作者（frontmatter 的 author） */
  author: string;
  token: string;
  /** 提交信息，缺省自动生成 */
  message?: string;
}): Promise<DeleteResult> {
  const perm = checkDeletePermission(opts.author);
  if (!perm.ok) return perm;

  const token = (opts.token || '').trim();
  if (!token) {
    return {
      ok: false,
      code: 'NO_TOKEN',
      message: '需要 GitHub Token 才能删除（要对 ' + REPO.owner + '/' + REPO.name + ' 有 Contents 读写权限）。',
    };
  }

  const url = contentsUrl(opts.path);
  const headers = ghHeaders(token);

  // 第一步：取 sha（GitHub 删除文件必须带 sha）
  let sha = '';
  try {
    const res = await fetch(url + '?ref=' + encodeURIComponent(REPO.branch), { headers });
    if (res.ok) {
      const info = await res.json();
      sha = info && info.sha ? info.sha : '';
    } else {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        return { ok: false, code: 'HTTP', status: res.status, message: httpMessage(res.status, data.message) };
      }
      return {
        ok: false,
        code: res.status === 404 ? 'NOT_FOUND' : 'HTTP',
        status: res.status,
        message:
          res.status === 404
            ? '仓库里找不到 ' + opts.path + '（404），可能已被删除或改过名'
            : httpMessage(res.status, data.message),
      };
    }
  } catch (err) {
    return { ok: false, code: 'NETWORK', message: '无法连接 GitHub：' + errText(err) };
  }

  // 第二步：删除
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        message: opts.message || 'docs: 删除文章 ' + opts.path,
        sha,
        branch: REPO.branch,
      }),
    });
    if (res.ok) {
      return { ok: true, code: 'OK', message: '已从仓库删除 ' + opts.path };
    }
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      code: res.status === 404 ? 'NOT_FOUND' : 'HTTP',
      status: res.status,
      message: httpMessage(res.status, data.message),
    };
  } catch (err) {
    return { ok: false, code: 'NETWORK', message: '删除请求失败：' + errText(err) };
  }
}

/** 登录态是否有效（给 UI 做按钮显示/隐藏判断） */
export function isLoggedIn(): boolean {
  return readAuth().ok;
}

/** 当前登录身份 */
export function currentUser(): string {
  const auth = readAuth();
  return auth.ok ? auth.user : '';
}

export { AUTH_STORAGE_KEY, AUTH_TTL_MS, AUTH_DEFAULT_USER, readAuth };
