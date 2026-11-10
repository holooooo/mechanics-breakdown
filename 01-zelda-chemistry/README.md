# 塞尔达化学引擎 · 机制拆解第 1 期

作者：粑粑柑（梭哈ai版）

「机制拆解」系列第 1 期：一期 3 分钟的横版解析视频（1920×1080，中英双语字幕）和一个可交互的网页原型。主题是《塞尔达传说 旷野之息》在 GDC 2017 公开的「化学引擎」三条规则：元素→材料、元素→元素、材料✗材料。我们按这个思路写了一个可以玩的版本。

## 目录

| 路径 | 内容 |
|---|---|
| `index.html` `app.js` `site.css` | **效果预览 + 实现方法**：可以点火、下雨、通电、放冰块、放滑翔伞，打开数据视图看规则源码 |
| `src/sim.js` | 确定性的化学网格模拟（48×48，60 Hz 固定步长，规则按 `//#region` 分段） |
| `src/world.js` | Three.js 渲染：浮空岛、GPU 草、火焰 / 烟 / 蒸汽粒子、雨、冰、电弧、滑翔伞、Bloom 后期 |
| `film.html` `film.js` `film.css` | 视频合成页，`renderFrame(t)` 是时间 t 的纯函数，所有时间点都取自配音时间轴 |
| `script.json` | 唯一的文稿来源（中文旁白 + 英文字幕） |
| `tools/` | 配音（MamboTTS 曼波）、混音、逐帧渲染、合成 |
| `covers/` | 封面页面（背景是官方截图，来源见 `covers/ref/SOURCES.md`） |
| `out/` | 成片、封面、SRT、发布文案 |

## 在线预览

- 效果预览 + 实现方法：https://holooooo.github.io/zelda-chemistry-engine/
- 镜像（Cloudflare）：../01-zelda-chemistry/

## 本地预览

```bash
node tools/serve.mjs . 8017
```

浏览器打开 `http://127.0.0.1:8017/`（效果预览），或打开 `http://127.0.0.1:8017/film.html`（按空格播放解说）。

## 重新出片

```bash
PY=/Users/xiechuyu/code/vibe/test/MamboTTS/.venv-mac/bin/python
$PY tools/build_voice.py          # 配音、时间轴、SRT
node dev/make_cues.mjs            # 按画面事件生成音效点
$PY tools/build_audio.py          # 配乐和音效混音（带 BGM 一版，无 BGM 一版）
node tools/render.mjs --workers 3 --out build/video.mp4
tools/mux.sh build/video.mp4
```

## 资料来源

- GDC 2017：Change and Constant: Breaking Conventions with "The Legend of Zelda: Breath of the Wild"（藤林秀麿 / 滝澤智 / 堂田卓宏）
- GAME Watch 报道：https://game.watch.impress.co.jp/docs/news/1047403.html
- 视频里的场景、角色和代码都是原创教学原型，不是任天堂源码，也没有使用游戏实机画面。封面背景用的是任天堂官方宣传截图（© Nintendo）。
- 简化之处：网格近似；融水用湿度表示，不做流体模拟；电荷沿相邻格子传导，不是电路求解；上升气流是燃烧强度的求和。

## 仓库里没有的东西

开场和预告用到的游戏实机片段（© Nintendo / © HoYoverse）、官方截图、配音与成片视频都没有放进仓库。所以在线打开 `film.html` 时，开头 8 秒的实机画面是空的，其余部分可以正常渲染。

## License

代码采用 MIT 协议。`vendor/three` 是 Three.js r170（MIT）。
