# 机制拆解 03 · 读指令 (Input Reading) — Research Fact Sheet

Compiled 2026-11-10. Confidence: **H** = primary/dev/doc-confirmed, **M** = reputable press or single technical source, **L** = community/forum/search-snippet only (unverified by me).
Tags: `[DEV]` developer-confirmed · `[DOCS]` modder/datamine documentation · `[PRESS]` journalism · `[COMM]` community-observed · `[DEBATE]` contested.

## 0. Corrections to the brief (read first)
1. **PB0 has no system called "stress".** Closest real mechanic is **Sha-Chi (杀气)**, a shared friend-and-foe resource (stamina + posture + guard). See section 4.
2. **Malenia's heal-punish is not Waterfowl Dance.** Waterfowl Dance is triggered by her HP threshold (about 75% and below, per guides). The heal-punish people mean is a separate "gigantic thrust" (GamesRadar does not name the move). The same press piece says Sekiro's Genichiro does a near-identical thing. Do not caption Waterfowl Dance as the heal punish.
3. **Elden Ring "input reading" is, per the best evidence, animation/state-event reading, not raw button reading.** The AI docs show the *player's behaviour script fires an AI interrupt when the action starts*. In practice that is a same-moment reaction. This is the core "reading the commitment, not the button" lesson.
4. **PB0's own producer says they do NOT use input reading** (Automaton interview, 2026-10-09). This is the strongest line for the video's PB0 segment.
5. **Release:** PB0 was announced for 2026-09-09, then **delayed to 2026-10-29**, and it **launched on 2026-10-29** (PS5 + PC). It is out as of Nov 2026.
6. **No FromSoftware/Miyazaki statement on input reading found.** Press (Vidaextra) says FromSoftware has never confirmed anything about it.
7. **Dark Souls 1/2/3 specific examples: I found no solid source.** Only the shared AI engine docs (DS3/Sekiro/ER share interrupt names). Don't claim DS1–3 cases without your own testing.

---

## 1. What input reading is (definitions, implementation)

| # | Fact | 中文旁白 | Source | Conf |
|---|------|---------|--------|------|
| 1.1 | Three ways an enemy can know what you are doing: (a) read the **button/input**, (b) read the **action-request / state event** the frame your character commits, (c) **see the animation** after a perception delay (like a human). (a)/(b) beat (c) by roughly 10–20 frames of human reaction time. Framing is ours; the numbers in section 6. | 「读指令」不是真的看你的手柄，而是在你出手的同一帧就知道你要干什么，比肉眼看动作早了十几帧。 | synthesis of 3.4, 3.5, 2.1, 6.x | M |
| 1.2 | Basic implementation: the player's action state machine emits an event when an action starts (attack, item use). The AI subscribes to that event as an "interrupt" and re-plans in the same frame. A perception-delay AI instead polls animation state and waits N frames before acting. | 一个是「出手就通知AI」，一个是「AI自己看动画，再等反应时间」。 | ERAiAPI `INTERUPT_FindAttack` / `INTERUPT_UseItem` doc, see 3.4 | M (doc is real; generalisation is ours) |

---

## 2. Early history: fighting-game CPUs

