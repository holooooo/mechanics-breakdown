# 机制拆解04：伤害数字 / 飘字 / 大数字 调研

置信度标签：【官方/开发者访谈】【GDC演讲】【社区观察】。标 (*) 的条目是我凭记忆写入、本轮未能二次核对原文，上稿前需复核。

## 一、案例（10 个）

1. **Diablo III / IV**【官方博客+社区观察】
   - 做法：暴击数字更大更亮；D3 引入"数字标点"（千分位等）以便阅读大数，需为各语言本地化；D4 玩家大量抱怨数字刷屏"失去意义"，S5 起可完全关闭战斗文字。
   - 为什么有效/有问题：数字膨胀带来的爽感是 Diablo 体验核心，但过量会遮挡画面。
   - 来源：Diablo III 博客 https://us.diablo3.com/blog/19996041 ；Icy Veins https://www.icy-veins.com/d4/news/are-diablo-4s-many-many-damage-numbers-becoming-a-visual-problem ；Mein-MMO https://mein-mmo.de/en/loses-all-meaning-players-criticize-the-most-important-numbers-in-diablo-4-because-they-have-gotten-out-of-control,1572929/
2. **Disgaea（魔界战记）**【媒体报道+开发商口径】
   - 做法：单次伤害可到千万亿级（D6 报道为超过 10^16，各媒体口径不一），等级上限 9999 -> 99,999,999；"数字膨胀本身就是后期玩法"。注意：我没找到"9.99 quintillion 官方上限"的出处，视频里不要写死这个数。
   - 来源：Game Developer https://www.gamedeveloper.com/design/game-design-inspirations-disgaea-s-damage-in-the-millions-and-post-game-structure ；Siliconera https://www.siliconera.com/nis-president-talks-disgaea-6-development-and-three-changes-to-keep-the-series-fresh/ ；Automaton https://automaton-media.com/en/news/disgaeas-new-3d-action-spin-off-was-not-easy-to-develop-and-it-wont-be-easy-to-play-but-at-least-you-can-deal-quadrillions-in-damage/
3. **World of Warcraft（数值压缩 stat squish）**【官方博客(历史)+社区观察】
   - 做法：数值十年膨胀后多次压缩。Wiki 例子：ilvl 530 时生命 490,873 -> 30,375，火球术 46,928 -> 2,209。最早的开发者博客约 2011-11-03。注意：影暗之地(Shadowlands)的"等级压缩"120->50 不是数值压缩，别混用。
   - 为什么：数字大到难比较、难读、有溢出风险；压缩后同样的相对强度更易读。
   - 来源：https://warcraft.wiki.gg/wiki/Stat_squish ；Blizzard 论坛回顾 https://us.forums.blizzard.com/en/wow/t/a-look-back-at-health-values/587645 ；级别压缩澄清 https://us.forums.blizzard.com/en/wow/t/level-squish-is-stat-squish/490748
4. **Monster Hunter World**【社区观察】
   - 做法：数字颜色编码"效果"：橙=弱点/有效，白=中性，紫=抗性（Fextralife），不单独显示元素贡献。
   - 为什么：数字同时是"打点地图"，教玩家打哪里；颜色承载信息而非装饰。
   - 来源：https://monsterhunterworld.wiki.fextralife.com/Combat ；https://monsterhunterworld.wiki.fextralife.com/Monster+Weakness
5. **Balatro**【开发者访谈+评论】
   - 做法：筹码×倍率逐张牌/逐个小丑依次触发，数字逐步滚动累加，牌抖动、火焰随分数增大。LocalThunk 的取向：不预先显示分数，让玩家"搭好机关看它运转"（Rube Goldberg）。
   - 为什么：把"乘法"拆成可见的时序，延迟的是结果，不是反馈。
   - 来源：GMTK https://gmtk.substack.com/p/balatros-cursed-design-problem ；PC Gamer 访谈 https://www.pcgamer.com/i-dont-play-poker-at-all-says-solo-developer-who-made-the-poker-roguelike-i-cant-stop-playing/ ；Rogueliker 访谈 https://rogueliker.com/balatro-interview/ （LocalThunk 关于 juice 的直接原话本轮没搜到，别引成原话）
