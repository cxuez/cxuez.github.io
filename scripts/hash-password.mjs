/**
 * 生成密码哈希
 * 用法：npm run hash 你的新密码
 * 然后把输出的 AUTH_SALT / PASSWORD_HASH 两行替换到 src/lib/auth.ts
 */
import crypto from 'node:crypto';

const SALT = process.env.AUTH_SALT || 'tech-notes';
const password = process.argv[2];

if (!password) {
  console.error('用法: npm run hash <你的密码>');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(`${SALT}:${password}`).digest('hex');

console.log('');
console.log(`export const AUTH_SALT = '${SALT}';`);
console.log(`export const PASSWORD_HASH = '${hash}';`);
console.log('');
console.log('↑ 把这两行复制到 src/lib/auth.ts 中');
