---
title: 防抖与节流：别再傻傻分不清
date: 2026-09-15
tags: [JavaScript, 前端]
summary: 用最直白的比喻讲清防抖和节流的区别，给出带取消能力的实现代码，并说明各自适合什么场景。
---

这两个概念每次面试都会被问到，但很多人背完代码还是不知道该用哪个。其实一句话就能分清：

- **防抖（debounce）**：等你不抖了再做 —— 最后一次说了算。
- **节流（throttle）**：固定频率做 —— 到点就做一次。

## 一个比喻

想象电梯门：

- **防抖**像电梯：有人进来就重置关门倒计时，直到没人进来了才关门 → **最后一次触发后等待**。
- **节流**像地铁闸机：不管你多着急，每秒最多过一个人 → **固定间隔执行一次**。

## 防抖实现

```js
function debounce(fn, delay = 300) {
  let timer = null;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return debounced;
}
```

关键点：

1. `clearTimeout(timer)` 是核心 —— 每次触发都把上一次的定时器取消。
2. 用 `fn.apply(this, args)` 保证 `this` 指向和参数不丢。
3. 加一个 `cancel()`，组件卸载时记得调用，避免在已销毁的组件上执行回调。

**适用场景**：搜索框输入联想、窗口 resize 结束后重排布局、表单校验。

## 节流实现

时间戳版（首次立即执行）：

```js
function throttle(fn, interval = 300) {
  let last = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

定时器版（末尾也会执行一次，更适合滚动加载）：

```js
function throttle(fn, interval = 300) {
  let timer = null;
  let last = 0;
  return function throttled(...args) {
    const now = Date.now();
    const remain = interval - (now - last);
    if (remain <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remain);
    }
  };
}
```

**适用场景**：滚动监听（无限加载、返回顶部按钮）、鼠标移动绘制、按钮防连点。

## 怎么选

| 场景 | 选哪个 | 原因 |
| --- | --- | --- |
| 搜索框输入 | 防抖 | 只关心用户最终输入的内容 |
| 滚动加载更多 | 节流 | 需要在滚动过程中持续触发 |
| 窗口 resize | 防抖 | 只在尺寸稳定后重排 |
| 点赞按钮 | 节流 | 防止连点，但要立刻有反馈 |
| 拖拽实时预览 | 节流 | 需要跟手，不能等停了才动 |

## 现代替代方案

有些场景其实不需要自己写：

```js
// 1. 只执行一次：AbortController + 事件 once
window.addEventListener('scroll', handler, { once: true });

// 2. 等一帧再执行（动画场景比 throttle 更准）
requestAnimationFrame(() => update());

// 3. 输入联想可以直接用 AbortController 取消上一个请求
const controller = new AbortController();
fetch(url, { signal: controller.signal });
controller.abort();
```

> 特别是搜索场景：比起防抖，更推荐 **防抖 + 请求取消**，否则快速输入时仍会发出一堆已被废弃的请求。

## 最后

记住判断标准：**你关心的是"最终结果"还是"过程"？** 关心结果用防抖，关心过程用节流。想清楚这一点，代码自然就写对了。
