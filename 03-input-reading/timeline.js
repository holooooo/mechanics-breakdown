window.TIMELINE = {
 "duration": 146.55,
 "scenes": [
  {
   "id": "hook",
   "kicker": "机制拆解 · 第 3 期",
   "title": "它是不是在读你？",
   "start": 0.0,
   "voiceEnd": 15.907,
   "end": 16.807,
   "lines": [
    {
     "zh": "影之刃零里，你刚抬手出招，Boss 已经侧身闪开。",
     "en": "In Phantom Blade Zero, you barely start a swing and the boss has already sidestepped.",
     "start": 0.6,
     "end": 4.13,
     "rehook": "钩子"
    },
    {
     "zh": "魂游戏里，你刚举起药瓶，对面一枪就捅了过来。",
     "en": "In a Souls game, you raise your flask and a thrust is already on its way.",
     "start": 4.35,
     "end": 8.041
    },
    {
     "zh": "你有没有想过，它们是不是在偷看你的手柄？",
     "en": "Have you ever wondered whether they are peeking at your controller?",
     "start": 8.261,
     "end": 10.993,
     "rehook": "问"
    },
    {
     "zh": "这期机制拆解，讲一段读指令的简史，最后再亲手做一个公平的版本。",
     "en": "This time: a short history of input reading, and then we build a fair version ourselves.",
     "start": 11.213,
     "end": 15.907
    }
   ]
  },
  {
   "id": "levels",
   "kicker": "01 · 三种「知道」",
   "title": "敌人怎么知道你在干嘛？",
   "start": 16.807,
   "voiceEnd": 36.561,
   "end": 37.461,
   "lines": [
    {
     "zh": "敌人想知道你在干嘛，大概有三种办法。",
     "en": "An enemy has roughly three ways to know what you are doing.",
     "start": 16.807,
     "end": 19.553,
     "rehook": "问"
    },
    {
     "zh": "第一种，直接读按键，你按下的那一帧它就知道了。",
     "en": "One: read the button. It knows on the very frame you press it.",
     "start": 19.773,
     "end": 23.492
    },
    {
     "zh": "第二种，读动作，你的角色一开始出招，系统就通知它。",
     "en": "Two: read the action. The moment your character commits, the system tells it.",
     "start": 23.712,
     "end": 27.823
    },
    {
     "zh": "第三种，像人一样看画面，看到你抬手，再花零点二五秒反应。",
     "en": "Three: watch the screen like a human, see you raise your arm, then take a quarter of a second to react.",
     "start": 28.043,
     "end": 32.601
    },
    {
     "zh": "前两种都比人快了十几帧，玩家感受到的，就是被读了。",
     "en": "The first two are a dozen-plus frames faster than a person. To the player, that feels like being read.",
     "start": 32.821,
     "end": 36.561,
     "rehook": "反转"
    }
   ]
  },
  {
   "id": "arcade",
   "kicker": "02 · 街机时代",
   "title": "SNK 综合征",
   "start": 37.461,
   "voiceEnd": 51.323,
   "end": 52.223,
   "lines": [
    {
     "zh": "最早的读指令，来自街机格斗游戏。",
     "en": "The earliest input reading comes from arcade fighting games.",
     "start": 37.461,
     "end": 40.004
    },
    {
     "zh": "有人逆向过街霸二的程序，你的招式数据一产生，电脑就能看到，比第一帧画面还早一帧。",
     "en": "Someone reverse-engineered Street Fighter II: the CPU sees your move's data the moment it exists, a frame before the first animation frame.",
     "start": 40.224,
     "end": 46.078
    },
    {
     "zh": "SNK 的 Boss 更夸张，你一出手就被反击，玩家管这叫 SNK 综合征。",
     "en": "SNK bosses were worse: counter the instant you move. Players call it SNK Boss Syndrome.",
     "start": 46.298,
     "end": 51.323,
     "say": "S N K 的 Boss 更夸张，你一出手就被反击，玩家管这叫 S N K 综合征。"
    }
   ]
  },
  {
   "id": "souls",
   "kicker": "03 · 魂系列",
   "title": "喝药，就会被捅",
   "start": 52.223,
   "voiceEnd": 72.912,
   "end": 73.812,
   "lines": [
    {
     "zh": "到了魂系列，最有名的是喝药惩罚。",
     "en": "In the Souls series, the most famous case is the heal punish.",
     "start": 52.223,
     "end": 54.632,
     "rehook": "钩子"
    },
    {
     "zh": "玩家发现，法环的玛莲妮亚、只狼的弦一郎，看到你喝药就会突刺过来。",
     "en": "Players found that Elden Ring's Malenia and Sekiro's Genichiro lunge at you the moment you heal.",
     "start": 54.852,
     "end": 60.186
    },
    {
     "zh": "但有人拆过法环的人工智能脚本，触发它的不是按键，而是你使用道具的动作开始的那一刻。",
     "en": "But modders who dug into Elden Ring's AI scripts found the trigger is not the button. It is the moment your item-use action begins.",
     "start": 60.406,
     "end": 66.437,
     "rehook": "反转",
     "say": "但有人拆过法环的人工智能脚本，触发它的不是按键，而是你使用道具的动作开始的那一刻。"
    },
    {
     "zh": "所以它读的是你已经承诺的动作，只是快到看不出区别。",
     "en": "So it reads an action you have already committed to. It is just too fast to tell the difference.",
     "start": 66.657,
     "end": 70.206
    },
    {
     "zh": "这件事，官方从来没有正式承认过。",
     "en": "The developer has never officially confirmed any of this.",
     "start": 70.426,
     "end": 72.912
    }
   ]
  },
  {
   "id": "mantis",
   "kicker": "04 · 1998",
   "title": "真的在读你的手柄",
   "start": 73.812,
   "voiceEnd": 86.73,
   "end": 87.63,
   "lines": [
    {
     "zh": "真正读你硬件的，反而是一九九八年的合金装备。",
     "en": "The one that truly read your hardware was Metal Gear Solid, back in 1998.",
     "start": 73.812,
     "end": 77.071,
     "rehook": "反转"
    },
    {
     "zh": "心理螳螂会翻你的记忆卡，说出你玩过哪些科乐美游戏，还让手柄自己震起来。",
     "en": "Psycho Mantis reads your memory card, names the Konami games you have played, and makes your controller shake by itself.",
     "start": 77.291,
     "end": 82.477
    },
    {
     "zh": "打他的办法也很硬件，把手柄换到二号口，他就读不到你了。",
     "en": "The fix is hardware too: plug your controller into port two, and he can no longer read you.",
     "start": 82.697,
     "end": 86.73
    }
   ]
  },
  {
   "id": "pb0",
   "kicker": "05 · 影之刃零",
   "title": "开发中，一切读指令都没用",
   "start": 87.63,
   "voiceEnd": 107.48,
   "end": 108.38,
   "lines": [
    {
     "zh": "那影之刃零呢？",
     "en": "So what about Phantom Blade Zero?",
     "start": 87.63,
     "end": 88.776,
     "rehook": "问"
    },
    {
     "zh": "制作人梁其伟在采访里说，开发中完全没有使用读指令。",
     "en": "Producer Soulframe Liang said in an interview that they used no input reading at all.",
     "start": 88.996,
     "end": 93.012,
     "rehook": "反转",
     "say": "制作人梁其伟在采访里说，开发中完全没有使用读指令。"
    },
    {
     "zh": "最高难度逆天者里，Boss 会根据你的行为随机应变，没有固定套路。",
     "en": "On the top difficulty, Hellwalker, bosses adapt to what you do, with no fixed patterns.",
     "start": 93.232,
     "end": 97.812
    },
    {
     "zh": "简单模式也不是削血，而是让敌人反应慢一点、没那么想打你。",
     "en": "And the easy mode doesn't cut their health. Enemies just react slower and attack less eagerly.",
     "start": 98.032,
     "end": 102.201
    },
    {
     "zh": "再加上敌我共用的杀气条，格挡、弹反、破防，都在算同一份资源。",
     "en": "Add the shared Sha-Chi bar: blocking, parrying and guard breaks all spend the same resource.",
     "start": 102.421,
     "end": 107.48
    }
   ]
  },
  {
   "id": "impl",
   "kicker": "06 · 实现方法",
   "title": "给敌人一段反应时间",
   "start": 108.38,
   "voiceEnd": 125.458,
   "end": 126.358,
   "lines": [
    {
     "zh": "想做一个公平的敌人，可以这样写。",
     "en": "Want a fair enemy? Here's how.",
     "start": 108.38,
     "end": 110.772,
     "rehook": "钩子"
    },
    {
     "zh": "不要订阅按键事件，而是给它一段感知延迟，看到动作以后，等十五帧左右再反应。",
     "en": "Don't subscribe to button events. Give it a perception delay: after it sees the action, wait about fifteen frames before reacting.",
     "start": 110.992,
     "end": 116.714
    },
    {
     "zh": "前摇比反应时间长的招，它能躲开；比反应时间短的快招，它就躲不掉。",
     "en": "Moves with longer wind-up than its reaction time get dodged. Faster moves land.",
     "start": 116.934,
     "end": 122.115
    },
    {
     "zh": "难度高低，就是调这段延迟和它的进攻欲望。",
     "en": "Difficulty is just tuning that delay and how aggressive it is.",
     "start": 122.335,
     "end": 125.458
    }
   ]
  },
  {
   "id": "demo",
   "kicker": "07 · 效果预览",
   "title": "三种敌人，亲手试试",
   "start": 126.358,
   "voiceEnd": 134.383,
   "end": 135.283,
   "lines": [
    {
     "zh": "我们把三种敌人做成了能玩的网页：读按键、读动作、看画面。",
     "en": "We built all three enemies into a playable page: button reader, action reader, screen watcher.",
     "start": 126.358,
     "end": 130.775
    },
    {
     "zh": "同一刀砍过去，你能清楚地感觉到哪一个在作弊。",
     "en": "Swing the same slash, and you can clearly feel which one is cheating.",
     "start": 130.995,
     "end": 134.383
    }
   ]
  },
  {
   "id": "outro",
   "kicker": "感谢观看",
   "title": "一键三连 + 关注",
   "start": 135.283,
   "voiceEnd": 143.55,
   "end": 146.55,
   "lines": [
    {
     "zh": "如果这期对你有帮助，求一个一键三连，再点个关注。",
     "en": "If this helped, please like, coin and favourite, and hit follow.",
     "start": 135.283,
     "end": 139.05
    },
    {
     "zh": "你被哪个 Boss 读得最狠？评论区告诉我，机制拆解下期见！",
     "en": "Which boss read you the hardest? Tell me in the comments. See you next time on Mechanic Breakdown!",
     "start": 139.27,
     "end": 143.55
    }
   ]
  }
 ],
 "subs": [
  {
   "zh": "影之刃零里，你刚抬手出招",
   "en": "In Phantom Blade Zero, you barely start a",
   "start": 0.6,
   "end": 2.442
  },
  {
   "zh": "Boss 已经侧身闪开",
   "en": "swing and the boss has already sidestepped.",
   "start": 2.442,
   "end": 4.13
  },
  {
   "zh": "魂游戏里，你刚举起药瓶",
   "en": "In a Souls game, you raise your flask and",
   "start": 4.35,
   "end": 6.38
  },
  {
   "zh": "对面一枪就捅了过来",
   "en": "a thrust is already on its way.",
   "start": 6.38,
   "end": 8.041
  },
  {
   "zh": "你有没有想过",
   "en": "Have you ever wondered",
   "start": 8.261,
   "end": 9.124
  },
  {
   "zh": "它们是不是在偷看你的手柄？",
   "en": "whether they are peeking at your controller?",
   "start": 9.124,
   "end": 10.993
  },
  {
   "zh": "这期机制拆解，讲一段读指令的简史",
   "en": "This time: a short history of input reading,",
   "start": 11.213,
   "end": 13.803
  },
  {
   "zh": "最后再亲手做一个公平的版本",
   "en": "and then we build a fair version ourselves.",
   "start": 13.803,
   "end": 15.907
  },
  {
   "zh": "敌人想知道你在干嘛，大概有三种办法",
   "en": "An enemy has roughly three ways to know what you are doing.",
   "start": 16.807,
   "end": 19.553
  },
  {
   "zh": "第一种，直接读按键",
   "en": "One: read the button.",
   "start": 19.773,
   "end": 21.367
  },
  {
   "zh": "你按下的那一帧它就知道了",
   "en": "It knows on the very frame you press it.",
   "start": 21.367,
   "end": 23.492
  },
  {
   "zh": "第二种，读动作，你的角色一开始出招",
   "en": "Two: read the action. The moment your character commits,",
   "start": 23.712,
   "end": 26.75
  },
  {
   "zh": "系统就通知它",
   "en": "the system tells it.",
   "start": 26.75,
   "end": 27.823
  },
  {
   "zh": "第三种，像人一样看画面，看到你抬手",
   "en": "Three: watch the screen like a human, see you raise your arm,",
   "start": 28.043,
   "end": 31.023
  },
  {
   "zh": "再花零点二五秒反应",
   "en": "then take a quarter of a second to react.",
   "start": 31.023,
   "end": 32.601
  },
  {
   "zh": "前两种都比人快了十几帧",
   "en": "The first two are a dozen-plus frames faster than",
   "start": 32.821,
   "end": 34.61
  },
  {
   "zh": "玩家感受到的，就是被读了",
   "en": "a person. To the player, that feels like being read.",
   "start": 34.61,
   "end": 36.561
  },
  {
   "zh": "最早的读指令，来自街机格斗游戏",
   "en": "The earliest input reading comes from arcade fighting games.",
   "start": 37.461,
   "end": 40.004
  },
  {
   "zh": "有人逆向过街霸二的程序",
   "en": "Someone reverse-engineered Street Fighter II:",
   "start": 40.224,
   "end": 41.964
  },
  {
   "zh": "你的招式数据一产生，电脑就能看到",
   "en": "the CPU sees your move's data the moment it exists,",
   "start": 41.964,
   "end": 44.496
  },
  {
   "zh": "比第一帧画面还早一帧",
   "en": "a frame before the first animation frame.",
   "start": 44.496,
   "end": 46.078
  },
  {
   "zh": "SNK 的 Boss 更夸张",
   "en": "SNK bosses were worse: counter the",
   "start": 46.298,
   "end": 48.308
  },
  {
   "zh": "你一出手就被反击",
   "en": "instant you move.",
   "start": 48.308,
   "end": 49.457
  },
  {
   "zh": "玩家管这叫 SNK 综合征",
   "en": "Players call it SNK Boss Syndrome.",
   "start": 49.457,
   "end": 51.323
  },
  {
   "zh": "到了魂系列，最有名的是喝药惩罚",
   "en": "In the Souls series, the most famous case is the heal punish.",
   "start": 52.223,
   "end": 54.632
  },
  {
   "zh": "玩家发现，法环的玛莲妮亚",
   "en": "Players found that Elden Ring's Malenia",
   "start": 54.852,
   "end": 57.059
  },
  {
   "zh": "只狼的弦一郎",
   "en": "and Sekiro's Genichiro",
   "start": 57.059,
   "end": 58.162
  },
  {
   "zh": "看到你喝药就会突刺过来",
   "en": "lunge at you the moment you heal.",
   "start": 58.162,
   "end": 60.186
  },
  {
   "zh": "但有人拆过法环的人工智能脚本",
   "en": "But modders who dug into Elden Ring's AI scripts",
   "start": 60.406,
   "end": 62.628
  },
  {
   "zh": "触发它的不是按键",
   "en": "found the trigger is not the",
   "start": 62.628,
   "end": 63.897
  },
  {
   "zh": "而是你使用道具的动作开始的那一刻",
   "en": "button. It is the moment your item-use action begins.",
   "start": 63.897,
   "end": 66.437
  },
  {
   "zh": "所以它读的是你已经承诺的动作",
   "en": "So it reads an action you have already committed to.",
   "start": 66.657,
   "end": 68.817
  },
  {
   "zh": "只是快到看不出区别",
   "en": "It is just too fast to tell the difference.",
   "start": 68.817,
   "end": 70.206
  },
  {
   "zh": "这件事，官方从来没有正式承认过",
   "en": "The developer has never officially confirmed any of this.",
   "start": 70.426,
   "end": 72.912
  },
  {
   "zh": "真正读你硬件的",
   "en": "The one that truly read",
   "start": 73.812,
   "end": 74.952
  },
  {
   "zh": "反而是一九九八年的合金装备",
   "en": "your hardware was Metal Gear Solid, back in 1998.",
   "start": 74.952,
   "end": 77.071
  },
  {
   "zh": "心理螳螂会翻你的记忆卡",
   "en": "Psycho Mantis reads your memory card,",
   "start": 77.291,
   "end": 79.074
  },
  {
   "zh": "说出你玩过哪些科乐美游戏",
   "en": "names the Konami games you have played, and makes",
   "start": 79.074,
   "end": 81.019
  },
  {
   "zh": "还让手柄自己震起来",
   "en": "your controller shake by itself.",
   "start": 81.019,
   "end": 82.477
  },
  {
   "zh": "打他的办法也很硬件",
   "en": "The fix is hardware too:",
   "start": 82.697,
   "end": 84.149
  },
  {
   "zh": "把手柄换到二号口，他就读不到你了",
   "en": "plug your controller into port two, and he can no longer read you.",
   "start": 84.149,
   "end": 86.73
  },
  {
   "zh": "那影之刃零呢？",
   "en": "So what about Phantom Blade Zero?",
   "start": 87.63,
   "end": 88.776
  },
  {
   "zh": "制作人梁其伟在采访里说",
   "en": "Producer Soulframe Liang said in an interview",
   "start": 88.996,
   "end": 90.916
  },
  {
   "zh": "开发中完全没有使用读指令",
   "en": "that they used no input reading at all.",
   "start": 90.916,
   "end": 93.012
  },
  {
   "zh": "最高难度逆天者里",
   "en": "On the top difficulty,",
   "start": 93.232,
   "end": 94.453
  },
  {
   "zh": "Boss 会根据你的行为随机应变",
   "en": "Hellwalker, bosses adapt to what you do,",
   "start": 94.453,
   "end": 96.896
  },
  {
   "zh": "没有固定套路",
   "en": "with no fixed patterns.",
   "start": 96.896,
   "end": 97.812
  },
  {
   "zh": "简单模式也不是削血",
   "en": "And the easy mode doesn't cut",
   "start": 98.032,
   "end": 99.475
  },
  {
   "zh": "而是让敌人反应慢一点、没那么想打你",
   "en": "their health. Enemies just react slower and attack less eagerly.",
   "start": 99.475,
   "end": 102.201
  },
  {
   "zh": "再加上敌我共用的杀气条，格挡、弹反",
   "en": "Add the shared Sha-Chi bar: blocking, parrying and guard",
   "start": 102.421,
   "end": 105.493
  },
  {
   "zh": "破防，都在算同一份资源",
   "en": "breaks all spend the same resource.",
   "start": 105.493,
   "end": 107.48
  },
  {
   "zh": "想做一个公平的敌人，可以这样写",
   "en": "Want a fair enemy? Here's how.",
   "start": 108.38,
   "end": 110.772
  },
  {
   "zh": "不要订阅按键事件",
   "en": "Don't subscribe to button events.",
   "start": 110.992,
   "end": 112.338
  },
  {
   "zh": "而是给它一段感知延迟，看到动作以后",
   "en": "Give it a perception delay: after it sees the action,",
   "start": 112.338,
   "end": 115.199
  },
  {
   "zh": "等十五帧左右再反应",
   "en": "wait about fifteen frames before reacting.",
   "start": 115.199,
   "end": 116.714
  },
  {
   "zh": "前摇比反应时间长的招，它能躲开",
   "en": "Moves with longer wind-up than its reaction",
   "start": 116.934,
   "end": 119.525
  },
  {
   "zh": "比反应时间短的快招，它就躲不掉",
   "en": "time get dodged. Faster moves land.",
   "start": 119.525,
   "end": 122.115
  },
  {
   "zh": "难度高低",
   "en": "Difficulty is",
   "start": 122.335,
   "end": 123.029
  },
  {
   "zh": "就是调这段延迟和它的进攻欲望",
   "en": "just tuning that delay and how aggressive it is.",
   "start": 123.029,
   "end": 125.458
  },
  {
   "zh": "我们把三种敌人做成了能玩的网页：",
   "en": "We built all three enemies into a playable page:",
   "start": 126.358,
   "end": 128.975
  },
  {
   "zh": "读按键、读动作、看画面",
   "en": "button reader, action reader, screen watcher.",
   "start": 128.975,
   "end": 130.775
  },
  {
   "zh": "同一刀砍过去",
   "en": "Swing the same slash,",
   "start": 130.995,
   "end": 132.011
  },
  {
   "zh": "你能清楚地感觉到哪一个在作弊",
   "en": "and you can clearly feel which one is cheating.",
   "start": 132.011,
   "end": 134.383
  },
  {
   "zh": "如果这期对你有帮助，求一个一键三连",
   "en": "If this helped, please like, coin and favourite,",
   "start": 135.283,
   "end": 138.194
  },
  {
   "zh": "再点个关注",
   "en": "and hit follow.",
   "start": 138.194,
   "end": 139.05
  },
  {
   "zh": "你被哪个 Boss 读得最狠？",
   "en": "Which boss read you the hardest? Tell me in the",
   "start": 139.27,
   "end": 141.41
  },
  {
   "zh": "评论区告诉我，机制拆解下期见！",
   "en": "comments. See you next time on Mechanic Breakdown!",
   "start": 141.41,
   "end": 143.55
  }
 ]
};
