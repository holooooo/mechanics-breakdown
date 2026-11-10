# 机制拆解 03 · 读指令简史（交互预览）

敌人是怎么“读”你的指令的？这是一个**原创教学原型**：同一场确定性 1v1 对决，敌人可以用三种方式“知道”你出招——读按键、读动作、看画面（带感知延迟）。页面包含三个标签：

- **效果预览**：Three.js 3D 对决（J 慢斩 / K 快斩 / H 喝药）、模式切换、感知延迟 0–40 帧滑块（仅“看画面”生效）、进攻欲望滑块、实时帧数据图、“公平吗？”判定、结果记录、1× / 0.25× / 暂停。
- **实现方法**：三种方式的原理、简史（街霸 II、SNK 综合征、魂系喝药惩罚、心理螳螂、影之刃零）、公平性规则、`src/duel.js` 源码查看器、带可信度标注的来源。
- **解析视频**：视频海报、B站/抖音说明，以及前两期链接。

本项目不对应任何商业游戏的真实实现，所有帧数均为演示设计。

## 运行

需要 Node 18+，无需安装依赖（`vendor/three` 已内置）：

```bash
node tools/serve.mjs . 8017
# 打开 http://127.0.0.1:8017/
```

页面使用 ES Module 与 `fetch`，必须通过 http 打开，不能直接用 `file://`。

## 文件说明

| 文件 | 作用 |
|------|------|
| `index.html` | 页面结构（三个标签） |
| `app.js` | 交互逻辑：对决驱动、姿势映射、帧数据图、公平性面板、源码查看器 |
| `site.css` | 样式 |
| `media/poster.jpg` | “解析视频”标签的海报 |
| `src/duel.js` | 确定性对决模拟（整数帧）：`createDuel`、`MOVES`、`canReact` 等 |
| `src/world.js`, `src/sim.js` | 3D 小岛场景与环境模拟 |
| `film.html`, `film.js`, `tools/` | 视频逐帧渲染管线 |
| `research.md` | 资料整理与可信度标注 |

## 来源（可信度见 `research.md`）

- 街霸 II 逆向：https://sf2platinum.wordpress.com/2017/01/20/the-ai-engine/
- 魂系：https://gamesradar.com/this-elden-ring-boss-most-annoying-attack-is-bound-directly-to-your-healing-flask ；ERAiAPI https://eladidu.github.io/readable-ds-lua/d1/d81/class_ai_func.html （社区文档，FromSoftware 未确认）
- 影之刃零制作人采访（Automaton）：https://automaton-media.com/articles/interviewsjp/20261009-472623/
- Psycho Mantis：https://en.wikipedia.org/wiki/Psycho_Mantis
- 公平 AI：https://www.gamedeveloper.com/game-platforms/analysis-game-ai-our-cheatin-hearts

社区来源（SNK 综合征、喝药惩罚的机制解读、心理螳螂的机制解释）在页面中以“社区”标签注明。

## 许可

MIT License，详见 `LICENSE`。

## 注意

游戏实机素材（`footage/` 等）**不包含在仓库内**；视频中的实机画面版权归各游戏厂商所有。
