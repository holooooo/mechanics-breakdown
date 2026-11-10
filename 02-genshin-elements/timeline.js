window.TIMELINE = {
 "duration": 140.526,
 "scenes": [
  {
   "id": "hook",
   "kicker": "机制拆解 · 第 2 期",
   "title": "翻倍是怎么算的？",
   "start": 0.0,
   "voiceEnd": 16.014,
   "end": 16.914,
   "lines": [
    {
     "zh": "胡桃一枪火打在怪身上，怪物头顶亮起一个小小的火元素图标。",
     "en": "Hu Tao lands a fiery strike, and a tiny Pyro icon lights up over the enemy's head.",
     "start": 0.6,
     "end": 4.987,
     "rehook": "钩子"
    },
    {
     "zh": "再补一下水，伤害直接翻倍。你有没有想过，这个翻倍是怎么算出来的？",
     "en": "Add a splash of Hydro and the damage doubles. Have you ever wondered how that doubling is worked out?",
     "start": 5.207,
     "end": 10.464,
     "rehook": "问"
    },
    {
     "zh": "上期我们拆了塞尔达的化学引擎，这期接着拆原神：同一把火，两种算法。",
     "en": "Last time we took apart Zelda's chemistry engine. This time, Genshin: the same fire, two algorithms.",
     "start": 10.684,
     "end": 16.014
    }
   ]
  },
  {
   "id": "contrast",
   "kicker": "01 · 两种火",
   "title": "算世界 vs 算伤害",
   "start": 16.914,
   "voiceEnd": 26.31,
   "end": 27.21,
   "lines": [
    {
     "zh": "塞尔达的火，是写进世界的状态，它会沿着格子传给下一片草。",
     "en": "Zelda's fire is a state written into the world. It passes from cell to cell, into the next patch of grass.",
     "start": 16.914,
     "end": 21.384
    },
    {
     "zh": "原神的火也能点草，但战斗真正围绕的，是附着在敌人身上的一个量。",
     "en": "Genshin's fire can light grass too, but combat really revolves around an amount attached to the enemy.",
     "start": 21.604,
     "end": 26.31,
     "rehook": "反转"
    }
   ]
  },
  {
   "id": "gauge",
   "kicker": "02 · 元素附着",
   "title": "1U 打上去，只剩 0.8U",
   "start": 27.21,
   "voiceEnd": 47.297,
   "end": 48.197,
   "lines": [
    {
     "zh": "玩家把这个量叫做元素量，单位是 U。一次普通的火元素攻击，通常是 1U。",
     "en": "Players call it the elemental gauge, measured in units, U. A typical Pyro hit applies 1U.",
     "start": 27.21,
     "end": 33.15
    },
    {
     "zh": "但据玩家实测，打上去以后只剩 0.8U，这两成的损耗被叫作附着税。",
     "en": "But player testing shows only 0.8U remains. That twenty percent loss is called the aura tax.",
     "start": 33.37,
     "end": 38.756,
     "rehook": "反转"
    },
    {
     "zh": "它还会按固定速度衰减，1U 的附着，大约九点五秒后消失。",
     "en": "It also decays at a fixed rate. A 1U aura is gone after about nine and a half seconds.",
     "start": 38.976,
     "end": 43.282
    },
    {
     "zh": "同种元素再打一次，元素量取较大的那个，不会叠加。",
     "en": "Hit with the same element again, and the gauge takes the larger value. It does not stack.",
     "start": 43.502,
     "end": 47.297
    }
   ]
  },
  {
   "id": "react",
   "kicker": "03 · 反应 = 消耗",
   "title": "后手元素，吃掉附着",
   "start": 48.197,
   "voiceEnd": 67.808,
   "end": 68.708,
   "lines": [
    {
     "zh": "那反应是什么？其实就是后打上去的元素，去消耗已经附着的元素。",
     "en": "So what is a reaction? The element that arrives second consumes the aura already there.",
     "start": 48.197,
     "end": 52.665,
     "rehook": "问"
    },
    {
     "zh": "水打在火上叫强蒸发，伤害乘二，但要消耗两倍的火。",
     "en": "Hydro on Pyro is a strong Vaporize: damage times two, but it eats twice the Pyro.",
     "start": 52.885,
     "end": 56.998
    },
    {
     "zh": "反过来火打在水上是弱蒸发，伤害乘一点五，只消耗一半的水。",
     "en": "Pyro on Hydro is the weak version: damage times one and a half, consuming only half the Hydro.",
     "start": 57.218,
     "end": 62.104
    },
    {
     "zh": "超载、感电这类剧变反应不一样，它们不吃暴击，只看角色等级和元素精通。",
     "en": "Transformative reactions like Overloaded and Electro-Charged differ: no crits, only character level and Elemental Mastery.",
     "start": 62.324,
     "end": 67.808
    }
   ]
  },
  {
   "id": "icd",
   "kicker": "04 · 隐藏规则",
   "title": "为什么连打不挂元素？",
   "start": 68.708,
   "voiceEnd": 80.436,
   "end": 81.336,
   "lines": [
    {
     "zh": "还有一条隐藏规则，叫元素附着冷却。",
     "en": "There is one more hidden rule: the element application cooldown.",
     "start": 68.708,
     "end": 71.452,
     "rehook": "钩子"
    },
    {
     "zh": "大多数攻击每三下、或者每两点五秒，才会真正挂上一次元素。",
     "en": "Most attacks only apply their element once every three hits, or every two and a half seconds.",
     "start": 71.672,
     "end": 76.21
    },
    {
     "zh": "所以连射七箭，可能只有第一、第四、第七箭带上了火。",
     "en": "So of seven rapid arrows, perhaps only the first, fourth and seventh carry Pyro.",
     "start": 76.43,
     "end": 80.436
    }
   ]
  },
  {
   "id": "impl",
   "kicker": "05 · 实现方法",
   "title": "一张附着表就够了",
   "start": 81.336,
   "voiceEnd": 97.49,
   "end": 98.39,
   "lines": [
    {
     "zh": "写成代码其实不复杂。每个敌人身上挂一张附着表：元素、元素量、衰减速度。",
     "en": "In code it is not complicated. Each enemy carries an aura table: element, gauge and decay rate.",
     "start": 81.336,
     "end": 87.037,
     "rehook": "钩子"
    },
    {
     "zh": "打中时先查冷却，再查附着表，能反应就按倍率消耗，不能反应就附着上去。",
     "en": "On hit, check the cooldown, then the aura table: react and consume by the multiplier, or attach the new element.",
     "start": 87.257,
     "end": 92.729
    },
    {
     "zh": "最后按反应类型算伤害，整个系统都发生在一个单位的头顶。",
     "en": "Finally compute damage by reaction type. The whole system lives above one target's head.",
     "start": 92.949,
     "end": 97.49
    }
   ]
  },
  {
   "id": "demo",
   "kicker": "06 · 效果预览",
   "title": "给木桩挂火，再浇水",
   "start": 98.39,
   "voiceEnd": 107.516,
   "end": 108.416,
   "lines": [
    {
     "zh": "我们把这套规则也做成了能玩的网页：先给木桩挂火，再浇一下水。",
     "en": "We turned these rules into a playable web page too: put Pyro on a training dummy, then add Hydro.",
     "start": 98.39,
     "end": 103.111
    },
    {
     "zh": "看头顶的附着条怎么被一口吃掉，伤害数字又是怎么翻倍的。",
     "en": "Watch the aura bar get eaten in one bite, and the damage number double.",
     "start": 103.331,
     "end": 107.516
    }
   ]
  },
  {
   "id": "compare",
   "kicker": "07 · 两种算法",
   "title": "算世界，算伤害",
   "start": 108.416,
   "voiceEnd": 120.839,
   "end": 121.739,
   "lines": [
    {
     "zh": "塞尔达算的是世界，规则在格子之间传播；原神算的是伤害，规则在单位身上结算。",
     "en": "Zelda computes the world: rules spread between cells. Genshin computes damage: rules resolve on each unit.",
     "start": 108.416,
     "end": 114.254,
     "rehook": "反转"
    },
    {
     "zh": "两种做法没有高下，都是用少数规则，乘出大量的玩法。",
     "en": "Neither is better. Both multiply a few rules into a huge amount of play.",
     "start": 114.474,
     "end": 118.419
    },
    {
     "zh": "你更喜欢哪一种？评论区告诉我。",
     "en": "Which do you prefer? Tell me in the comments.",
     "start": 118.639,
     "end": 120.839
    }
   ]
  },
  {
   "id": "teaser",
   "kicker": "下期预告",
   "title": "敌人在读你的按键？",
   "start": 121.739,
   "voiceEnd": 129.427,
   "end": 130.327,
   "lines": [
    {
     "zh": "下一期，我们换个问题：为什么有的敌人，好像比你先知道你要按什么键？",
     "en": "Next time, a different question: why do some enemies seem to know which button you'll press before you do?",
     "start": 121.739,
     "end": 126.681,
     "rehook": "钩子"
    },
    {
     "zh": "从魂系列的读指令，讲到影之刃零。",
     "en": "From input reading in the Souls games, all the way to Phantom Blade Zero.",
     "start": 126.901,
     "end": 129.427
    }
   ]
  },
  {
   "id": "outro",
   "kicker": "感谢观看",
   "title": "一键三连 + 关注",
   "start": 130.327,
   "voiceEnd": 137.526,
   "end": 140.526,
   "lines": [
    {
     "zh": "如果这期对你有帮助，求一个一键三连，再点个关注。",
     "en": "If this helped, please like, coin and favourite, and hit follow.",
     "start": 130.327,
     "end": 134.067
    },
    {
     "zh": "机制拆解下期见，我继续薅叔叔的羊毛做游戏！",
     "en": "See you next time on Mechanic Breakdown. I'll keep earning from Uncle Bilibili to build my game!",
     "start": 134.287,
     "end": 137.526
    }
   ]
  }
 ],
 "subs": [
  {
   "zh": "胡桃一枪火打在怪身上",
   "en": "Hu Tao lands a fiery strike,",
   "start": 0.6,
   "end": 2.287
  },
  {
   "zh": "怪物头顶亮起一个小小的火元素图标",
   "en": "and a tiny Pyro icon lights up over the enemy's head.",
   "start": 2.287,
   "end": 4.987
  },
  {
   "zh": "再补一下水，伤害直接翻倍",
   "en": "Add a splash of Hydro and the damage doubles.",
   "start": 5.207,
   "end": 7.31
  },
  {
   "zh": "你有没有想过",
   "en": "Have you ever",
   "start": 7.31,
   "end": 8.361
  },
  {
   "zh": "这个翻倍是怎么算出来的？",
   "en": "wondered how that doubling is worked out?",
   "start": 8.361,
   "end": 10.464
  },
  {
   "zh": "上期我们拆了塞尔达的化学引擎",
   "en": "Last time we took apart Zelda's chemistry engine.",
   "start": 10.684,
   "end": 13.091
  },
  {
   "zh": "这期接着拆原神：同一把火，两种算法",
   "en": "This time, Genshin: the same fire, two algorithms.",
   "start": 13.091,
   "end": 16.014
  },
  {
   "zh": "塞尔达的火，是写进世界的状态",
   "en": "Zelda's fire is a state written into the world. It passes",
   "start": 16.914,
   "end": 19.321
  },
  {
   "zh": "它会沿着格子传给下一片草",
   "en": "from cell to cell, into the next patch of grass.",
   "start": 19.321,
   "end": 21.384
  },
  {
   "zh": "原神的火也能点草，但战斗真正围绕的",
   "en": "Genshin's fire can light grass too, but combat really revolves",
   "start": 21.604,
   "end": 24.363
  },
  {
   "zh": "是附着在敌人身上的一个量",
   "en": "around an amount attached to the enemy.",
   "start": 24.363,
   "end": 26.31
  },
  {
   "zh": "玩家把这个量叫做元素量，单位是 U",
   "en": "Players call it the elemental gauge,",
   "start": 27.21,
   "end": 30.18
  },
  {
   "zh": "一次普通的火元素攻击，通常是 1U",
   "en": "measured in units, U. A typical Pyro hit applies 1U.",
   "start": 30.18,
   "end": 33.15
  },
  {
   "zh": "但据玩家实测",
   "en": "But player testing",
   "start": 33.37,
   "end": 34.447
  },
  {
   "zh": "打上去以后只剩 0.8U",
   "en": "shows only 0.8U remains. That twenty",
   "start": 34.447,
   "end": 36.601
  },
  {
   "zh": "这两成的损耗被叫作附着税",
   "en": "percent loss is called the aura tax.",
   "start": 36.601,
   "end": 38.756
  },
  {
   "zh": "它还会按固定速度衰减，1U 的附着",
   "en": "It also decays at a fixed rate. A 1U aura is gone after",
   "start": 38.976,
   "end": 41.791
  },
  {
   "zh": "大约九点五秒后消失",
   "en": "about nine and a half seconds.",
   "start": 41.791,
   "end": 43.282
  },
  {
   "zh": "同种元素再打一次",
   "en": "Hit with the same element again,",
   "start": 43.502,
   "end": 44.882
  },
  {
   "zh": "元素量取较大的那个，不会叠加",
   "en": "and the gauge takes the larger value. It does not stack.",
   "start": 44.882,
   "end": 47.297
  },
  {
   "zh": "那反应是什么？",
   "en": "So what is a reaction?",
   "start": 48.197,
   "end": 49.314
  },
  {
   "zh": "其实就是后打上去的元素",
   "en": "The element that arrives second",
   "start": 49.314,
   "end": 51.069
  },
  {
   "zh": "去消耗已经附着的元素",
   "en": "consumes the aura already there.",
   "start": 51.069,
   "end": 52.665
  },
  {
   "zh": "水打在火上叫强蒸发，伤害乘二",
   "en": "Hydro on Pyro is a strong Vaporize: damage times two,",
   "start": 52.885,
   "end": 55.503
  },
  {
   "zh": "但要消耗两倍的火",
   "en": "but it eats twice the Pyro.",
   "start": 55.503,
   "end": 56.998
  },
  {
   "zh": "反过来火打在水上是弱蒸发",
   "en": "Pyro on Hydro is the weak version:",
   "start": 57.218,
   "end": 59.473
  },
  {
   "zh": "伤害乘一点五，只消耗一半的水",
   "en": "damage times one and a half, consuming only half the Hydro.",
   "start": 59.473,
   "end": 62.104
  },
  {
   "zh": "超载、感电这类剧变反应不一样",
   "en": "Transformative reactions like Overloaded and Electro-Charged",
   "start": 62.324,
   "end": 64.801
  },
  {
   "zh": "它们不吃暴击",
   "en": "differ: no crits,",
   "start": 64.801,
   "end": 65.862
  },
  {
   "zh": "只看角色等级和元素精通",
   "en": "only character level and Elemental Mastery.",
   "start": 65.862,
   "end": 67.808
  },
  {
   "zh": "还有一条隐藏规则，叫元素附着冷却",
   "en": "There is one more hidden rule: the element application cooldown.",
   "start": 68.708,
   "end": 71.452
  },
  {
   "zh": "大多数攻击每三下、或者每两点五秒",
   "en": "Most attacks only apply their element once every three hits,",
   "start": 71.672,
   "end": 74.465
  },
  {
   "zh": "才会真正挂上一次元素",
   "en": "or every two and a half seconds.",
   "start": 74.465,
   "end": 76.21
  },
  {
   "zh": "所以连射七箭，可能只有第一、第四",
   "en": "So of seven rapid arrows, perhaps only the first,",
   "start": 76.43,
   "end": 79.216
  },
  {
   "zh": "第七箭带上了火",
   "en": "fourth and seventh carry Pyro.",
   "start": 79.216,
   "end": 80.436
  },
  {
   "zh": "写成代码其实不复杂",
   "en": "In code it is not complicated.",
   "start": 81.336,
   "end": 82.939
  },
  {
   "zh": "每个敌人身上挂一张附着表：元素",
   "en": "Each enemy carries an aura table: element,",
   "start": 82.939,
   "end": 85.612
  },
  {
   "zh": "元素量、衰减速度",
   "en": "gauge and decay rate.",
   "start": 85.612,
   "end": 87.037
  },
  {
   "zh": "打中时先查冷却，再查附着表",
   "en": "On hit, check the cooldown, then the aura table:",
   "start": 87.257,
   "end": 89.552
  },
  {
   "zh": "能反应就按倍率消耗",
   "en": "react and consume by the multiplier,",
   "start": 89.552,
   "end": 91.141
  },
  {
   "zh": "不能反应就附着上去",
   "en": "or attach the new element.",
   "start": 91.141,
   "end": 92.729
  },
  {
   "zh": "最后按反应类型算伤害",
   "en": "Finally compute damage by reaction type.",
   "start": 92.949,
   "end": 94.766
  },
  {
   "zh": "整个系统都发生在一个单位的头顶",
   "en": "The whole system lives above one target's head.",
   "start": 94.766,
   "end": 97.49
  },
  {
   "zh": "我们把这套规则也做成了能玩的网页：",
   "en": "We turned these rules into a playable web page too:",
   "start": 98.39,
   "end": 101.157
  },
  {
   "zh": "先给木桩挂火，再浇一下水",
   "en": "put Pyro on a training dummy, then add Hydro.",
   "start": 101.157,
   "end": 103.111
  },
  {
   "zh": "看头顶的附着条怎么被一口吃掉",
   "en": "Watch the aura bar get eaten in one bite,",
   "start": 103.331,
   "end": 105.674
  },
  {
   "zh": "伤害数字又是怎么翻倍的",
   "en": "and the damage number double.",
   "start": 105.674,
   "end": 107.516
  },
  {
   "zh": "塞尔达算的是世界",
   "en": "Zelda computes the world:",
   "start": 108.416,
   "end": 109.789
  },
  {
   "zh": "规则在格子之间传播；原神算的是伤害",
   "en": "rules spread between cells. Genshin computes damage:",
   "start": 109.789,
   "end": 112.708
  },
  {
   "zh": "规则在单位身上结算",
   "en": "rules resolve on each unit.",
   "start": 112.708,
   "end": 114.254
  },
  {
   "zh": "两种做法没有高下，都是用少数规则",
   "en": "Neither is better. Both multiply a few rules into",
   "start": 114.474,
   "end": 117.218
  },
  {
   "zh": "乘出大量的玩法",
   "en": "a huge amount of play.",
   "start": 117.218,
   "end": 118.419
  },
  {
   "zh": "你更喜欢哪一种？评论区告诉我",
   "en": "Which do you prefer? Tell me in the comments.",
   "start": 118.639,
   "end": 120.839
  },
  {
   "zh": "下一期，我们换个问题：",
   "en": "Next time, a different question:",
   "start": 121.739,
   "end": 123.438
  },
  {
   "zh": "为什么有的敌人",
   "en": "why do some enemies seem to",
   "start": 123.438,
   "end": 124.519
  },
  {
   "zh": "好像比你先知道你要按什么键？",
   "en": "know which button you'll press before you do?",
   "start": 124.519,
   "end": 126.681
  },
  {
   "zh": "从魂系列的读指令，讲到影之刃零",
   "en": "From input reading in the Souls games, all the way to Phantom Blade Zero.",
   "start": 126.901,
   "end": 129.427
  },
  {
   "zh": "如果这期对你有帮助，求一个一键三连",
   "en": "If this helped, please like, coin and favourite,",
   "start": 130.327,
   "end": 133.217
  },
  {
   "zh": "再点个关注",
   "en": "and hit follow.",
   "start": 133.217,
   "end": 134.067
  },
  {
   "zh": "机制拆解下期见",
   "en": "See you next time on Mechanic Breakdown.",
   "start": 134.287,
   "end": 135.421
  },
  {
   "zh": "我继续薅叔叔的羊毛做游戏！",
   "en": "I'll keep earning from Uncle Bilibili to build my game!",
   "start": 135.421,
   "end": 137.526
  }
 ]
};