6. **Vampire Survivors**【社区观察】
   - 做法：海量弹幕与数字刷屏；玩家反馈后期卡顿，关闭伤害数字可缓解（说明飘字是对象数量大户）。无开发者官方声明。
   - 来源：https://steamcommunity.com/app/1794680/discussions/0/600764291186990521 ；https://steamcommunity.com/app/1794680/discussions/0/5675129542131004729
7. **Genshin Impact / 星穹铁道**【社区观察，弱】
   - 做法：数字颜色按元素区分、暴击为黄色（单一来源，质量低）。"暴击更大"未得到验证。HSR 的细节本轮未核实 (*)。上稿前请自己进游戏截图。
   - 来源：HoYoLAB https://www.hoyolab.com/article/622264 （仅作入口）
8. **Warframe**【官方 Wiki】
   - 做法：按伤害类型/暴击等级给数字着色（黄/橙/红分级暴击），是"暴击分层"的好案例。
   - 来源：https://wiki.warframe.com/w/Damage_Numbers
9. **Elden Ring（反例）**(*)【社区观察】
   - 做法：默认无伤害数字，靠动画、硬直、音效反馈；打击感靠 hit-stop 和镜头。本轮未检索到原文，用作"反例"时请说明是常识性观察。
10. **放置/增量游戏：Cookie Clicker、Adventure Capitalist**(*)【社区观察】
    - 做法：指数增长 + 记数法切换（K/M/B -> 科学计数 -> 自定义后缀）；Weber-Fechner 在此体现为"数量级本身是进度"。URL 待补：https://cookieclicker.fandom.com/wiki/Cookie_Clicker_Wiki （复核）
- 未覆盖/待补：Borderlands（暴击/元素色/物理飘字）(*)、PoE/Last Epoch（Last Epoch 论坛有飘字设计讨论 https://forum.lastepoch.com/t/damage-numbers-suggestions-feedback-with-mock-up/11963 ）、Hades、Dead Cells、Overwatch/Apex 命中标记、战力数字，均凭记忆，视频使用前需核实。

## 二、设计原则（6 条 + 反方）

1. **信息编码**：字号、颜色、运动、方向都是信息通道；多种伤害类型数字紧挨会被看成一个大数（Tim Cain，【开发者博客/讲座整理，二手】）。https://turbo-wiki.pages.dev/tim-cain/ux-design/damage-numbers
2. **Juice**：Jonasson & Purho《Juice it or lose it》，同一套玩法加上缓动、缩放、粒子、音效后手感质变。【GDC/Nordic Game 演讲】https://www.youtube.com/watch?v=Fy0aCDmgnxg (*)
3. **屏幕震动与停顿**：Jan Willem Nijman《The art of screenshake》（Vlambeer）逐步叠加：连发、后坐力、屏幕抖动、击退、停顿。【演讲】https://www.youtube.com/watch?v=AJdEqssNZ-U (*)；延伸阅读 Steve Swink《Game Feel》 (*)
4. **对数感知**：Weber-Fechner 定律，感受到的强度与刺激的对数成正比，所以 +10 在 100 上明显、在 10 亿上无感；数字膨胀需要"换挡"（单位、颜色、特效）来维持差异。【心理学教科书】https://en.wikipedia.org/wiki/Weber%E2%80%93Fechner_law
5. **可变比率奖励**：暴击=不确定的高奖励，是强化最强的时序之一。【心理学】https://en.wikipedia.org/wiki/Reinforcement
6. **数字膨胀的代价与重置**：膨胀->难读->压缩（WoW）；或者拥抱膨胀并设计记数法（Disgaea、放置游戏）。
- **反方/无障碍**：飘字遮挡、读不出（D4 S5 加入完全关闭）；Elden Ring 靠其他反馈；MH 用颜色而非大小；视频应提到"可关闭、可缩放、可降噪"是必备开关。其他参考：Game UI Database https://www.gameuidatabase.com/ (*)