| # | Fact | 中文旁白 | Source | Conf |
|---|------|---------|--------|------|
| 2.1 | **Street Fighter II (arcade ROM reverse engineering):** each animation frame carries a "yoke" (joystick/button) value in its metadata, and the AI peeks at it to pick a counter script. "The computer sees the yoke of your move as soon as you have input it, before the first animation frame has even displayed. As such it gets one more frame of advantage on top of your reaction time." Also: charge moves are executed as script instructions so they "cannot fail". Nuance: it reads the pending move's data, not literal pad hardware. | 街霸2的电脑，在你的招式第一帧画面出现之前就已经看到了你的出招数据。 | https://sf2platinum.wordpress.com/2017/01/20/the-ai-engine/ (blog from disassembly); summarised by Game Developer https://www.gamedeveloper.com/programming/have-a-peek-inside-the-ai-code-of-i-street-fighter-ii-i- | **H** (technical blog) / M (summary) |
| 2.2 | SF2 CPU cheats beyond input reading (Desk's video: instant invulnerability etc.). Press summary only. | 街霸2的电脑作弊不止读指令，还有无敌帧、不会失败的蓄力。 | https://www.nintendolife.com/news/2019/09/video_how_the_cpu_used_to_cheat_in_street_fighter_ii (page returned 403 to me; seen via search snippets) | L |
| 2.3 | **"SNK boss syndrome":** bosses that read player input and counter immediately; traced back to Geese Howard in the original Fatal Fury; Rugal's Genocide Cutter cited as best example. Giant Bomb wiki says affected bosses "time their counterattack immediately after the player performs a move". No frame data given. | SNK的Boss，你一出手他立刻反击，玩家管这叫「SNK综合征」。 | https://giantbomb.com/wiki/Concepts/SNK_Boss_Syndrome (403 for me; via search snippet) | L–M |
| 2.4 | Fan guides describe Neo-Geo CPUs as "input reading": "the CPU will read your inputs, then counter with predetermined movements". Samurai Shodown II's Mizuki is the example. | 在SNK格斗里，读指令是公开的秘密，玩家早就学会用「骗招」去反制。 | https://gog.com/forum/snk/samurai_shodown_2_how_to_fight_the_cpu (community) | L |
| 2.5 | Fighting-game AI in general: "most AI implementations in fighting games ... are built as reactive agents" responding with pre-built macros; humans respond "at around 12–19 frames in a 60 fps game". Context: Killer Instinct Shadow AI (GDC 2016 talk, Hayles and Neal). | 格斗游戏的传统AI就是反应型的：你做A，它回B。 | https://www.gamedeveloper.com/programming/the-killer-groove-the-shadow-ai-of-killer-instinct ; talk: https://gdcvault.com/play/1022992/Designing-AI-for-Competitive | M |
| 2.6 | Modern contrast: SF6 CPU (CEDEC 2024, Capcom's Naohiro Yasuhara): actions are "cards" in decks per situation, 8 difficulty levels; it detects player actions and adapts but the article does not explain the detection mechanism. | 街霸6的电脑用「卡牌」选招，试图像人。 | https://www.gamebusiness.jp/article/2024/09/06/23466.html | M |

---

## 3. FromSoftware

| # | Fact | 中文旁白 | Source | Conf |
|---|------|---------|--------|------|
| 3.1 | **Elden Ring heal punish (community-observed):** a Reddit clip shows Malenia lunging with a "gigantic thrust attack" whenever the player drinks a Flask of Crimson Tears. GamesRadar notes Sekiro's Genichiro does the same (leaping thrust when you heal) and speedrunners bait it, then Mikiri Counter. "Hard-coded to pull off the same attack when they see the player healing." No Mikiri-style counter exists vs Malenia's version. | 你一喝药，玛莲妮亚就一枪捅过来；只狼里的苇名一心前身——弦一郎，也是同一套。 | https://gamesradar.com/this-elden-ring-boss-most-annoying-attack-is-bound-directly-to-your-healing-flask (2022) | M |
| 3.2 | Godskin Guy (Elden Ring) fires a fireball as soon as the flask is pulled. Not every healing method is punished, which is why it is not a pure button read. | 黑火球在你拔出药瓶的瞬间就到了。 | https://www.pcgamer.com/elden-ring-dataminer-explains-why-enemies-smack-you-when-you-reach-for-a-potion (Ted Litchfield, 2022-08-26) | M |
| 3.3 | **Zullie the Witch analysis (2022-08-24):** enemies react as the *animations start*, not to the button. "Technically, enemies are only reacting to in-game information, not input data. However, those reactions will happen the instant the frames of animation start to play." Proof point: you can queue a heal at the end of a dodge; a true input reader would attack before the heal animation starts, but enemies wait for it. Same system makes bosses dodge spells even when you aim the wrong way. Zullie admits "some amount of conjecture" because there is no decompiled exe. | 严格说不是读按键，是读动画；但它在动画第一帧就反应，所以手感上和读指令没区别。 | video https://www.youtube.com/watch?v=XSbuGGnntRA ; coverage https://gamesradar.com/heres-why-elden-ring-enemies-stab-you-every-time-you-try-to-heal and PC Gamer link above | M–H |
| 3.4 | **Datamine/doc evidence (ERAiAPI, "Documentation of the Elden Ring AI", maintained by ElaDiDu):** AI interrupt types include `INTERUPT_FindAttack` ("Activates when a target attacks, called through HKS script, act(143, 0)"), `INTERUPT_UseItem` ("Activates when a target uses an item, called through HKS script, act(143, 1)"), `INTERUPT_Shoot`, `INTERUPT_GuardBegin`, `INTERUPT_MissSwing`, `INTERUPT_EventRequest`. HKS is the character behaviour (animation state-machine) script, so **the player's own state machine pushes an "I attacked / I used an item" interrupt to nearby AIs at the moment the action state starts.** This is documentation of engine API, not a dump proving a specific boss script uses it for a specific move. | 玩家的动作脚本一开始跑，就会给AI发一个「他出手了/他用道具了」的中断。 | https://eladidu.github.io/readable-ds-lua/d1/d81/class_ai_func.html (see `IsInterupt`) | **H** for API, M for interpretation |
| 3.5 | The same docs note several AI functions are "Used in DS3/Sekiro ... Unused in ER", so the Lua AI framework is shared across DS3, Sekiro and ER. | 魂系的AI框架是一脉相承的。 | same URL | M |
| 3.6 | **Developer statements:** none found from Miyazaki/FromSoftware. Vidaextra: FromSoftware "has never confirmed" learning/adaptive behaviour. | 官方从没承认过「读指令」。 | https://www.vidaextra.com/accion/jefes-phantom-blade-zero-hacen-que-muchos-jugadores-creian-que-hacian-elden-ring-aprender-jugador-adaptarse (2026-10-12) | M (absence of evidence) |
| 3.7 | **Debated:** "does it count as input reading?" PC Gamer's author frames it as heal punishes being deliberate difficulty design, adapting like Bloodborne removing shields and Sekiro nerfing dodge i-frames. Steam threads: some say it is just reaction to the action; a commenter even claims the trigger is the flagged item appearing (anecdotal). Whether the trigger frame is the very first animation frame vs a few frames in is not publicly measured. | 到底算不算读指令？取决于你怎么定义——但对玩家来说，结果一样。 | PC Gamer link in 3.2; https://steamcommunity.com/app/1245620/discussions/0/4343240316590197979 | L–M |
| 3.8 | I did not find sourced Dark Souls 1/2/3 boss-specific input-reading cases or an authoritative list of ER bosses with heal-punish scripts. | — | gap | — |

---

## 4. Phantom Blade Zero (影之刃零)

| # | Fact | 中文旁白 | Source | Conf |
|---|------|---------|--------|------|
| 4.1 | **Producer Soulframe (梁其伟) on highest difficulty:** designed to feel like PvP against a real person: feints, stopping mid-combo to watch your reaction. He then says: "極限状態になればコンピューターがプレイヤーの操作入力を見透かすようになり…絶対に勝てなくなってしまう…**制作において「入力読み」は一切使用していません**" (a maxed-out AI would see through your controller inputs and be unbeatable; "we do not use input reading at all in production"). Tuned to feel "a little smart" but not unfair. | 影之刃零制作人明确说：我们完全没有使用读指令。 | https://automaton-media.com/articles/interviewsjp/20261009-472623/ (Japanese joint interview, 2026-10-09) | **H [DEV]** |
| 4.2 | Same interview: top difficulty **逆天者 (Hellwalker)** = **66日 (66 days)**, the latter just adds a 66-death limit. AI changes dynamically; bosses respond to player actions "so there are no fixed patterns", behaviour varies each run; no dev has cleared it without dying. | 最高难度里，Boss会根据你的行动随机应变，没有固定套路。 | same | **H [DEV]** |
| 4.3 | Easiest mode 入門者 (Beginner) eases mostly via enemy "**attack aggression**" and "**enemy reaction speed to player actions**" (プレイヤーの行動に対する敵の反応速度), not stats. Enemies circle but attack less. | 简单模式不是削血量，而是让敌人「反应慢一点、没那么想打你」。 | same | **H [DEV]** |
| 4.4 | Press corroboration: Hellwalker "integrally changes enemy AI ... even the combos"; enemies "adapt to your combat style"; a learned combo string "might get interrupted halfway through with a new attack". Inverse hands-on, 2025-08-06. | 同一套连招，高难度下可能被半路打断。 | https://nc.inverse.com/gaming/phantom-blade-zero-hard-mode-different-game-hellwalker-wuxia | M [PRESS] |
| 4.5 | **No "stress" system exists** in anything I found. Closest: **Sha-Chi (杀气)** — "Sha-chi (aka stamina)" (PC Gamer). Shared by player and enemy; sources describe it as stamina + posture + guard in one bar. Holding block drains it; hitting enemies and perfect parries drain theirs; empty = guard-break/execute window. Enemy "posture bar" wording: Gamersocialclub. Details of numbers (weapon swap refills bar) come from guides/CGMagazine, not official. | 杀气：敌我共用的一条资源，既是体力也是架势条，打空对方的杀气就破防。 | PC Gamer https://www.pcgamer.com/games/action/phantom-blade-zero-preview-chinese-action-games-soulslikes-kung-fu (2025-08-08) · https://gamersocialclub.ca/2025/08/28/phantom-blade-zero-hands-on-preview · CN: https://news.17173.com/content/10102026/110329880.shtml (cites CGMagazine) · https://www.18183.com/gonglue/202608/04molg0k.html (guide) | M (PRESS) / L (numbers) |
| 4.6 | **Colour-coded telegraphs:** blue "Brutal" attacks (blockable; block costs a huge chunk of Sha-Chi; perfect parry → Ghoststep); red "Killer" attacks (can't be blocked/parried; last-second dodge → Ghoststep). CN guide: red/white flash cues exist so "快慢刀" cannot ambush first-time players. | 红光闪避，蓝光弹反——影之刃零把「该怎么应对」直接画在敌人身上。 | PC Gamer link in 4.5; 18183 guide | M (PRESS) |
| 4.7 | Combat director Qianli Ma (PC Gamer): "giving up the accuracy of input to bring out the fast-paced combat". About player-input forgiveness, not enemy AI, but quotable. | 为了更快的节奏，他们甚至放弃了一部分输入精度。 | PC Gamer link in 4.5 | M |
| 4.8 | **Release status:** announced 2026-09-09 → **delayed to 2026-10-29** (June 2026, ~50 days) → **launched 2026-10-29** on PS5 + PC (Steam/Epic). Metacritic 88 (40 critics). Studio claims 4M+ sold in 72 h (studio claim via press). Note some sources say Oct 28 (time zones); stale Metacritic placeholder still shows Sep 9. | 影之刃零2026年10月29日已经发售。 | https://www.gematsu.com/2026/06/phantom-blade-zero-delayed-to-october-29 · https://www.destructoid.com/phantom-blade-zero-excellent-2026-launches-reviews-say/ (Oct 28 + 88) · https://dotesports.com/general/news/phantom-blade-zero-sells-4m-copies-72-hours (4M; page 403 for me, from search snippet) | H (date) / M (sales) |
| 4.9 | Steam app id for PB0: **4115450**. I could not fetch the Steam store page (connection reset), so store-page wording is unverified. | — | https://store.steampowered.com/app/4115450/ | — |

---

## 5. Psycho Mantis (Metal Gear Solid, 1998)

| # | Fact | 中文旁白 | Source | Conf |
|---|------|---------|--------|------|
| 5.1 | He reads the **memory card** and comments on other Konami saves: Castlevania: Symphony of the Night, Suikoden, Azure Dreams, Vandal Hearts, Tokimeki Memorial, Policenauts. Twin Snakes (2004) comments on Melee, Sunshine, Wind Waker, Eternal Darkness saves. | 他翻你的存档卡，连你玩过《恶魔城》都知道。 | https://en.wikipedia.org/wiki/Psycho_Mantis (cites Hardcore Gaming 101, IGN) | M |
| 5.2 | With a DualShock he tells you to **put the controller down**, then makes it **vibrate / move** (telekinesis gag). | 他让你把手柄放桌上，然后手柄自己震动起来。 | same | M |
| 5.3 | In the fight he seems to read every move. **Fix: unplug the controller from port 1 and plug it into port 2**, so he "can no longer read" you. Community logic: port-1 input is fed into his logic, port 2 isn't. Hints are given in-game (Codec). | 把手柄插到2号口，他就读不到你了——他读的是1号口的输入。 | Wikipedia above; guide https://www.gamepro.de/artikel/playstation-1-bosskampf-heute-nicht-mehr-moeglich,3428233.html (mechanism wording is community) | M (fact) / L (mechanism) |
| 5.4 | **"HIDEO" screen:** mid-fight he yells "Blackout!" and the screen goes black with a green caption mimicking a TV/VCR input label ("VIDEO"), but reading **"HIDEO"** (Kojima's first name). Players thought it was a glitch. **Corner (top-left vs top-right) is inconsistent across sources — verify on footage before captioning.** Not mentioned on Wikipedia. | 黑屏角落写着HIDEO，仿佛电视切了信号——小岛秀夫的恶作剧。 | search results quoting Giant Bomb/TV Tropes-type pages; e.g. https://www.gamesradar.com/101-greatest-gaming-moments-final-day/7 (not opened) | L |
| 5.5 | Design: Kojima drew from the 1978 film *The Fury*; swapping controller ports was "the only method he could think of"; younger team members found it controversial; Kojima later named Mantis his favourite character. | 小岛想到表现读心的办法，只有「换手柄口」。 | Wikipedia Psycho Mantis (cites Gamers Today, Game Rant) | M |
| 5.6 | Modern ports: PlayStation Master Collection lets you create virtual Konami save data and virtually swap controller ports; PC needs keyboard trick. | 合集里，换手柄口变成了菜单选项。 | https://en.wikipedia.org/wiki/Metal_Gear_Solid:_Master_Collection_Vol._1 ; IGN explainer https://www.youtube.com/watch?v=UGRCf4WZWoE | M |
| 5.7 | **Why it's the meta joke (editorial):** the AI doesn't look at the animation; it "reads" the physical hardware (controller port, memory card). Input reading made literal, and the cure is also hardware: change the port. Our framing, not a Kojima quote. | 其他游戏的AI假装没读你的手柄，他是真的读。 | editorial | — |

---

## 6. Principles for a WebGL demo: fair vs unfair reaction

| # | Fact / number | 中文旁白 | Source | Conf |
|---|---------------|---------|--------|------|
| 6.1 | Simple visual reaction ≈ 200–250 ms. A small peer-reviewed optometry study measured ~208–224 ms (single population). Consumer sites: 200–250 ms (18–35 y). Use 250 ms as the demo's default "human" line. | 人的视觉反应大约是0.2到0.25秒。 | https://pmc.ncbi.nlm.nih.gov/articles/PMC6916673 (small sample) | M |
| 6.2 | In frames @60 fps: 250 ms ≈ 15 frames. Capcom's SFV seminar: reaction "alone ... is going to be at least 10 frames". KI analysis (ki.infil.net): 265 ms ≈ 16 frames; moves with <16 f startup can't be reacted to. Killer Groove article: humans respond "around 12–19 frames". | 格斗游戏里，人的反应大概是12到19帧。 | https://game.capcom.com/cfn/sfv/column/112424?lang=en (from snippet) · https://ki.infil.net/reaction.html · Killer Groove link (2.5) | M |
| 6.3 | AI research practice: enforce a delay on AI actions to match humans: ~230 ms in a pro fighting-game AI study (matches pro reaction time); OpenAI enforces a specific reaction time; "At Human Speed" adds a fixed action delay. | 做公平AI最直接的办法：给它加一段人类水平的反应延迟。 | https://arxiv.org/pdf/1904.03821 · https://arxiv.org/pdf/1903.07008 · https://arxiv.org/pdf/1810.07286 | M |
| 6.4 | **Fairness is perception.** Soren Johnson (Game Developer, 2009): "For asymmetrical games, cheating is simply bad game design – imagine the frustration which would result from enemies instantly spotting a player hiding in the shadows." Players must never even *suspect* the game cheats; transparency of rules builds trust. | 玩家觉得被作弊，比真的作弊更致命。 | https://www.gamedeveloper.com/game-platforms/analysis-game-ai-our-cheatin-hearts (published in Game Developer magazine May 2009; web 2009-09-14) | **H** |
| 6.5 | GDC sources: (a) Killer Instinct Shadow AI — Hayles and Neal, GDC 2016, "Designing AI for Competitive Games": https://gdcvault.com/play/1022992/Designing-AI-for-Competitive ; (b) Ubisoft/Eric Martel "Can You See Me Now? Building Robust AI Sensory Systems" (GDC AI Summit; year not verified): https://gdcvault.com/play/1026497/contactUs — about perception systems and readable AI state; (c) Isla, "Handling Complexity in the Halo 2 AI" (GDC 2005): perception filtered through a per-actor "prop" model so the AI can't see through walls: https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai . **I found no GDC talk that specifically prescribes a reaction-time budget**; (a)-(c) are supporting, not definitive. | 好的AI要先「看见」再「反应」，中间要有延迟。 | as listed | M (they exist) / L (content relevance for (b)) |
| 6.6 | Demo design from the above (our recommendation): three AI modes on the same duel. **(A) Button reader:** reacts on the frame of the input event (0 f). **(B) Commitment reader:** reacts on the first frame of the player's *action state* (0–1 f) — the Souls/ER behaviour. **(C) Perceptual:** reacts to what is *visible* (animation pose change) after a delay slider (default 15 f ≈ 250 ms), with telegraph length visible. Show: player startup frames vs AI reaction frames; if startup < reaction budget, (C) can't punish and (A)/(B) can — that gap *is* the "unfair feeling". Add PB0's colour-coded telegraph (red = dodge, blue = parry) as the fair-feedback example, and the "reaction speed" slider as the same knob PB0 uses for Beginner mode. | 把AI分三档：读按键、读动作、看画面——差距就是「不公平感」。 | synthesis of 1.x, 3.x, 4.3, 4.6, 6.x | — |

---

## 7. YouTube footage candidates (metadata via yt-dlp, 2026-11-10)

Official channel flag: **PB0** = channel "Phantom Blade Zero" (S-GAME). **Gated** = age-restricted; yt-dlp needs `--cookies-from-browser` (metadata above came from flat search, not verified for download).

| ID | Title | Channel | Dur | Date | Notes |
|----|-------|---------|-----|------|-------|
| qgJBFa952mY | Phantom Blade Zero - Official Launch Trailer | Phantom Blade Zero | 3:12 | 2026-10-22 | official, not gated |
| Ogm8X8SSyxs | Phantom Blade Zero - Year of the Snake Gameplay Trailer 2025 | Phantom Blade Zero | 5:58 | 2025-01-22 | official, not gated; combat/boss footage |
| hXyPbvj7A7w | Phantom Blade Zero — Pre-Order Trailer (11-min gameplay) | Phantom Blade Zero (Donnie Yen shared channel) | 11:02 | 2026-08-12 | official, not gated; same content as IGN 9W07UNNY0ms |
| 9W07UNNY0ms | Phantom Blade Zero: 11-Minute Extended Gameplay Trailer | IGN | 11:02 | 2026-08-12 | IGN-hosted; prefer the official copy above |
| blh1v1dGJ2s | Phantom Blade Zero – State of Play Gameplay Deep Dive | PS5 Games / PlayStation | 20:52 | 2026-08-17 | **gated**; best for combat/Sha-Chi/difficulty explanation |
| ZX1k0z2pPY0 | Year of the Snake Gameplay Trailer | PS5 Games / PlayStation | 6:03 | 2025 | **gated** |
| b68WE-eZ-Cc | "The Blade is Drawn" Gameplay Trailer | PS5 Games / PlayStation | 1:51 | n/a | **gated** |
| Q89X4nOzxGw | Release Date Announcement Trailer | PS5 Games / PlayStation | 4:10 | 2025-12 (TGA) | **gated** |
| cr5y9l0Wje8 | Launch Trailer | PS5 Games / PlayStation | 3:16 | 2026-10 | **gated** |
| E3Huy2cdih0 | ELDEN RING - Official Gameplay Reveal | BANDAI NAMCO Europe | 2:59 | 2021-06-10 | boss/combat, not gated |
| JldMvQMO_5U | ELDEN RING - Gameplay Preview | BANDAI NAMCO Europe | 20:55 | 2021-11-04 | long, flasks/bosses likely; not frame-checked |
| qLZenOn7WUo | ELDEN RING Shadow of the Erdtree - Official Gameplay Reveal Trailer | BANDAI NAMCO Europe | 3:06 | 2024-02-21 | not gated |
| M-Xh4vbs6go | ELDEN RING Shadow of the Erdtree - Official Launch Trailer | BANDAI NAMCO Europe | 3:19 | 2024-06-20 | not gated |
| 0J4u1FD87FM | Dark Souls III: The Fire Fades Edition "Our Curse" Launch Trailer | Bandai Namco Entertainment America | 1:56 | 2017-04-21 | not gated |
| cWBwFhUv1-8 | Dark Souls III – Launch Trailer | PlayStation | 2:58 | 2016 | **gated** |
| rXMX4YJ7Lks | Sekiro: Shadows Die Twice - Official Launch Trailer | PlayStation | 2:48 | 2019 | **gated** (Genichiro heal-punish footage must be self-captured) |
| EUmK5Ay8RIQ | Metal Gear Solid Master Collection Vol. 1 - Launch Trailer | PS5 & PS4 Games / PlayStation | 2:34 | 2023-10-24 | not gated; **not verified to show Mantis** |
| OI9_PFZtpsg | Overview Trailer, MGS Master Collection Vol.1 | Konami | 3:10 | 2023 | **gated**; not verified to show Mantis |
| mo_QG9_NXUc | MGS Master Collection Vol.1 Gameplay and Platforms Reveal | ESRB / Konami | 1:35 | 2023 | **gated** |
| UGRCf4WZWoE | How Psycho Mantis Works in the MGS Master Collection | IGN | 2:54 | 2023-10-24 | explainer, not official publisher footage |
| XSbuGGnntRA | Elden Ring - It's complicated | Zullie the Witch | 3:01 | 2022-08-24 | **citation only** (creator content); 1.07M views |

**Footage gaps:** no official Malenia heal-punish clip, no official Mantis fight clip, no official Sekiro/Genichiro heal clip. These need self-capture (or licensed Master Collection capture) and should be framed as "gameplay recording" rather than official trailers.

---

## 8. Open items / verify before publishing
- Verify "HIDEO" corner and exact caption wording on real footage (5.4).
- Confirm PB0 Steam wording at https://store.steampowered.com/app/4115450/ (unreachable here).
- Capture SF2/SNK footage (2.2–2.4 are weak sources for the SNK part); consider the sf2platinum post as the anchor.
- If a frame count is wanted for ER "reaction frame", test it in-game; no public measurement exists.
- Chinese term for Sha-Chi (杀气) comes from CN press/guides, not an official CN glossary.
