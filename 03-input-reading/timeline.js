window.TIMELINE = {
 "duration": 213.882,
 "scenes": [
  {
   "id": "hook",
   "kicker": "机制拆解 · 第 3 期",
   "title": "它是不是在读你？",
   "start": 0.0,
   "voiceEnd": 24.733,
   "end": 25.633,
   "lines": [
    {
     "zh": "影之刃零里，隐藏 Boss 新娘阿花，一口气对玩家连放了五次红光投技。",
     "en": "In Phantom Blade Zero, the hidden boss Bride Ahua hit one player with five red-flash grabs in a row.",
     "start": 0.6,
     "end": 6.151,
     "rehook": "钩子"
    },
    {
     "zh": "这段视频在 B 站播放了五十多万次，评论区都在说：它知道你不会躲。",
     "en": "The clip passed half a million views on Bilibili. The comments all say: it knows you can't dodge it.",
     "start": 6.371,
     "end": 11.387,
     "say": "这段视频在 B 站播放了五十多万次，评论区都在说，它知道你不会躲。"
    },
    {
     "zh": "魂游戏里也一样，你刚举起葫芦，弦一郎一枪就捅了过来。",
     "en": "Souls games are the same: you raise your gourd, and Genichiro's spear is already coming.",
     "start": 11.607,
     "end": 15.489
    },
    {
     "zh": "你有没有想过，它们是不是在偷看你的手柄？",
     "en": "Have you ever wondered whether they are peeking at your controller?",
     "start": 15.709,
     "end": 18.441,
     "rehook": "问"
    },
    {
     "zh": "这期机制拆解，把读指令从头讲清楚，最后照着影之刃零的思路，写一个能玩的 Boss。",
     "en": "This time we explain input reading from the ground up, then build a playable boss the Phantom Blade Zero way.",
     "start": 18.661,
     "end": 24.733
    }
   ]
  },
  {
   "id": "levels",
   "kicker": "01 · 三种「知道」",
   "title": "敌人怎么知道你在干嘛？",
   "start": 25.633,
   "voiceEnd": 50.835,
   "end": 51.735,
   "lines": [
    {
     "zh": "敌人想知道你在干嘛，大概有三种办法。",
     "en": "An enemy has roughly three ways to know what you are doing.",
     "start": 25.633,
     "end": 28.379,
     "rehook": "问"
    },
    {
     "zh": "先说一个单位：一帧是六十分之一秒。人看到画面再按键，大概要十五帧。",
     "en": "First, a unit: one frame is a sixtieth of a second. Seeing something and pressing a button takes a person about fifteen frames.",
     "start": 28.599,
     "end": 33.826
    },
    {
     "zh": "第一种，直接读按键，你按下的那一帧它就知道了。",
     "en": "One: read the button. It knows on the very frame you press it.",
     "start": 34.046,
     "end": 37.766
    },
    {
     "zh": "第二种，读动作，你的角色一开始出招，系统就通知它。",
     "en": "Two: read the action. The moment your character commits, the system tells it.",
     "start": 37.986,
     "end": 42.096
    },
    {
     "zh": "第三种，像人一样看画面，看到你抬手，再花零点二五秒反应。",
     "en": "Three: watch the screen like a human, see you raise your arm, then take a quarter of a second to react.",
     "start": 42.316,
     "end": 46.875
    },
    {
     "zh": "前两种都比人快了十几帧，玩家感受到的，就是被读了。",
     "en": "The first two are a dozen-plus frames faster than a person. To the player, that feels like being read.",
     "start": 47.095,
     "end": 50.835,
     "rehook": "反转"
    }
   ]
  },
  {
   "id": "arcade",
   "kicker": "02 · 街机时代",
   "title": "SNK 综合征",
   "start": 51.735,
   "voiceEnd": 66.053,
   "end": 66.953,
   "lines": [
    {
     "zh": "最早的读指令，来自街机格斗游戏。",
     "en": "The earliest input reading comes from arcade fighting games.",
     "start": 51.735,
     "end": 54.277
    },
    {
     "zh": "有人逆向过街霸二的程序：你的招式数据一产生，电脑就能看到，比第一帧画面还早一帧。",
     "en": "Someone reverse-engineered Street Fighter II: the CPU sees your move's data the moment it exists, a frame before the first animation frame.",
     "start": 54.497,
     "end": 60.808
    },
    {
     "zh": "SNK 的 Boss 更夸张，你一出手就被反击，玩家管这叫 SNK 综合征。",
     "en": "SNK bosses were worse: counter the instant you move. Players call it SNK Boss Syndrome.",
     "start": 61.028,
     "end": 66.053,
     "say": "S N K 的 Boss 更夸张，你一出手就被反击，玩家管这叫 S N K 综合征。"
    }
   ]
  },
  {
   "id": "souls",
   "kicker": "03 · 魂系列",
   "title": "喝药，就会被捅",
   "start": 66.953,
   "voiceEnd": 90.452,
   "end": 91.352,
   "lines": [
    {
     "zh": "到了魂系列，最有名的是喝药惩罚。",
     "en": "In the Souls series, the most famous case is the heal punish.",
     "start": 66.953,
     "end": 69.362,
     "rehook": "钩子"
    },
    {
     "zh": "有 UP 主专门测过只狼的弦一郎：他站着不动的时候，你喝葫芦，他一定突刺。",
     "en": "One creator tested Sekiro's Genichiro: if he's standing idle when you drink, he always thrusts.",
     "start": 69.582,
     "end": 74.787,
     "say": "有 U P 主专门测过只狼的弦一郎，他站着不动的时候，你喝葫芦，他一定突刺。"
    },
    {
     "zh": "法环的玛莲妮亚也一样，看到你喝药就会冲过来。",
     "en": "Elden Ring's Malenia does the same: she lunges the moment you heal.",
     "start": 75.007,
     "end": 78.517
    },
    {
     "zh": "但有人拆过法环的人工智能脚本，触发它的不是按键，而是你使用道具的动作开始的那一刻。",
     "en": "But modders who dug into Elden Ring's AI scripts found the trigger is not the button. It is the moment your item-use action begins.",
     "start": 78.737,
     "end": 84.769,
     "rehook": "反转"
    },
    {
     "zh": "所以它读的是你已经承诺的动作，只是快到看不出区别。官方从来没有正式承认过。",
     "en": "So it reads an action you have already committed to, just too fast to tell apart. The developer has never confirmed it.",
     "start": 84.989,
     "end": 90.452
    }
   ]
  },
  {
   "id": "mantis",
   "kicker": "04 · 1998",
   "title": "真的在读你的手柄",
   "start": 91.352,
   "voiceEnd": 112.559,
   "end": 113.459,
   "lines": [
    {
     "zh": "真正读你硬件的，反而是一九九八年的合金装备。",
     "en": "The one that truly read your hardware was Metal Gear Solid, back in 1998.",
     "start": 91.352,
     "end": 94.611,
     "rehook": "反转"
    },
    {
     "zh": "心理螳螂会翻你的记忆卡，说出你玩过哪些科乐美游戏，还让手柄自己震起来。",
     "en": "Psycho Mantis reads your memory card, names the Konami games you have played, and makes your controller shake by itself.",
     "start": 94.831,
     "end": 100.018
    },
    {
     "zh": "更狠的是战斗：他能读到你手柄上的每一个操作，你怎么打，他都提前躲开，几乎是无敌的。",
     "en": "Worse, the fight: he reads every input on your controller, dodges whatever you do in advance, and is practically invincible.",
     "start": 100.238,
     "end": 106.489,
     "rehook": "钩子"
    },
    {
     "zh": "游戏里的提示是，把手柄插到二号口。他读的是一号口，换了口，他就读不到你了。",
     "en": "The in-game hint: plug your controller into port two. He reads port one, so once you switch, he can't read you anymore.",
     "start": 106.709,
     "end": 112.559
    }
   ]
  },
  {
   "id": "pb0",
   "kicker": "05 · 影之刃零",
   "title": "开发中，一切读指令都没用",
   "start": 113.459,
   "voiceEnd": 125.457,
   "end": 126.357,
   "lines": [
    {
     "zh": "那影之刃零呢？",
     "en": "So what about Phantom Blade Zero?",
     "start": 113.459,
     "end": 114.605,
     "rehook": "问"
    },
    {
     "zh": "制作人梁其伟在采访里说，开发中完全没有使用读指令。",
     "en": "Producer Soulframe Liang said in an interview that they used no input reading at all.",
     "start": 114.825,
     "end": 118.841,
     "rehook": "反转"
    },
    {
     "zh": "最高难度逆天者里，Boss 会根据你的行为随机应变；简单模式不削血，而是让敌人反应慢一点。",
     "en": "On Hellwalker, bosses adapt to what you do. Easy mode doesn't cut their health; enemies just react slower.",
     "start": 119.061,
     "end": 125.457
    }
   ]
  },
  {
   "id": "pressure",
   "kicker": "06 · 压力系统",
   "title": "它读的是你的状态",
   "start": 126.357,
   "voiceEnd": 160.572,
   "end": 161.472,
   "lines": [
    {
     "zh": "那新娘为什么偏偏连放红光？B 站 UP 主尾巴尾巴啊做了一期测试，给出了一个解释。",
     "en": "Then why does the Bride keep throwing red flashes? Bilibili creator Weiba Weiba tested it and offered an explanation.",
     "start": 126.357,
     "end": 132.514,
     "rehook": "问",
     "say": "那新娘为什么偏偏连放红光？B 站 U P 主尾巴尾巴啊做了一期测试，给出了一个解释。"
    },
    {
     "zh": "他把一个隐藏分显示了出来，称为压力系统：Boss 会评估你的血量、按键频率、喝药和反应速度。",
     "en": "He made a hidden score visible and called it the pressure system: the boss rates your health, how fast you press, your healing and your reactions.",
     "start": 132.734,
     "end": 139.338
    },
    {
     "zh": "你越慌，分越高；分越高，Boss 越容易放最狠的那几招。",
     "en": "The more you panic, the higher the score, and the higher it goes, the more often the boss picks its nastiest moves.",
     "start": 139.558,
     "end": 143.663
    },
    {
     "zh": "你狂按闪避，它来剑气；你在喝药，它也来剑气。",
     "en": "Mash dodge, and you get a sword wave. Heal, and you get one too.",
     "start": 143.883,
     "end": 147.726
    },
    {
     "zh": "B 站评论区里，玩家也说出了同样的感觉：你越不会躲哪一招，它就越频繁地出哪一招。",
     "en": "In the Bilibili comments, players describe the same feeling: whichever move you can't dodge, it uses more and more.",
     "start": 147.946,
     "end": 153.835
    },
    {
     "zh": "这些是玩家的实测和推测，不是官方说明。但它解释了一件事：它读的不是按键，而是你的状态。",
     "en": "These are player tests and guesses, not official statements. But they explain one thing: it doesn't read your buttons. It reads your state.",
     "start": 154.055,
     "end": 160.572,
     "rehook": "反转"
    }
   ]
  },
  {
   "id": "impl",
   "kicker": "07 · 影之刃式 Boss",
   "title": "照着压力系统写一个 Boss",
   "start": 161.472,
   "voiceEnd": 185.471,
   "end": 186.371,
   "lines": [
    {
     "zh": "最后，我们照着这些发现，写一个影之刃式的 Boss。",
     "en": "Finally, following these findings, we build a Phantom Blade-style boss.",
     "start": 161.472,
     "end": 164.991,
     "rehook": "钩子"
    },
    {
     "zh": "它不读按键，只读你的状态：血量、按键频率、有没有在喝药，合成一个压力分。",
     "en": "It doesn't read buttons, only your state: health, how fast you press, whether you're healing, combined into a pressure score.",
     "start": 165.211,
     "end": 171.218
    },
    {
     "zh": "压力分决定它抽哪一招：越慌，红光投技和剑气的权重就越高。",
     "en": "The pressure score decides which move it draws: the more you panic, the heavier the red-flash grab and sword wave are weighted.",
     "start": 171.438,
     "end": 175.796
    },
    {
     "zh": "红光不能格挡只能闪，蓝光可以弹反；你一乱按，它就更爱出红光。",
     "en": "Red can't be blocked, only dodged; blue can be parried. Start mashing, and it reaches for red more often.",
     "start": 176.016,
     "end": 181.11
    },
    {
     "zh": "难度高低，就是调它的反应速度、进攻欲望和这张权重表。",
     "en": "Difficulty is just tuning its reaction speed, its aggression and that weight table.",
     "start": 181.33,
     "end": 185.471
    }
   ]
  },
  {
   "id": "demo",
   "kicker": "08 · 效果预览",
   "title": "三种敌人，亲手试试",
   "start": 186.371,
   "voiceEnd": 196.997,
   "end": 197.897,
   "lines": [
    {
     "zh": "这个影之刃式的 Boss 也做成了能玩的网页，还能切换读按键、读动作、看画面三种敌人。",
     "en": "This Phantom Blade-style boss is on a playable page too, alongside the button reader, action reader and screen watcher.",
     "start": 186.371,
     "end": 192.453
    },
    {
     "zh": "你可以亲手试试：冷静出招和狂按乱打，它的反应完全不一样。",
     "en": "Try it yourself: calm, deliberate attacks and frantic mashing get completely different reactions.",
     "start": 192.673,
     "end": 196.997
    }
   ]
  },
  {
   "id": "outro",
   "kicker": "感谢观看",
   "title": "一键三连 + 关注",
   "start": 197.897,
   "voiceEnd": 210.882,
   "end": 213.882,
   "lines": [
    {
     "zh": "感谢几位 UP 主的实测和素材，名字和出处都写在画面和简介里。",
     "en": "Thanks to the creators whose tests and clips we used. Their names and links are on screen and in the description.",
     "start": 197.897,
     "end": 202.395,
     "say": "感谢几位 U P 主的实测和素材，名字和出处都写在画面和简介里。"
    },
    {
     "zh": "如果这期对你有帮助，求一个一键三连，再点个关注。",
     "en": "If this helped, please like, coin and favourite, and hit follow.",
     "start": 202.615,
     "end": 206.382
    },
    {
     "zh": "你被哪个 Boss 读得最狠？评论区告诉我，机制拆解下期见！",
     "en": "Which boss read you the hardest? Tell me in the comments. See you next time on Mechanic Breakdown!",
     "start": 206.602,
     "end": 210.882
    }
   ]
  }
 ],
 "subs": [
  {
   "zh": "影之刃零里",
   "en": "In Phantom Blade Zero,",
   "start": 0.6,
   "end": 1.467
  },
  {
   "zh": "隐藏 Boss 新娘阿花",
   "en": "the hidden boss Bride Ahua hit",
   "start": 1.467,
   "end": 3.549
  },
  {
   "zh": "一口气对玩家连放了五次红光投技",
   "en": "one player with five red-flash grabs in a row.",
   "start": 3.549,
   "end": 6.151
  },
  {
   "zh": "这段视频在 B 站播放了五十多万次",
   "en": "The clip passed half a million views on Bilibili.",
   "start": 6.371,
   "end": 9.122
  },
  {
   "zh": "评论区都在说：它知道你不会躲",
   "en": "The comments all say: it knows you can't dodge it.",
   "start": 9.122,
   "end": 11.387
  },
  {
   "zh": "魂游戏里也一样，你刚举起葫芦",
   "en": "Souls games are the same: you raise your gourd,",
   "start": 11.607,
   "end": 13.871
  },
  {
   "zh": "弦一郎一枪就捅了过来",
   "en": "and Genichiro's spear is already coming.",
   "start": 13.871,
   "end": 15.489
  },
  {
   "zh": "你有没有想过",
   "en": "Have you ever wondered",
   "start": 15.709,
   "end": 16.571
  },
  {
   "zh": "它们是不是在偷看你的手柄？",
   "en": "whether they are peeking at your controller?",
   "start": 16.571,
   "end": 18.441
  },
  {
   "zh": "这期机制拆解，把读指令从头讲清楚",
   "en": "This time we explain input reading from the ground up,",
   "start": 18.661,
   "end": 21.217
  },
  {
   "zh": "最后照着影之刃零的思路",
   "en": "then build a playable",
   "start": 21.217,
   "end": 22.975
  },
  {
   "zh": "写一个能玩的 Boss",
   "en": "boss the Phantom Blade Zero way.",
   "start": 22.975,
   "end": 24.733
  },
  {
   "zh": "敌人想知道你在干嘛，大概有三种办法",
   "en": "An enemy has roughly three ways to know what you are doing.",
   "start": 25.633,
   "end": 28.379
  },
  {
   "zh": "先说一个单位：一帧是六十分之一秒",
   "en": "First, a unit: one frame is a sixtieth of a second. Seeing something",
   "start": 28.599,
   "end": 31.297
  },
  {
   "zh": "人看到画面再按键，大概要十五帧",
   "en": "and pressing a button takes a person about fifteen frames.",
   "start": 31.297,
   "end": 33.826
  },
  {
   "zh": "第一种，直接读按键",
   "en": "One: read the button.",
   "start": 34.046,
   "end": 35.64
  },
  {
   "zh": "你按下的那一帧它就知道了",
   "en": "It knows on the very frame you press it.",
   "start": 35.64,
   "end": 37.766
  },
  {
   "zh": "第二种，读动作，你的角色一开始出招",
   "en": "Two: read the action. The moment your character commits,",
   "start": 37.986,
   "end": 41.024
  },
  {
   "zh": "系统就通知它",
   "en": "the system tells it.",
   "start": 41.024,
   "end": 42.096
  },
  {
   "zh": "第三种，像人一样看画面，看到你抬手",
   "en": "Three: watch the screen like a human, see you raise your arm,",
   "start": 42.316,
   "end": 45.297
  },
  {
   "zh": "再花零点二五秒反应",
   "en": "then take a quarter of a second to react.",
   "start": 45.297,
   "end": 46.875
  },
  {
   "zh": "前两种都比人快了十几帧",
   "en": "The first two are a dozen-plus frames faster than",
   "start": 47.095,
   "end": 48.883
  },
  {
   "zh": "玩家感受到的，就是被读了",
   "en": "a person. To the player, that feels like being read.",
   "start": 48.883,
   "end": 50.835
  },
  {
   "zh": "最早的读指令，来自街机格斗游戏",
   "en": "The earliest input reading comes from arcade fighting games.",
   "start": 51.735,
   "end": 54.277
  },
  {
   "zh": "有人逆向过街霸二的程序：",
   "en": "Someone reverse-engineered Street Fighter II:",
   "start": 54.497,
   "end": 56.49
  },
  {
   "zh": "你的招式数据一产生，电脑就能看到",
   "en": "the CPU sees your move's data the moment it exists,",
   "start": 56.49,
   "end": 59.148
  },
  {
   "zh": "比第一帧画面还早一帧",
   "en": "a frame before the first animation frame.",
   "start": 59.148,
   "end": 60.808
  },
  {
   "zh": "SNK 的 Boss 更夸张",
   "en": "SNK bosses were worse: counter the",
   "start": 61.028,
   "end": 63.038
  },
  {
   "zh": "你一出手就被反击",
   "en": "instant you move.",
   "start": 63.038,
   "end": 64.187
  },
  {
   "zh": "玩家管这叫 SNK 综合征",
   "en": "Players call it SNK Boss Syndrome.",
   "start": 64.187,
   "end": 66.053
  },
  {
   "zh": "到了魂系列，最有名的是喝药惩罚",
   "en": "In the Souls series, the most famous case is the heal punish.",
   "start": 66.953,
   "end": 69.362
  },
  {
   "zh": "有 UP 主专门测过只狼的弦一郎：",
   "en": "One creator tested Sekiro's Genichiro: if he's",
   "start": 69.582,
   "end": 72.11
  },
  {
   "zh": "他站着不动的时候，你喝葫芦",
   "en": "standing idle when you drink,",
   "start": 72.11,
   "end": 74.044
  },
  {
   "zh": "他一定突刺",
   "en": "he always thrusts.",
   "start": 74.044,
   "end": 74.787
  },
  {
   "zh": "法环的玛莲妮亚也一样",
   "en": "Elden Ring's Malenia does the same:",
   "start": 75.007,
   "end": 76.762
  },
  {
   "zh": "看到你喝药就会冲过来",
   "en": "she lunges the moment you heal.",
   "start": 76.762,
   "end": 78.517
  },
  {
   "zh": "但有人拆过法环的人工智能脚本",
   "en": "But modders who dug into Elden Ring's AI scripts",
   "start": 78.737,
   "end": 80.959
  },
  {
   "zh": "触发它的不是按键",
   "en": "found the trigger is not the",
   "start": 80.959,
   "end": 82.229
  },
  {
   "zh": "而是你使用道具的动作开始的那一刻",
   "en": "button. It is the moment your item-use action begins.",
   "start": 82.229,
   "end": 84.769
  },
  {
   "zh": "所以它读的是你已经承诺的动作",
   "en": "So it reads an action you have already committed to,",
   "start": 84.989,
   "end": 87.238
  },
  {
   "zh": "只是快到看不出区别",
   "en": "just too fast to tell apart.",
   "start": 87.238,
   "end": 88.684
  },
  {
   "zh": "官方从来没有正式承认过",
   "en": "The developer has never confirmed it.",
   "start": 88.684,
   "end": 90.452
  },
  {
   "zh": "真正读你硬件的",
   "en": "The one that truly read",
   "start": 91.352,
   "end": 92.493
  },
  {
   "zh": "反而是一九九八年的合金装备",
   "en": "your hardware was Metal Gear Solid, back in 1998.",
   "start": 92.493,
   "end": 94.611
  },
  {
   "zh": "心理螳螂会翻你的记忆卡",
   "en": "Psycho Mantis reads your memory card,",
   "start": 94.831,
   "end": 96.614
  },
  {
   "zh": "说出你玩过哪些科乐美游戏",
   "en": "names the Konami games you have played, and makes",
   "start": 96.614,
   "end": 98.559
  },
  {
   "zh": "还让手柄自己震起来",
   "en": "your controller shake by itself.",
   "start": 98.559,
   "end": 100.018
  },
  {
   "zh": "更狠的是战斗：",
   "en": "Worse, the fight:",
   "start": 100.238,
   "end": 101.389
  },
  {
   "zh": "他能读到你手柄上的每一个操作",
   "en": "he reads every input on your controller,",
   "start": 101.389,
   "end": 103.692
  },
  {
   "zh": "你怎么打，他都提前躲开",
   "en": "dodges whatever you do in advance,",
   "start": 103.692,
   "end": 105.502
  },
  {
   "zh": "几乎是无敌的",
   "en": "and is practically invincible.",
   "start": 105.502,
   "end": 106.489
  },
  {
   "zh": "游戏里的提示是，把手柄插到二号口",
   "en": "The in-game hint: plug your controller into port two.",
   "start": 106.709,
   "end": 109.462
  },
  {
   "zh": "他读的是一号口，换了口",
   "en": "He reads port one, so once you switch,",
   "start": 109.462,
   "end": 111.354
  },
  {
   "zh": "他就读不到你了",
   "en": "he can't read you anymore.",
   "start": 111.354,
   "end": 112.559
  },
  {
   "zh": "那影之刃零呢？",
   "en": "So what about Phantom Blade Zero?",
   "start": 113.459,
   "end": 114.605
  },
  {
   "zh": "制作人梁其伟在采访里说",
   "en": "Producer Soulframe Liang said in an interview",
   "start": 114.825,
   "end": 116.745
  },
  {
   "zh": "开发中完全没有使用读指令",
   "en": "that they used no input reading at all.",
   "start": 116.745,
   "end": 118.841
  },
  {
   "zh": "最高难度逆天者里",
   "en": "On Hellwalker,",
   "start": 119.061,
   "end": 120.309
  },
  {
   "zh": "Boss 会根据你的行为随机应变",
   "en": "bosses adapt to what you do. Easy mode doesn't",
   "start": 120.309,
   "end": 122.805
  },
  {
   "zh": "简单模式不削血",
   "en": "cut their health;",
   "start": 122.805,
   "end": 123.897
  },
  {
   "zh": "而是让敌人反应慢一点",
   "en": "enemies just react slower.",
   "start": 123.897,
   "end": 125.457
  },
  {
   "zh": "那新娘为什么偏偏连放红光？",
   "en": "Then why does the Bride keep throwing",
   "start": 126.357,
   "end": 128.358
  },
  {
   "zh": "B 站 UP 主尾巴",
   "en": "red flashes? Bilibili creator",
   "start": 128.358,
   "end": 129.897
  },
  {
   "zh": "尾巴啊做了一期测试，给出了一个解释",
   "en": "Weiba Weiba tested it and offered an explanation.",
   "start": 129.897,
   "end": 132.514
  },
  {
   "zh": "他把一个隐藏分显示了出来",
   "en": "He made a hidden score visible and called",
   "start": 132.734,
   "end": 134.577
  },
  {
   "zh": "称为压力系统：",
   "en": "it the pressure system:",
   "start": 134.577,
   "end": 135.652
  },
  {
   "zh": "Boss 会评估你的血量、按键频率",
   "en": "the boss rates your health, how fast you press,",
   "start": 135.652,
   "end": 138.263
  },
  {
   "zh": "喝药和反应速度",
   "en": "your healing and your reactions.",
   "start": 138.263,
   "end": 139.338
  },
  {
   "zh": "你越慌，分越高；分越高",
   "en": "The more you panic, the higher the score,",
   "start": 139.558,
   "end": 141.295
  },
  {
   "zh": "Boss 越容易放最狠的那几招",
   "en": "and the higher it goes, the more often the boss picks its nastiest moves.",
   "start": 141.295,
   "end": 143.663
  },
  {
   "zh": "你狂按闪避，它来剑气；你在喝药",
   "en": "Mash dodge, and you get a sword wave. Heal,",
   "start": 143.883,
   "end": 146.765
  },
  {
   "zh": "它也来剑气",
   "en": "and you get one too.",
   "start": 146.765,
   "end": 147.726
  },
  {
   "zh": "B 站评论区里",
   "en": "In the Bilibili comments,",
   "start": 147.946,
   "end": 149.06
  },
  {
   "zh": "玩家也说出了同样的感觉：",
   "en": "players describe the same feeling:",
   "start": 149.06,
   "end": 150.97
  },
  {
   "zh": "你越不会躲哪一招",
   "en": "whichever move you can't",
   "start": 150.97,
   "end": 152.244
  },
  {
   "zh": "它就越频繁地出哪一招",
   "en": "dodge, it uses more and more.",
   "start": 152.244,
   "end": 153.835
  },
  {
   "zh": "这些是玩家的实测和推测",
   "en": "These are player tests and guesses,",
   "start": 154.055,
   "end": 155.804
  },
  {
   "zh": "不是官方说明。但它解释了一件事：",
   "en": "not official statements. But they explain one thing:",
   "start": 155.804,
   "end": 158.347
  },
  {
   "zh": "它读的不是按键，而是你的状态",
   "en": "it doesn't read your buttons. It reads your state.",
   "start": 158.347,
   "end": 160.572
  },
  {
   "zh": "最后，我们照着这些发现",
   "en": "Finally, following these findings,",
   "start": 161.472,
   "end": 163.085
  },
  {
   "zh": "写一个影之刃式的 Boss",
   "en": "we build a Phantom Blade-style boss.",
   "start": 163.085,
   "end": 164.991
  },
  {
   "zh": "它不读按键，只读你的状态：血量",
   "en": "It doesn't read buttons, only your state: health,",
   "start": 165.211,
   "end": 167.942
  },
  {
   "zh": "按键频率、有没有在喝药",
   "en": "how fast you press, whether you're healing,",
   "start": 167.942,
   "end": 169.944
  },
  {
   "zh": "合成一个压力分",
   "en": "combined into a pressure score.",
   "start": 169.944,
   "end": 171.218
  },
  {
   "zh": "压力分决定它抽哪一招：越慌",
   "en": "The pressure score decides which move it draws: the more you panic,",
   "start": 171.438,
   "end": 173.617
  },
  {
   "zh": "红光投技和剑气的权重就越高",
   "en": "the heavier the red-flash grab and sword wave are weighted.",
   "start": 173.617,
   "end": 175.796
  },
  {
   "zh": "红光不能格挡只能闪，蓝光可以弹反",
   "en": "Red can't be blocked, only dodged; blue can be parried.",
   "start": 176.016,
   "end": 178.927
  },
  {
   "zh": "你一乱按，它就更爱出红光",
   "en": "Start mashing, and it reaches for red more often.",
   "start": 178.927,
   "end": 181.11
  },
  {
   "zh": "难度高低，就是调它的反应速度",
   "en": "Difficulty is just tuning its reaction speed,",
   "start": 181.33,
   "end": 183.745
  },
  {
   "zh": "进攻欲望和这张权重表",
   "en": "its aggression and that weight table.",
   "start": 183.745,
   "end": 185.471
  },
  {
   "zh": "这个影之刃式的 Boss",
   "en": "This Phantom Blade-style boss is on",
   "start": 186.371,
   "end": 188.242
  },
  {
   "zh": "也做成了能玩的网页",
   "en": "a playable page too,",
   "start": 188.242,
   "end": 189.646
  },
  {
   "zh": "还能切换读按键、读动作",
   "en": "alongside the button reader, action reader",
   "start": 189.646,
   "end": 191.361
  },
  {
   "zh": "看画面三种敌人",
   "en": "and screen watcher.",
   "start": 191.361,
   "end": 192.453
  },
  {
   "zh": "你可以亲手试试：冷静出招和狂按乱打",
   "en": "Try it yourself: calm, deliberate attacks and frantic mashing get",
   "start": 192.673,
   "end": 195.5
  },
  {
   "zh": "它的反应完全不一样",
   "en": "completely different reactions.",
   "start": 195.5,
   "end": 196.997
  },
  {
   "zh": "感谢几位 UP 主的实测和素材",
   "en": "Thanks to the creators whose tests and clips we used.",
   "start": 197.897,
   "end": 200.223
  },
  {
   "zh": "名字和出处都写在画面和简介里",
   "en": "Their names and links are on screen and in the description.",
   "start": 200.223,
   "end": 202.395
  },
  {
   "zh": "如果这期对你有帮助，求一个一键三连",
   "en": "If this helped, please like, coin and favourite,",
   "start": 202.615,
   "end": 205.526
  },
  {
   "zh": "再点个关注",
   "en": "and hit follow.",
   "start": 205.526,
   "end": 206.382
  },
  {
   "zh": "你被哪个 Boss 读得最狠？",
   "en": "Which boss read you the hardest? Tell me in the",
   "start": 206.602,
   "end": 208.742
  },
  {
   "zh": "评论区告诉我，机制拆解下期见！",
   "en": "comments. See you next time on Mechanic Breakdown!",
   "start": 208.742,
   "end": 210.882
  }
 ]
};
