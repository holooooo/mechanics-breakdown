# 机制拆解 03 · 读指令简史（交互预览）

敌人是怎么“读”你的指令的？这是一个**原创教学原型**：同一场确定性 1v1 对决，敌人可以用三种方式“知道”你出招——读按键、读动作、看画面（带感知延迟）；再加上一个可玩的「影之刃式 Boss」，它**不读按键，只读你的状态**。页面包含三个标签：

- **效果预览**：Three.js 3D 对决，默认敌人是「影之刃式 Boss」，也可切换到读按键 / 读动作 / 看画面。
  - 影之刃式 Boss：J 慢斩、K 快斩、H 喝药、L 或空格闪避（4 帧起手后约 16 帧无敌）、P 弹反（8 帧窗口）；显示血量与杀气条。Boss 约每 1.4 秒用 `pick(p, r)` 抽一招（普通连斩 / 后撤步 / 剑气 / 红光投技），`p` 来自 `pressure({hp, pressesPerSec, healing})`，由你最近 1.5 秒的真实输入算出，`r` 来自确定性哈希。每招有约 0.5 秒红光（只能闪）或蓝光（可弹反）预兆，并有「红光！闪避」/「蓝光 · 可弹反」提示；右侧有压力条、权重条、Boss 刚抽到的招式、战斗记录。
  - 其它三种模式：感知延迟 0–40 帧滑块（仅“看画面”生效）、进攻欲望滑块、实时帧数据图、结果记录、1× / 0.25× / 暂停。
- **实现方法**：三种读法的原理、简史（街霸 II、SNK 综合征、魂系喝药惩罚、心理螳螂、影之刃零）、压力系统、「照着压力系统写一个影之刃式 Boss」，以及 `src/duel.js` / `src/pressure.js` / `src/pbboss.js` 的源码查看器、带可信度标注的来源、B站创作者致谢。
- **解析视频**：视频海报、B站/抖音说明，以及前两期链接。

压力系统属于**玩家测试与推测，非官方**；制作人 Soulframe 的说法是制作中没有使用“读指令”，本页把它作为对照。本项目不对应任何商业游戏的真实实现，所有帧数均为演示设计。

### 影之刃式 Boss 的规则（`src/pbboss.js`，纯 JS、无 DOM、确定性）

- Boss 只读 `sense()` 返回的三个数字：血量比例、每秒按键数（1.5 秒窗口）、是否在喝药。
- 招式：普通连斩（蓝光，可弹反；弹反第一刀即打断连招）、后撤步（前半段无法被击中）、剑气（蓝光弹道，闪避或弹反）、红光投技（红光，不可弹反，必须闪避）。
- 杀气（简化设计，非官方数值）：完美弹反 Boss −25；斩击命中 −12 / −6；被打 −12、被抓 −20；Boss 杀气归零 → 破防 2 秒（伤害 ×2）；玩家归零 → 晕 0.75 秒。
- `window.APP` 暴露了 `APP.simulate('calm' | 'mash', seed, 秒)`、`APP.newBoss(seed)`、`APP.bossFrames(n, inputs)` 等，便于无头测试。

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
| `app.js` | 交互逻辑：对决与 Boss 驱动、姿势映射、红蓝光 HUD、帧数据图、压力面板、源码查看器 |
| `site.css` | 样式 |
| `media/poster.jpg` | “解析视频”标签的海报 |
| `src/duel.js` | 确定性对决模拟（整数帧）：`createDuel`、`MOVES` 等 |
| `src/pressure.js` | 压力分、招式权重、`pick(p, r)` |
| `src/pbboss.js` | 影之刃式 Boss：只读状态、抽招、红蓝光预兆、闪避/弹反判定、杀气 |
| `src/world.js`, `src/sim.js` | 3D 小岛场景与环境模拟 |
| `film.html`, `film.js`, `tools/` | 视频逐帧渲染管线 |
| `research.md` | 资料整理与可信度标注 |

## 来源（可信度见 `research.md`）

- 街霸 II 逆向：https://sf2platinum.wordpress.com/2017/01/20/the-ai-engine/
- 魂系：https://gamesradar.com/this-elden-ring-boss-most-annoying-attack-is-bound-directly-to-your-healing-flask ；ERAiAPI https://eladidu.github.io/readable-ds-lua/d1/d81/class_ai_func.html （社区文档，FromSoftware 未确认）
- 影之刃零制作人采访（Automaton）：https://automaton-media.com/articles/interviewsjp/20261009-472623/
- Psycho Mantis：https://en.wikipedia.org/wiki/Psycho_Mantis
- 游戏 AI 与作弊：https://www.gamedeveloper.com/game-platforms/analysis-game-ai-our-cheatin-hearts

社区来源（SNK 综合征、喝药惩罚的机制解读、心理螳螂的机制解释）在页面中以“社区”标签注明。

## 感谢与素材出处

压力系统与 Boss 的思路来自 B站创作者的实测与讲解（玩家观点，非官方）：

- @尾巴尾巴啊：https://www.bilibili.com/video/BV1ae4j6MERe （《想打赢魂系 Boss，读指令已经是最基础的功夫》）
- @Oceeart：https://www.bilibili.com/video/BV1cdso6bEJw
- @市井小羿：https://www.bilibili.com/video/BV1kwzwBTEgZ
- @还会再会吗m：https://www.bilibili.com/video/BV1t5NZe7EWf
- @努力做一个Dancer：https://www.bilibili.com/video/BV1JueG6sESe
- @一般通过の溜胸：https://www.bilibili.com/video/BV19Y411W7zT （心理螳螂读心战）
- @游研更新姬：https://www.bilibili.com/video/BV1yJ411M7Rt （Desk《How the CPU cheated you in Street Fighter 2》的中文字幕转载）
- 对照：制作人 Soulframe 的 Automaton 采访 https://automaton-media.com/articles/interviewsjp/20261009-472623/

## 许可

MIT License，详见 `LICENSE`。

## 注意

游戏实机素材（`footage/` 等）**不包含在仓库内**；视频中的实机画面版权归各游戏厂商所有。