## 三、可落地实现技巧（对应 L0 -> 终版）

- L0 纯文本：在命中点生成数字，固定 1 秒后销毁。
- L1 位移与淡出：向上飘 + alpha 线性淡出。生成偏移用 ±r 随机散开（避免同点重叠），后半段才开始淡出。
- L2 弹出缩放：scale 0 -> 1.2 -> 1，用 easeOutBack（https://easings.net/#easeOutBack ），持续约 0.15-0.25s。
- L3 抛物线：初速度向上 + 随机水平分量，重力下落，更有"溅出"感。
- L4 暴击：字号 x1.5-2、换色（黄/橙）、加描边与抖动、前缀符号、更长停留；可再叠一层分级暴击（Warframe 式）。
- L5 类型着色：按元素/弱点/抗性，对比度与色盲友好（别只靠红绿）。
- L6 合并：同目标同时间窗内的多段 tick 累加成一个"滚动数字"，每次命中重置计时并轻微放大；数字用 counting-up 缓动追赶目标值。
- L7 格式化：K/M/B；1e 科学计数；中文 万/亿/兆；固定有效数字（如 3 位），避免宽度抖动。
- L8 节奏反馈：hit-stop（2-6 帧）、屏幕震动（按伤害占比缩放、衰减）、粒子、音高随连击上升（半音阶阶梯）。
- L9 性能/LOD：数量上限（环形池）、低伤害数字缩小或合并、屏幕边缘/远处剔除、优先级（暴击与玩家自身伤害优先）、批量文本渲染；Vampire Survivors 的社区反馈证明这是真实瓶颈。
- L10 终版：以上组合，并提供"关闭/降噪"选项。

## 四、最佳 8 个案例与 6 条原则（摘要）
案例：Diablo III/IV、Disgaea、WoW 压缩、Monster Hunter 颜色、Balatro 滚动累加、Vampire Survivors 刷屏与性能、Warframe 暴击分级、Elden Ring 反例。
原则：信息编码、Juice、屏幕震动/停顿、Weber-Fechner、可变比率奖励、膨胀与重置+可关闭。

## 五、来源清单
- https://us.diablo3.com/blog/19996041
- https://www.icy-veins.com/d4/news/are-diablo-4s-many-many-damage-numbers-becoming-a-visual-problem
- https://mein-mmo.de/en/loses-all-meaning-players-criticize-the-most-important-numbers-in-diablo-4-because-they-have-gotten-out-of-control,1572929/
- https://www.gamedeveloper.com/design/game-design-inspirations-disgaea-s-damage-in-the-millions-and-post-game-structure
- https://www.siliconera.com/nis-president-talks-disgaea-6-development-and-three-changes-to-keep-the-series-fresh/
- https://warcraft.wiki.gg/wiki/Stat_squish
- https://us.forums.blizzard.com/en/wow/t/a-look-back-at-health-values/587645
- https://monsterhunterworld.wiki.fextralife.com/Combat
- https://gmtk.substack.com/p/balatros-cursed-design-problem
- https://www.pcgamer.com/i-dont-play-poker-at-all-says-solo-developer-who-made-the-poker-roguelike-i-cant-stop-playing/
- https://rogueliker.com/balatro-interview/
- https://steamcommunity.com/app/1794680/discussions/0/600764291186990521
- https://wiki.warframe.com/w/Damage_Numbers
- https://turbo-wiki.pages.dev/tim-cain/ux-design/damage-numbers
- https://forum.lastepoch.com/t/damage-numbers-suggestions-feedback-with-mock-up/11963
- https://www.youtube.com/watch?v=Fy0aCDmgnxg (*)
- https://www.youtube.com/watch?v=AJdEqssNZ-U (*)
- https://en.wikipedia.org/wiki/Weber%E2%80%93Fechner_law
- https://easings.net/#easeOutBack
