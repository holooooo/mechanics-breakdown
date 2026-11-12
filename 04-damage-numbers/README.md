# 机制拆解 04 · 跳字（交互预览）

伤害数字是怎么一层一层“爽”起来的？这是一个**原创教学原型**：一个分层的伤害数字系统，从 L0 纯文本一路叠加到 L7，每一层只多做一件事。页面包含三个标签：

- **效果预览**：Canvas 2D 竞技场。选层级 L0–L7（累加，选 L5 就是 L0–L5 全开），「攻击」（Space / J / 点击画面）、「连击」（K，8 连发，间隔 0.12 秒）、必暴击（C）、自动攻击、暴击率 0–100%、数字格式（自动 / 原样 / 千分位 / 英文 K·M·B / 中文 万·亿 / 科学计数）、数值膨胀（每秒指数增长）、左右对比（左 L0，右当前层级，同一批命中）、0.25× 慢放与暂停。HUD 显示屏上数字数、上一击、连击总数、“顿帧中”。数字键 0–7 切换层级。
- **实现方法**：八层的原理（加了什么、为什么爽、关键写法、代码片段）、数字格式化实验、心理学（即时反馈、可变比率奖励、期待、韦伯–费希纳与数值膨胀、反方与无障碍）、带可信度标注的案例与来源、`src/dmgtext.js` / `src/arena.js` 源码查看器。
- **解析视频**：视频海报、B站/抖音说明（链接待补），以及前三期链接。

`window.APP` 暴露了测试接口：`APP.hit({crit})`、`APP.burst()`、`APP.setLevel(n)`、`APP.setCompare(b)`、`APP.setAuto(b)`、`APP.setCrit(p)`、`APP.setFormat(f)`、`APP.setInflation(b, rate)`、`APP.pause(b)`、`APP.step(dt)`（确定性推进）、`APP.stats()` 等。

## 运行

需要 Node 18+，无需安装依赖：

```bash
node tools/serve.mjs . 8024
# 打开 http://127.0.0.1:8024/
```

页面使用 ES Module 与 `fetch`，必须通过 http 打开，不能直接用 `file://`。

## 文件说明

| 文件 | 作用 |
|------|------|
| `index.html` | 页面结构（三个标签） |
| `app.js` | 交互逻辑：实时命中驱动、Canvas 渲染循环、HUD、八层讲解、格式化实验、源码查看器 |
| `site.css` | 样式 |
| `media/poster.jpg` | “解析视频”标签的海报 |
| `src/dmgtext.js` | 分层伤害数字系统（纯函数）：`LEVELS`、`makeHit`、`chainHits`、`makeHits`、`layout`、`fmt`、`warp` |
| `src/arena.js` | Canvas 2D 竞技场渲染：`drawArena`、`drawNumber`、`drawBackdrop`、`drawDummy` |
| `film.*`, `tools/` | 视频逐帧渲染管线 |
| `research.md` | 资料整理与可信度标注 |

## 来源（可信度见 `research.md` 与页面标注）

- Diablo III 博客：https://us.diablo3.com/blog/19996041 ；D4 数字刷屏：https://www.icy-veins.com/d4/news/are-diablo-4s-many-many-damage-numbers-becoming-a-visual-problem
- 魔界战记：https://www.gamedeveloper.com/design/game-design-inspirations-disgaea-s-damage-in-the-millions-and-post-game-structure
- 魔兽世界数值压缩：https://warcraft.wiki.gg/wiki/Stat_squish
- 怪物猎人：世界：https://monsterhunterworld.wiki.fextralife.com/Combat
- Balatro：https://gmtk.substack.com/p/balatros-cursed-design-problem
- 吸血鬼幸存者（社区）：https://steamcommunity.com/app/1794680/discussions/0/600764291186990521
- Warframe：https://wiki.warframe.com/w/Damage_Numbers
- Weber–Fechner：https://en.wikipedia.org/wiki/Weber%E2%80%93Fechner_law

艾尔登法环无数字、Juice it or lose it、The art of screenshake 等条目在页面中标为“待核实”。

## 许可

MIT License，详见 `LICENSE`。

## 注意

- 本项目不含任何商业游戏的代码或美术，所有数值为演示设计，不对应任何游戏的真实实现。
- 游戏实机素材（`footage/` 等）**不包含在仓库内**；视频中提及的游戏画面版权归各游戏厂商所有。
- `media/poster.jpg` 需要另行放入，缺失时页面显示“封面制作中”占位。
