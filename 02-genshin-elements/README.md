# 机制拆解 · 第 2 期 · 原神式元素反应（教学原型）

用一张会衰减的“元素附着表”，复刻原神式元素附着与反应（蒸发 / 融化 / 超载 / 超导 / 感电 / 冻结 / 扩散 / 结晶）和内置冷却（ICD）的**原创教学原型**。可以在网页里点木桩、打元素、连射测试冷却，也是解析视频的渲染来源。

作者：粑粑柑（梭哈ai版）。本项目不含米哈游的代码或美术资源，也不是官方实现。

## 运行

```bash
node tools/serve.mjs . 8017
# 打开 http://127.0.0.1:8017/        （交互预览 + 实现方法 + 解析视频）
# 打开 http://127.0.0.1:8017/film.html （视频逐帧渲染页）
```

需要 http 服务（ES Module 与 fetch 不能用 file://）。需要支持 WebGL2 的浏览器；Three.js 已放在 `vendor/three/`。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` `app.js` `site.css` | 交互预览页：效果预览 / 实现方法 / 解析视频三个标签 |
| `src/combat.js` | 附着、衰减、冷却、反应的确定性模拟（纯 JS，无随机、无时钟） |
| `src/world.js` `src/sim.js` | Three.js 渲染 + 悬浮岛场景（复用第 1 期） |
| `film.html` `film.js` `timeline.js` `script.json` | 解析视频的逐帧合成与脚本 |
| `research.md` | 事实核对表与来源 |
| `media/poster.jpg` | 视频页海报图（取自渲染预览帧） |
| `build/preview_check/` | 无头浏览器自检脚本与截图 |

## 数据说明

元素量（附着税 1U→0.8U、持续 2.5x+7 秒、同元素取大）、强弱蒸发/融化倍率与消耗、剧变倍率、ICD（3 下 / 2.5 秒）均为**玩家社区实测**，米哈游未公布官方数值。教学简化：不含元素精通、抗性、暴击，一次命中最多一种反应，冻结不做递减。倍率取 5.2 之后的数字。

## 来源

- KQM Theorycrafting Library：[元素量理论](https://library.keqingmains.com/combat-mechanics/elemental-effects/elemental-gauge-theory)、[内置冷却](https://library.keqingmains.com/combat-mechanics/internal-cooldown)、[剧变反应](https://library.keqingmains.com/combat-mechanics/elemental-effects/transformative-reactions)、[伤害公式](https://library.keqingmains.com/combat-mechanics/damage/damage-formula)
- Genshin Impact Wiki：[Elemental Gauge Theory](https://genshin-impact.fandom.com/wiki/Elemental_Gauge_Theory)、[Internal Cooldown](https://genshin-impact.fandom.com/wiki/Internal_Cooldown)、[Level Scaling](https://genshin-impact.fandom.com/wiki/Elemental_Reaction/Level_Scaling)
- 上一期：[塞尔达式化学引擎](../01-zelda-chemistry/)（塞尔达算世界 / 原神算伤害）

## 关于实机画面

仓库**不包含**任何游戏实机录像或截图素材。视频中引用的实机片段仅用于评论与教学，版权归 HoYoverse 所有，不随本仓库分发。

## 许可

MIT，见 `LICENSE`。
