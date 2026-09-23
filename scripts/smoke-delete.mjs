/**
 * 临时冒烟测试：在 Node 里用最小 DOM 桩执行打包后的删除脚本，
 * 验证权限校验 / 弹窗 / Token 校验 / API 错误映射 / 成功路径。
 * 测完即删。
 */
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const dist = new URL('../dist/_astro/', import.meta.url);
const file = readdirSync(dist).find((f) => f.startsWith('DeletePostButton') && f.endsWith('.js'));
if (!file) throw new Error('找不到打包后的删除脚本');

// ---------- DOM 桩 ----------
function makeEl(tag = 'div') {
  const el = {
    tagName: tag,
    className: '',
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    checked: true,
    disabled: false,
    children: [],
    _handlers: {},
    addEventListener(type, fn) {
      (this._handlers[type] ||= []).push(fn);
    },
    removeEventListener() {},
    appendChild(c) {
      this.children.push(c);
      return c;
    },
    remove() {
      const i = bodyChildren.indexOf(this);
      if (i >= 0) bodyChildren.splice(i, 1);
    },
    focus() {},
    querySelector(sel) {
      // 同一个 selector 必须返回同一个元素，否则脚本闭包里拿到的是不同对象
      this._map ||= {};
      if (!this._map[sel]) this._map[sel] = makeEl();
      return this._map[sel];
    },
    closest() {
      return null;
    },
    classList: { add() {}, remove() {}, contains() { return false; } },
  };
  return el;
}

let clickHandler = null;
const bodyChildren = [];
const store = new Map();
const session = new Map();

globalThis.document = {
  addEventListener(type, fn) {
    if (type === 'click') clickHandler = fn;
  },
  removeEventListener() {},
  querySelector() {
    return null;
  },
  createElement: (tag) => makeEl(tag),
  body: { appendChild(c) { bodyChildren.push(c); return c; } },
  documentElement: { classList: { add() {}, remove() {} } },
};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.sessionStorage = {
  getItem: (k) => (session.has(k) ? session.get(k) : null),
  setItem: (k, v) => session.set(k, String(v)),
  removeItem: (k) => session.delete(k),
};
globalThis.location = { pathname: '/', search: '', reload() { log.push('RELOAD'); }, assign(u) { log.push('ASSIGN:' + u); } };
const log = [];

let fetchPlan = [];
globalThis.fetch = async () => {
  const step = fetchPlan.shift() ?? { status: 200, body: { sha: 'abc123' } };
  return {
    ok: step.status >= 200 && step.status < 300,
    status: step.status,
    json: async () => step.body ?? {},
  };
};

await import(new URL(file, dist).href);

// ---------- 触发点击 ----------
function clickDelete(author) {
  bodyChildren.length = 0;
  const btn = makeEl('button');
  btn.dataset = {
    path: 'src/content/posts/demo.md',
    title: '示例笔记',
    author,
    after: 'reload',
    home: '/',
    login: '/login/',
  };
  clickHandler({ target: { closest: () => btn }, preventDefault() {} });
}

/** 取最近一次 toast 的文本 */
function lastToast() {
  const toast = bodyChildren.find((c) => String(c.className).startsWith('del-toast'));
  return toast ? String(toast.children[0]?.textContent) : '';
}

/** 触发「确认删除」，返回弹窗里的错误提示文本 */
async function runConfirm(token) {
  const backdrop = bodyChildren.find((c) => String(c.className) === 'del-backdrop');
  if (!backdrop) return '未弹出确认框';
  const handler = backdrop._handlers.click?.[0];
  if (!handler) return '确认按钮未绑定事件';
  const msgInput = backdrop._map?.['#del-msg'];
  if (msgInput) msgInput.value = 'docs: 删除文章 示例笔记';
  const tokenInput = backdrop._map?.['#del-token'];
  if (tokenInput) tokenInput.value = token ?? '';
  handler({ target: { closest: (sel) => (sel === '[data-act]' ? { dataset: { act: 'confirm' } } : null) } });
  await new Promise((r) => setTimeout(r, 40));
  return String(backdrop._map?.['#del-error']?.textContent ?? '');
}

function setAuth(user) {
  if (user === null) store.delete('tech-notes-auth');
  else store.set('tech-notes-auth', JSON.stringify({ exp: Date.now() + 864e5, user }));
}

const results = [];
function check(name, actual, expect) {
  const ok = typeof expect === 'function' ? expect(actual) : String(actual).includes(expect);
  results.push([ok ? 'PASS' : 'FAIL', name, ok ? '' : '实际=' + actual]);
}

// A. 未登录
setAuth(null);
clickDelete('cxuez');
check('未登录：提示先登录', lastToast(), (v) => v.includes('尚未登录'));
check('未登录：不弹确认框', bodyChildren.find((c) => String(c.className) === 'del-backdrop') ? 'yes' : 'no', 'no');

// B. 身份不符
setAuth('alice');
clickDelete('cxuez');
check('非作者：提示无权删除', lastToast(), (v) => v.includes('无权删除') && v.includes('alice') && v.includes('cxuez'));

// C. 作者本人 + 空 Token
setAuth('cxuez');
clickDelete('cxuez');
const dialogOpened = bodyChildren.some((c) => String(c.className) === 'del-backdrop');
check('作者本人：弹出确认框', dialogOpened ? 'yes' : 'no', 'yes');
let errText = await runConfirm('');
check('空 Token：拦截并提示', errText, '请填写 GitHub Token');

// D. Token 无效（401）
clickDelete('cxuez');
fetchPlan = [{ status: 401, body: { message: 'Bad credentials' } }];
errText = await runConfirm("ghp_fake_token");
check('401：提示 Token 无效', errText, 'Token 无效或已过期');

// E. 权限不足（403）
clickDelete('cxuez');
fetchPlan = [{ status: 403, body: { message: 'Resource not accessible' } }];
errText = await runConfirm("ghp_fake_token");
check('403：提示权限不足', errText, 'Token 权限不足');

// F. 文件不存在（404）
clickDelete('cxuez');
fetchPlan = [{ status: 404 }];
errText = await runConfirm("ghp_fake_token");
check('404：提示找不到文件', errText, '找不到');

// G. 成功
clickDelete('cxuez');
fetchPlan = [
  { status: 200, body: { sha: 'abc123' } },
  { status: 200, body: { commit: {} } },
];
errText = await runConfirm("ghp_fake_token");
check('成功：无错误提示', errText, '');
check('成功：写入跨页提示', session.get('tech-notes-toast') || '', '已删除');
check('成功：刷新页面', log.join(','), 'RELOAD');

console.log('\n' + '-'.repeat(60));
for (const [status, name, extra] of results) {
  console.log(`${status}  ${name}${extra ? '  ← ' + extra : ''}`);
}
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log('-'.repeat(60));
console.log(`${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
