# 作品集网站

一个数据驱动的交互 / 游戏设计作品集站点。当前包含 AR Demo（三个视频）、游戏 Demo、拆解案，以及“其他”分类下的 AIGC 动画与 IP 潮玩设计，支持按分类筛选与作品详情页。

## 预览

直接双击 `index.html` 即可在浏览器打开；也可以在目录下启动本地服务器预览：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 替换素材

把文件放入对应目录即可，文件名需与 `data/works.js` 中的路径一致：

- `media/ar-demo/`：`demo.mp4`、`demo2.mp4`、`demo3.mp4`、`preview.png`、`preview2.png`、`preview3.png`、`1.png`、`2.png`、`3.png`
- `media/game-demo/`：`demo.mp4`、`preview.png`
- `media/case-study/`：`case-study.pdf`、`preview.png`
- `media/other/AIGC Animation concept film/`：`Animation.mp4`、`preview.png`
- `media/other/Trendy toy design/`：`ip.png`、`preview.png`

`assets/` 下的封面图与海报压缩图是页面实际引用的图片，可替换为你的海报或截图，文件名建议保持不变。预览图会作为作品封面和视频海报使用。原片体积较大时，建议先压缩为 H.264 + AAC 的 MP4 和 1600px 以内的 JPG 再替换，页面会播放得更流畅。

## 新增作品

1. 复制 `data/works.js` 中任意一条作品记录。
2. 修改 `id`、`slug`、`title`、`category`、`summary` 等信息。
3. 在 `media/` 下新建同名目录，放入视频、图片或 PDF。
4. 打开 `index.html`，新作品会自动出现在筛选列表和首页。

如果一个作品有多个视频，在 `videos` 数组中按顺序添加即可，页面会自动生成 Demo 切换按钮。

## 修改个人信息

姓名、简介、邮箱、技能等内容都在 `data/site.js` 中维护。
