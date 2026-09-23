---
title: Flex 和 Grid 该怎么选
date: 2026-09-10
tags: [CSS, 前端]
summary: 不再靠试错写布局：用一张决策表说清 Flex 与 Grid 的分工，并给出几个常见布局的最小实现。
---

以前写布局靠"加个 `display:flex` 试试，不行再换 grid"。后来想明白了两者的分工，基本不用试错了。

## 一句话区分

- **Flex 是一维布局**：沿着一条轴（横向或纵向）排列元素，适合"一串东西"。
- **Grid 是二维布局**：同时控制行和列，适合"一块区域"。

判断方法：如果你画布局时需要同时考虑"这一行放几个"和"这一列多宽"，那就该用 Grid。

## 决策表

| 需求 | 方案 |
| --- | --- |
| 导航栏一排按钮 | Flex |
| 卡片列表自动换行 | Grid + `auto-fill` |
| 左右两栏（侧边栏 + 内容） | Grid |
| 垂直居中一个元素 | Flex（或 Grid `place-items:center`） |
| 表单标签和输入框对齐 | Grid |
| 页头：logo 居左、菜单居右 | Flex + `margin-left:auto` |
| 整体页面框架（头/身/脚） | Grid |

## 几个最小实现

### 1. 响应式卡片列表（不需要媒体查询）

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
```

`auto-fill` 会在一行里塞尽可能多的列，`minmax(240px, 1fr)` 保证每列至少 240px 且等分剩余空间。这一行代码替代了三四个断点。

### 2. 经典两栏布局

```css
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  min-height: 100vh;
}

@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr; /* 窄屏直接变单列 */
  }
}
```

### 3. 页头左右分布

```css
.header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav {
  margin-left: auto; /* 把右侧内容推到最右 */
}
```

### 4. 底部固定页脚（内容不足时也贴底）

```css
body {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto; /* 头 / 主 / 脚 */
}
```

## 容易踩的坑

### Flex 子项被内容撑爆

```css
.item {
  min-width: 0; /* 关键：允许收缩，否则长文本会撑破容器 */
}
```

配合省略号：

```css
.item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### gap 已经很好用了

现在 `gap` 在 Flex 和 Grid 里都支持，别再用 `margin` + `:last-child { margin: 0 }` 那套老写法了。

### `justify-content` 和 `align-items` 别混

- 主轴用 `justify-*`，交叉轴用 `align-*`。
- `flex-direction: column` 时主轴变成纵向，两个属性的效果会互换 —— 这也是最常见的困惑来源。

## 我的经验法则

> 先想"这是不是二维的"。是 → Grid；不是 → Flex。两者可以嵌套，外层 Grid 搭框架、内层 Flex 排内容，这是最舒服的组合。
