// 「压力」加权选招：教学原型。思路来自玩家对影之刃零的实测与推测（非官方实现）。
// 敌人不看你的按键，只看你的「状态」：血量、按键频率、是否在喝药。

//#region pressure
// 压力分：你越慌，分越高（0~1）
export function pressure({ hp, pressesPerSec, healing }) {
  const lowHp = 1 - hp;                        // 血越少越慌
  const mash = Math.min(1, pressesPerSec / 6); // 每秒按 6 下以上 = 乱按
  return Math.min(1, 0.45 * lowHp + 0.4 * mash + (healing ? 0.35 : 0));
}
//#endregion

//#region weights
// 招式权重：压力越高，狠招（红光、剑气）越容易被抽到
export const MOVES = [
  { name: '普通连斩', base: 5, fierce: 0 },
  { name: '后撤步', base: 3, fierce: 0 },
  { name: '剑气', base: 1, fierce: 6 },
  { name: '红光投技', base: 0.5, fierce: 8 },
];
export function weights(p) {
  return MOVES.map(m => ({ name: m.name, w: m.base + m.fierce * p * p }));
}
//#endregion

// 确定性抽签：同一个随机数 r ∈ [0,1) 永远抽到同一招
export function pick(p, r) {
  const ws = weights(p), total = ws.reduce((a, b) => a + b.w, 0);
  let x = r * total;
  for (const m of ws) { if ((x -= m.w) < 0) return m.name; }
  return ws[ws.length - 1].name;
}
