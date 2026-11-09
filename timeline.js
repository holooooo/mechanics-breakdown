window.TIMELINE = {
 "duration": 182.657,
 "scenes": [
  {
   "id": "hook",
   "kicker": "机制拆解 · 第 1 期",
   "title": "没人写过这个场面",
   "start": 0.0,
   "voiceEnd": 16.504,
   "end": 17.404,
   "lines": [
    {
     "zh": "在塞尔达里，你点着一片草，火会顺着风烧过去，热气流还能把你托上天。",
     "en": "In Zelda, light a patch of grass and the fire runs with the wind, and the hot air can carry you into the sky.",
     "start": 0.6,
     "end": 5.917,
     "rehook": "钩子"
    },
    {
     "zh": "你有没有想过，这是为什么？",
     "en": "Have you ever wondered why?",
     "start": 6.137,
     "end": 8.014,
     "rehook": "问"
    },
    {
     "zh": "其实，没有人专门为这个场面写过一行剧本。",
     "en": "In fact, nobody ever scripted this moment.",
     "start": 8.234,
     "end": 11.155,
     "rehook": "反转"
    },
    {
     "zh": "它是三条规则自己算出来的。今天我们把它拆开，再亲手写一个能玩的版本。",
     "en": "Three rules work it out on their own. Today we take it apart, then build a playable version ourselves.",
     "start": 11.375,
     "end": 16.504
    }
   ]
  },
  {
   "id": "multiply",
   "kicker": "01 · 设计思路",
   "title": "加法谜题 vs 乘法玩法",
   "start": 17.404,
   "voiceEnd": 32.9,
   "end": 33.8,
   "lines": [
    {
     "zh": "老塞尔达的谜题是加法：每个火焰机关，都是为那一个房间单独做的。",
     "en": "Classic Zelda puzzles were additive: every fire puzzle was built for one specific room.",
     "start": 17.404,
     "end": 22.15
    },
    {
     "zh": "旷野之息想要乘法：只定少数几条规则，让它们互相相乘，玩法自己长出来。",
     "en": "Breath of the Wild wanted multiplication: a few rules that multiply each other, so play grows by itself.",
     "start": 22.37,
     "end": 28.255
    },
    {
     "zh": "怎么做到？二零一七年的游戏开发者大会上，技术总监给出了答案。",
     "en": "How? At GDC 2017, the technical director gave the answer.",
     "start": 28.475,
     "end": 32.9,
     "rehook": "问"
    }
   ]
  },
  {
   "id": "engines",
   "kicker": "02 · GDC 2017",
   "title": "物理算运动，化学算状态",
   "start": 33.8,
   "voiceEnd": 43.07,
   "end": 43.97,
   "lines": [
    {
     "zh": "物理引擎负责东西怎么动，化学引擎负责东西变成什么状态。",
     "en": "The physics engine decides how things move. The chemistry engine decides what state they are in.",
     "start": 33.8,
     "end": 37.75
    },
    {
     "zh": "火、水、冰、电、风叫做元素；草、木头、金属叫做材料。",
     "en": "Fire, water, ice, electricity and wind are elements. Grass, wood and metal are materials.",
     "start": 37.97,
     "end": 43.07
    }
   ]
  },
  {
   "id": "rules",
   "kicker": "03 · 三条规则",
   "title": "谁能改变谁？",
   "start": 43.97,
   "voiceEnd": 63.488,
   "end": 64.388,
   "lines": [
    {
     "zh": "规则一：元素能改变材料的状态。火让草燃烧，电让金属带电。",
     "en": "Rule one: elements change the state of materials. Fire burns grass; electricity charges metal.",
     "start": 43.97,
     "end": 48.716
    },
    {
     "zh": "规则二：元素能改变元素。水能浇灭火，火能融化冰。",
     "en": "Rule two: elements change elements. Water puts out fire; fire melts ice.",
     "start": 48.936,
     "end": 53.203
    },
    {
     "zh": "规则三，也是最反直觉的一条：材料不能改变材料。",
     "en": "Rule three, and the least intuitive: materials cannot change materials.",
     "start": 53.423,
     "end": 56.966,
     "rehook": "反转"
    },
    {
     "zh": "着火的木头，并不会直接点着隔壁的木头。",
     "en": "A burning log does not light the log next to it directly.",
     "start": 57.186,
     "end": 59.926
    },
    {
     "zh": "真正跨过去的，是它放出来的元素，也就是火。",
     "en": "What crosses the gap is the element it gives off: fire.",
     "start": 60.146,
     "end": 63.488
    }
   ]
  },
  {
   "id": "data",
   "kicker": "04 · 最小实现",
   "title": "一格草，就是一组数字",
   "start": 64.388,
   "voiceEnd": 76.998,
   "end": 77.898,
   "lines": [
    {
     "zh": "我们照着这个思路，把地面切成四十八乘四十八的小格。",
     "en": "Following that idea, we cut the ground into a 48 by 48 grid.",
     "start": 64.388,
     "end": 68.038,
     "rehook": "钩子"
    },
    {
     "zh": "每一格只记几个数字：温度、湿度、燃料、冰，还有电荷。",
     "en": "Each cell stores just a few numbers: temperature, moisture, fuel, ice and charge.",
     "start": 68.258,
     "end": 72.974
    },
    {
     "zh": "你看到的火焰、水洼和电弧，都只是这些数字的画面。",
     "en": "The flames, puddles and arcs you see are only pictures of those numbers.",
     "start": 73.194,
     "end": 76.998
    }
   ]
  },
  {
   "id": "burn",
   "kicker": "05 · 燃烧与传播",
   "title": "火是结果，热才是原因",
   "start": 77.898,
   "voiceEnd": 93.008,
   "end": 93.908,
   "lines": [
    {
     "zh": "燃烧只有一个判断：够热、有燃料、又不太湿，它就烧起来。",
     "en": "Burning is a single check: hot enough, has fuel, not too wet. Then it ignites.",
     "start": 77.898,
     "end": 82.438
    },
    {
     "zh": "烧着的格子消耗燃料，把热量放给周围八个邻居。邻居变热，又接着烧。",
     "en": "A burning cell eats its fuel and releases heat to its eight neighbours. They heat up and catch in turn.",
     "start": 82.658,
     "end": 87.848
    },
    {
     "zh": "风只做一件事：让下风方向的邻居多分一点热。火线就自己歪了过去。",
     "en": "Wind does just one thing: downwind neighbours get a little more heat. The fire front bends on its own.",
     "start": 88.068,
     "end": 93.008
    }
   ]
  },
  {
   "id": "rain",
   "kicker": "06 · 规则互相制约",
   "title": "灭火，改的是数据",
   "start": 93.908,
   "voiceEnd": 104.536,
   "end": 105.436,
   "lines": [
    {
     "zh": "那怎么灭火？下一场雨。",
     "en": "So how do you put it out? Make it rain.",
     "start": 93.908,
     "end": 95.79,
     "rehook": "问"
    },
    {
     "zh": "雨水抬高湿度、带走热量，燃烧的判断不再成立，火就自己熄了。",
     "en": "Rain raises moisture and draws away heat. The burning check fails, and the fire dies by itself.",
     "start": 96.01,
     "end": 100.979
    },
    {
     "zh": "我们从没写过雨天关掉火焰特效，改的只是数据。",
     "en": "We never wrote 'hide the flames when it rains'. We only changed the data.",
     "start": 101.199,
     "end": 104.536
    }
   ]
  },
  {
   "id": "lift",
   "kicker": "07 · 跨系统连接",
   "title": "火，变成了飞行工具",
   "start": 105.436,
   "voiceEnd": 118.323,
   "end": 119.223,
   "lines": [
    {
     "zh": "再看飞行。把所有燃烧格的热量加起来，就是一股上升气流。",
     "en": "Now flight. Add up the heat of every burning cell and you get an updraft.",
     "start": 105.436,
     "end": 109.61,
     "rehook": "钩子"
    },
    {
     "zh": "滑翔伞飞进气流，就会被托起来。火的输出，变成了移动的输入。",
     "en": "A paraglider that enters the column gets lifted. Fire's output becomes movement's input.",
     "start": 109.83,
     "end": 114.305
    },
    {
     "zh": "这就是乘法：火和滑翔，原本是两套毫不相干的系统。",
     "en": "That is multiplication: fire and gliding were two unrelated systems.",
     "start": 114.525,
     "end": 118.323
    }
   ]
  },
  {
   "id": "iceshock",
   "kicker": "08 · 冰与电",
   "title": "状态会继续流动",
   "start": 119.223,
   "voiceEnd": 128.844,
   "end": 129.744,
   "lines": [
    {
     "zh": "冰也一样。周围够热，冰就变少，融出来的水让地面变湿。",
     "en": "Ice works the same way. With enough heat around, it shrinks, and the meltwater wets the ground.",
     "start": 119.223,
     "end": 123.877
    },
    {
     "zh": "湿地和金属能导电。电荷沿着相邻的格子传过去，每走一步弱一点。",
     "en": "Wet ground and metal conduct. Charge hops from cell to neighbouring cell, weaker with every step.",
     "start": 124.097,
     "end": 128.844
    }
   ]
  },
  {
   "id": "chain",
   "kicker": "09 · 连锁反应",
   "title": "没人写过这个解法",
   "start": 129.744,
   "voiceEnd": 138.025,
   "end": 138.925,
   "lines": [
    {
     "zh": "现在把它们串起来：火融化冰，融水接通电路，远处的机关亮了。",
     "en": "Now chain them: fire melts the ice, the meltwater closes the circuit, and the far switch lights up.",
     "start": 129.744,
     "end": 134.416,
     "rehook": "反转"
    },
    {
     "zh": "这个解法我们一行都没写过，是规则自己算出来的。",
     "en": "We never wrote this solution. The rules worked it out.",
     "start": 134.636,
     "end": 138.025
    }
   ]
  },
  {
   "id": "build",
   "kicker": "10 · 实现方法",
   "title": "装进你自己的游戏",
   "start": 138.925,
   "voiceEnd": 163.333,
   "end": 164.233,
   "lines": [
    {
     "zh": "想放进自己的游戏？记住三件事。",
     "en": "Want this in your own game? Remember three things.",
     "start": 138.925,
     "end": 141.287,
     "rehook": "问"
    },
    {
     "zh": "第一，模拟和渲染分开。固定步长更新数据，画面只负责读。",
     "en": "One: keep simulation and rendering apart. Update data on a fixed step; rendering only reads it.",
     "start": 141.507,
     "end": 146.05
    },
    {
     "zh": "第二，规则只看材料属性，不看物体是谁，不要写火把碰到木箱这种特例。",
     "en": "Two: rules look at properties, never at which object it is. No special cases like 'torch touches crate'.",
     "start": 146.27,
     "end": 151.521
    },
    {
     "zh": "第三，先在小网格里把规则调稳，再搬进三维世界，用空间查询代替格子邻居。",
     "en": "Three: tune the rules on a small grid first, then move to 3D, with spatial queries instead of grid neighbours.",
     "start": 151.741,
     "end": 157.575
    },
    {
     "zh": "效果预览和全部源码都放在网页里了，点火、下雨、放电，你可以自己玩。",
     "en": "The live preview and full source are on the web page. Light fires, make rain, send current. Try it yourself.",
     "start": 157.795,
     "end": 163.333
    }
   ]
  },
  {
   "id": "teaser",
   "kicker": "下期预告",
   "title": "同一把火，两种算法",
   "start": 164.233,
   "voiceEnd": 170.916,
   "end": 171.816,
   "lines": [
    {
     "zh": "同样一把火，有的游戏烧的是世界，有的游戏烧的是伤害。",
     "en": "The same fire: some games burn the world, others burn damage.",
     "start": 164.233,
     "end": 168.144,
     "rehook": "钩子"
    },
    {
     "zh": "下一期，我们专门拆原神的元素反应。",
     "en": "Next time, we take apart Genshin Impact's elemental reactions.",
     "start": 168.364,
     "end": 170.916
    }
   ]
  },
  {
   "id": "outro",
   "kicker": "感谢观看",
   "title": "一键三连 + 关注",
   "start": 171.816,
   "voiceEnd": 179.657,
   "end": 182.657,
   "lines": [
    {
     "zh": "如果这期对你有帮助，求一个一键三连，再点个关注。",
     "en": "If this helped, please like, coin and favourite, and hit follow.",
     "start": 171.816,
     "end": 175.592
    },
    {
     "zh": "让我薅点叔叔的羊毛，继续开发自己的游戏。我们下期见！",
     "en": "Let me earn a little from Uncle Bilibili, so I can keep building my own game. See you next time!",
     "start": 175.812,
     "end": 179.657
    }
   ]
  }
 ],
 "subs": [
  {
   "zh": "在塞尔达里，你点着一片草",
   "en": "In Zelda, light a patch of grass and the fire",
   "start": 0.6,
   "end": 2.727
  },
  {
   "zh": "火会顺着风烧过去",
   "en": "runs with the wind,",
   "start": 2.727,
   "end": 4.144
  },
  {
   "zh": "热气流还能把你托上天",
   "en": "and the hot air can carry you into the sky.",
   "start": 4.144,
   "end": 5.917
  },
  {
   "zh": "你有没有想过，这是为什么？",
   "en": "Have you ever wondered why?",
   "start": 6.137,
   "end": 8.014
  },
  {
   "zh": "其实",
   "en": "In fact,",
   "start": 8.234,
   "end": 8.558
  },
  {
   "zh": "没有人专门为这个场面写过一行剧本",
   "en": "nobody ever scripted this moment.",
   "start": 8.558,
   "end": 11.155
  },
  {
   "zh": "它是三条规则自己算出来的",
   "en": "Three rules work it out on their own.",
   "start": 11.375,
   "end": 13.36
  },
  {
   "zh": "今天我们把它拆开",
   "en": "Today we take it apart,",
   "start": 13.36,
   "end": 14.684
  },
  {
   "zh": "再亲手写一个能玩的版本",
   "en": "then build a playable version ourselves.",
   "start": 14.684,
   "end": 16.504
  },
  {
   "zh": "老塞尔达的谜题是加法：每个火焰机关",
   "en": "Classic Zelda puzzles were additive: every fire puzzle",
   "start": 17.404,
   "end": 20.186
  },
  {
   "zh": "都是为那一个房间单独做的",
   "en": "was built for one specific room.",
   "start": 20.186,
   "end": 22.15
  },
  {
   "zh": "旷野之息想要乘法：只定少数几条规则",
   "en": "Breath of the Wild wanted multiplication: a few rules",
   "start": 22.37,
   "end": 25.496
  },
  {
   "zh": "让它们互相相乘，玩法自己长出来",
   "en": "that multiply each other, so play grows by itself.",
   "start": 25.496,
   "end": 28.255
  },
  {
   "zh": "怎么做到？",
   "en": "How?",
   "start": 28.475,
   "end": 29.265
  },
  {
   "zh": "二零一七年的游戏开发者大会上",
   "en": "At GDC 2017, the technical director",
   "start": 29.265,
   "end": 31.478
  },
  {
   "zh": "技术总监给出了答案",
   "en": "gave the answer.",
   "start": 31.478,
   "end": 32.9
  },
  {
   "zh": "物理引擎负责东西怎么动",
   "en": "The physics engine decides how things move.",
   "start": 33.8,
   "end": 35.538
  },
  {
   "zh": "化学引擎负责东西变成什么状态",
   "en": "The chemistry engine decides what state they are in.",
   "start": 35.538,
   "end": 37.75
  },
  {
   "zh": "火、水、冰、电、风叫做元素；草",
   "en": "Fire, water, ice, electricity and wind are elements.",
   "start": 37.97,
   "end": 41.157
  },
  {
   "zh": "木头、金属叫做材料",
   "en": "Grass, wood and metal are materials.",
   "start": 41.157,
   "end": 43.07
  },
  {
   "zh": "规则一：元素能改变材料的状态",
   "en": "Rule one: elements change the state of materials.",
   "start": 43.97,
   "end": 46.525
  },
  {
   "zh": "火让草燃烧，电让金属带电",
   "en": "Fire burns grass; electricity charges metal.",
   "start": 46.525,
   "end": 48.716
  },
  {
   "zh": "规则二：元素能改变元素。水能浇灭火",
   "en": "Rule two: elements change elements. Water puts out fire;",
   "start": 48.936,
   "end": 52.233
  },
  {
   "zh": "火能融化冰",
   "en": "fire melts ice.",
   "start": 52.233,
   "end": 53.203
  },
  {
   "zh": "规则三，也是最反直觉的一条：",
   "en": "Rule three, and the least intuitive: materials",
   "start": 53.423,
   "end": 55.678
  },
  {
   "zh": "材料不能改变材料",
   "en": "cannot change materials.",
   "start": 55.678,
   "end": 56.966
  },
  {
   "zh": "着火的木头",
   "en": "A burning log does",
   "start": 57.186,
   "end": 57.992
  },
  {
   "zh": "并不会直接点着隔壁的木头",
   "en": "not light the log next to it directly.",
   "start": 57.992,
   "end": 59.926
  },
  {
   "zh": "真正跨过去的，是它放出来的元素",
   "en": "What crosses the gap is the element it gives off:",
   "start": 60.146,
   "end": 62.785
  },
  {
   "zh": "也就是火",
   "en": "fire.",
   "start": 62.785,
   "end": 63.488
  },
  {
   "zh": "我们照着这个思路",
   "en": "Following that idea,",
   "start": 64.388,
   "end": 65.658
  },
  {
   "zh": "把地面切成四十八乘四十八的小格",
   "en": "we cut the ground into a 48 by 48 grid.",
   "start": 65.658,
   "end": 68.038
  },
  {
   "zh": "每一格只记几个数字：温度、湿度",
   "en": "Each cell stores just a few numbers: temperature,",
   "start": 68.258,
   "end": 71.206
  },
  {
   "zh": "燃料、冰，还有电荷",
   "en": "moisture, fuel, ice and charge.",
   "start": 71.206,
   "end": 72.974
  },
  {
   "zh": "你看到的火焰、水洼和电弧",
   "en": "The flames, puddles and arcs you see are",
   "start": 73.194,
   "end": 75.269
  },
  {
   "zh": "都只是这些数字的画面",
   "en": "only pictures of those numbers.",
   "start": 75.269,
   "end": 76.998
  },
  {
   "zh": "燃烧只有一个判断：够热、有燃料",
   "en": "Burning is a single check: hot enough, has fuel,",
   "start": 77.898,
   "end": 80.622
  },
  {
   "zh": "又不太湿，它就烧起来",
   "en": "not too wet. Then it ignites.",
   "start": 80.622,
   "end": 82.438
  },
  {
   "zh": "烧着的格子消耗燃料",
   "en": "A burning cell eats its fuel and",
   "start": 82.658,
   "end": 84.268
  },
  {
   "zh": "把热量放给周围八个邻居。邻居变热",
   "en": "releases heat to its eight neighbours. They heat up and",
   "start": 84.268,
   "end": 87.132
  },
  {
   "zh": "又接着烧",
   "en": "catch in turn.",
   "start": 87.132,
   "end": 87.848
  },
  {
   "zh": "风只做一件事：",
   "en": "Wind does just one thing:",
   "start": 88.068,
   "end": 89.26
  },
  {
   "zh": "让下风方向的邻居多分一点热",
   "en": "downwind neighbours get a little more heat.",
   "start": 89.26,
   "end": 91.475
  },
  {
   "zh": "火线就自己歪了过去",
   "en": "The fire front bends on its own.",
   "start": 91.475,
   "end": 93.008
  },
  {
   "zh": "那怎么灭火？下一场雨",
   "en": "So how do you put it out? Make it rain.",
   "start": 93.908,
   "end": 95.79
  },
  {
   "zh": "雨水抬高湿度、带走热量",
   "en": "Rain raises moisture and draws away heat.",
   "start": 96.01,
   "end": 98.034
  },
  {
   "zh": "燃烧的判断不再成立，火就自己熄了",
   "en": "The burning check fails, and the fire dies by itself.",
   "start": 98.034,
   "end": 100.979
  },
  {
   "zh": "我们从没写过雨天关掉火焰特效",
   "en": "We never wrote 'hide the flames when it rains'.",
   "start": 101.199,
   "end": 103.535
  },
  {
   "zh": "改的只是数据",
   "en": "We only changed the data.",
   "start": 103.535,
   "end": 104.536
  },
  {
   "zh": "再看飞行。把所有燃烧格的热量加起来",
   "en": "Now flight. Add up the heat of every burning cell",
   "start": 105.436,
   "end": 108.275
  },
  {
   "zh": "就是一股上升气流",
   "en": "and you get an updraft.",
   "start": 108.275,
   "end": 109.61
  },
  {
   "zh": "滑翔伞飞进气流，就会被托起来",
   "en": "A paraglider that enters the column gets lifted.",
   "start": 109.83,
   "end": 112.15
  },
  {
   "zh": "火的输出，变成了移动的输入",
   "en": "Fire's output becomes movement's input.",
   "start": 112.15,
   "end": 114.305
  },
  {
   "zh": "这就是乘法：火和滑翔",
   "en": "That is multiplication:",
   "start": 114.525,
   "end": 116.251
  },
  {
   "zh": "原本是两套毫不相干的系统",
   "en": "fire and gliding were two unrelated systems.",
   "start": 116.251,
   "end": 118.323
  },
  {
   "zh": "冰也一样。周围够热，冰就变少",
   "en": "Ice works the same way. With enough heat around, it shrinks,",
   "start": 119.223,
   "end": 121.938
  },
  {
   "zh": "融出来的水让地面变湿",
   "en": "and the meltwater wets the ground.",
   "start": 121.938,
   "end": 123.877
  },
  {
   "zh": "湿地和金属能导电",
   "en": "Wet ground and metal conduct.",
   "start": 124.097,
   "end": 125.504
  },
  {
   "zh": "电荷沿着相邻的格子传过去",
   "en": "Charge hops from cell to neighbouring cell,",
   "start": 125.504,
   "end": 127.613
  },
  {
   "zh": "每走一步弱一点",
   "en": "weaker with every step.",
   "start": 127.613,
   "end": 128.844
  },
  {
   "zh": "现在把它们串起来：火融化冰",
   "en": "Now chain them: fire melts the ice, the meltwater",
   "start": 129.744,
   "end": 131.993
  },
  {
   "zh": "融水接通电路，远处的机关亮了",
   "en": "closes the circuit, and the far switch lights up.",
   "start": 131.993,
   "end": 134.416
  },
  {
   "zh": "这个解法我们一行都没写过",
   "en": "We never wrote this solution.",
   "start": 134.636,
   "end": 136.572
  },
  {
   "zh": "是规则自己算出来的",
   "en": "The rules worked it out.",
   "start": 136.572,
   "end": 138.025
  },
  {
   "zh": "想放进自己的游戏？记住三件事",
   "en": "Want this in your own game? Remember three things.",
   "start": 138.925,
   "end": 141.287
  },
  {
   "zh": "第一，模拟和渲染分开",
   "en": "One: keep simulation and rendering apart.",
   "start": 141.507,
   "end": 143.324
  },
  {
   "zh": "固定步长更新数据，画面只负责读",
   "en": "Update data on a fixed step; rendering only reads it.",
   "start": 143.324,
   "end": 146.05
  },
  {
   "zh": "第二，规则只看材料属性",
   "en": "Two: rules look at properties,",
   "start": 146.27,
   "end": 148.195
  },
  {
   "zh": "不看物体是谁",
   "en": "never at which object it is.",
   "start": 148.195,
   "end": 149.246
  },
  {
   "zh": "不要写火把碰到木箱这种特例",
   "en": "No special cases like 'torch touches crate'.",
   "start": 149.246,
   "end": 151.521
  },
  {
   "zh": "第三，先在小网格里把规则调稳",
   "en": "Three: tune the rules on a small grid first,",
   "start": 151.741,
   "end": 154.293
  },
  {
   "zh": "再搬进三维世界",
   "en": "then move to 3D, with spatial",
   "start": 154.293,
   "end": 155.57
  },
  {
   "zh": "用空间查询代替格子邻居",
   "en": "queries instead of grid neighbours.",
   "start": 155.57,
   "end": 157.575
  },
  {
   "zh": "效果预览和全部源码都放在网页里了",
   "en": "The live preview and full source are on the web page.",
   "start": 157.795,
   "end": 160.653
  },
  {
   "zh": "点火、下雨、放电，你可以自己玩",
   "en": "Light fires, make rain, send current. Try it yourself.",
   "start": 160.653,
   "end": 163.333
  },
  {
   "zh": "同样一把火，有的游戏烧的是世界",
   "en": "The same fire: some games burn the world,",
   "start": 164.233,
   "end": 166.677
  },
  {
   "zh": "有的游戏烧的是伤害",
   "en": "others burn damage.",
   "start": 166.677,
   "end": 168.144
  },
  {
   "zh": "下一期，我们专门拆原神的元素反应",
   "en": "Next time, we take apart Genshin Impact's elemental reactions.",
   "start": 168.364,
   "end": 170.916
  },
  {
   "zh": "如果这期对你有帮助，求一个一键三连",
   "en": "If this helped, please like, coin and favourite,",
   "start": 171.816,
   "end": 174.734
  },
  {
   "zh": "再点个关注",
   "en": "and hit follow.",
   "start": 174.734,
   "end": 175.592
  },
  {
   "zh": "让我薅点叔叔的羊毛",
   "en": "Let me earn a little from Uncle Bilibili,",
   "start": 175.812,
   "end": 177.196
  },
  {
   "zh": "继续开发自己的游戏。我们下期见！",
   "en": "so I can keep building my own game. See you next time!",
   "start": 177.196,
   "end": 179.657
  }
 ]
};
