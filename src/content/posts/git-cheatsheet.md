---
title: Git 常用命令速查表
date: 2026-09-18
tags: [Git, 工具]
summary: 日常开发里真正高频用到的 Git 命令，按场景分类整理，附带每个命令的适用时机和注意事项。
---

命令记不住很正常，用得多的其实就那十几个。按场景整理一下，省得每次都去翻文档。

## 一、日常提交

```bash
git status                 # 看当前改动
git add -p                 # 分块暂存，比 git add . 安全得多
git commit -m "feat: 说明" # 提交
git commit --amend         # 修补上一次提交（还没 push 时用）
```

> `git add -p` 强烈推荐：它会逐块问你要不要暂存，能有效避免把调试代码一起提交进去。

## 二、分支操作

| 命令 | 作用 |
| --- | --- |
| `git switch -c feat/x` | 新建并切换到分支 |
| `git switch main` | 切回主分支 |
| `git branch -d feat/x` | 删除已合并的分支 |
| `git branch -D feat/x` | 强制删除未合并分支 |
| `git branch -m 新名字` | 重命名当前分支 |

`git checkout` 也能切分支，但它同时兼顾"切分支"和"还原文件"两件事，容易误操作 —— 新版本 Git 建议用 `switch` / `restore` 分开。

## 三、同步远程

```bash
git fetch origin          # 只拉取，不改动工作区
git pull --rebase         # 拉取并变基，避免多余的 merge commit
git push -u origin 分支名  # 首次推送并建立追踪
```

我一般默认用 `--rebase`，提交历史会干净很多。可以设成默认：

```bash
git config --global pull.rebase true
```

## 四、撤销与回退

这是最容易出事的一块，按"危险程度"从低到高排：

1. **撤销工作区改动**（还没 `add`）：

   ```bash
   git restore 文件名
   ```

2. **取消暂存**（已经 `add` 了）：

   ```bash
   git restore --staged 文件名
   ```

3. **回退提交但保留改动**：

   ```bash
   git reset --soft HEAD~1
   ```

4. **回退提交并丢弃改动**（谨慎！）：

   ```bash
   git reset --hard HEAD~1
   ```

5. **已经 push 出去了**：用 `revert` 生成一个反向提交，不要 `reset`：

   ```bash
   git revert <commit-id>
   ```

> 原则：**已经公开的历史只追加，不改写**。改写会让协作者的本地仓库和远程对不上。

## 五、暂存现场

改到一半要切分支时：

```bash
git stash push -m "改到一半的登录页"
git stash list
git stash pop          # 恢复最近一次并删除记录
git stash apply        # 恢复但保留记录
```

## 六、查历史

```bash
git log --oneline --graph --all   # 图形化看分支
git log -p 文件名                  # 看某个文件的改动历史
git blame -L 10,20 文件名          # 看某几行是谁改的
git show <commit-id>              # 看某次提交的内容
```

## 七、救命命令

```bash
git reflog
```

几乎所有"我以为弄丢了"的提交，都能在 `reflog` 里找回来。它记录 HEAD 的每一次移动，包括被 `reset --hard` 掉的提交。找到 commit id 后 `git cherry-pick <id>` 就能救回来。

## 配置别名

最后贴一组我在用的别名，能省不少敲键盘的时间：

```bash
git config --global alias.st "status -sb"
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.last "log -1 --stat"
```
