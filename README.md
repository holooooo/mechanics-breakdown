# 机制拆解 · Mechanics Breakdown

作者：粑粑柑（梭哈ai版）

每期拆一个游戏机制：讲清原理，再用 WebGL 写一个能玩的版本。解析视频发布在 B 站 / 抖音。

在线网页：https://mechanics-breakdown.pages.dev/ （镜像：https://holooooo.github.io/mechanics-breakdown/）

| 期 | 主题 | 目录 | 在线 |
|---|---|---|---|
| 01 | 塞尔达化学引擎 | [`01-zelda-chemistry/`](01-zelda-chemistry/) | [/01-zelda-chemistry/](https://mechanics-breakdown.pages.dev/01-zelda-chemistry/) |
| 02 | 元素导论 · 原神元素反应 | [`02-genshin-elements/`](02-genshin-elements/) | [/02-genshin-elements/](https://mechanics-breakdown.pages.dev/02-genshin-elements/) |
| 03 | 读指令简史 | [`03-input-reading/`](03-input-reading/) | [/03-input-reading/](https://mechanics-breakdown.pages.dev/03-input-reading/) |

每期目录都自带 `index.html`（可玩网页）、`film.html`（视频逐帧渲染页）、`src/`（模拟与渲染）、`tools/`（配音、配乐、渲染、合成）和 `README.md`，资料来源写在各期的 README 或 research.md 里。Three.js 放在根目录的 `vendor/three`，三期共用。

## 本地预览

```bash
node 01-zelda-chemistry/tools/serve.mjs . 8017
```

然后打开 http://127.0.0.1:8017/

## 仓库里没有的东西

游戏实机片段（开场与预告）、配音和成片视频都不放进仓库，所以在线打开 film.html 时，实机画面那几段是空的。

## 历史

第 1、2 期原本在独立仓库 `zelda-chemistry-engine`、`genshin-elemental-reactions`，已经用 git subtree 合并进来，提交历史都保留了。

## License

MIT。vendor/three 是 Three.js r170（MIT）。
