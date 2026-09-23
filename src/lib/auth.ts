/**
 * 前端口令校验（纯静态站点，无后端）
 *
 * ⚠️ 说明：静态页面没有服务端，密码与哈希必然随页面一起下发，
 *    因此这只能"防君子"（挡住随手点进来的访客），不能算真正的安全。
 *    真正敏感的内容请勿放在公开仓库里。
 *
 * 修改密码：`npm run hash 你的新密码`，把输出的两行替换到下面即可。
 */

/** 盐值，随便改；改了之后记得重新生成哈希 */
export const AUTH_SALT = 'tech-notes';

/** SHA-256(AUTH_SALT + ':' + 密码) —— 默认密码是 admin123 */
export const PASSWORD_HASH = '3b274cee0cd150015882a7cd93669ce74b42abe31db8a6190fe596afe982116c';

/** localStorage 中保存登录态的键名 */
export const AUTH_STORAGE_KEY = 'tech-notes-auth';

/** 登录有效期：7 天 */
export const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 登录态写入 <html> 的 class，CSS 用它显示私密内容 */
export const AUTH_CLASS = 'is-authed';

/** 计算 SHA-256（浏览器 Web Crypto） */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hashPassword(password: string): Promise<string> {
  return sha256(`${AUTH_SALT}:${password}`);
}
