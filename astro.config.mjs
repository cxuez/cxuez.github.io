import { defineConfig } from 'astro/config';

/* ============================================================
 *  部署配置：改成你自己的 GitHub 用户名 / 仓库名
 *  ------------------------------------------------------------
 *  - 项目仓库（https://用户名.github.io/仓库名/）：
 *      GITHUB_USERNAME = '你的用户名'; REPO_NAME = '仓库名';
 *  - 用户主页仓库（https://用户名.github.io/）：
 *      GITHUB_USERNAME = '你的用户名'; REPO_NAME = '';
 *  GitHub Actions 里也可以通过环境变量覆盖，见 .github/workflows/deploy.yml
 * ============================================================ */
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'cxuez';
const rawRepo = process.env.REPO_NAME ?? 'cxuez.github.io';
// 用户主页仓库（xxx.github.io）不需要子路径
const isUserPage = rawRepo === '' || rawRepo.toLowerCase().endsWith('.github.io');
const REPO_NAME = isUserPage ? '' : rawRepo;

const SITE = `https://${GITHUB_USERNAME}.github.io`;
const BASE = REPO_NAME ? `/${REPO_NAME}/` : '/';

/**
 * remark 插件：把 Markdown 里以 "/" 开头的图片/附件路径自动加上 base 前缀，
 * 这样在子目录部署时 `/images/xxx.png` 依然可用。
 */
function remarkBaseUrls(base) {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  return () => (tree) => {
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.url === 'string' && node.url.startsWith('/') && !node.url.startsWith('//')) {
        node.url = prefix + node.url;
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  markdown: {
    shikiConfig: {
      // 双主题：跟随站点深浅色切换
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
    remarkPlugins: [remarkBaseUrls(BASE)],
  },
  build: {
    // 输出纯静态文件
    format: 'directory',
  },
});
