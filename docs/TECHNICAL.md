# LIVECTRA 技术详解

本文对应当前仓库的静态网页版实现。入口在 [`index.html`](../index.html)，样式在 [`style.css`](../style.css)，交互与转换流程在 [`app.js`](../app.js)。转换引擎是随仓库提供的 [`vendor/imagetracer.js`](../vendor/imagetracer.js)。项目不需要 Node.js 参与生产环境运行，GitHub Pages 只提供静态文件。

## 数据如何流动

```text
本地文件 / 内置示例
    ↓ File API + Object URL
浏览器图片解码
    ↓ Canvas（最长边限制为 1400 px）
ImageData（RGBA 像素）
    ↓ ImageTracerJS：颜色量化 → 边界跟踪 → 曲线拟合
SVG 字符串
    ↓ DOMParser + 白名单重建
页面中的 <svg><path … /></svg>
    ↓ 路径选取、改色、删除、撤销
XMLSerializer → Blob → 本地 SVG 下载
```

**输入不会作为请求发送到转换服务器。** 页面本身由 GitHub Pages 加载；选择的文件通过 `URL.createObjectURL()` 在本页读取，关闭或清除文件时撤销该对象 URL。`File API` 只是浏览器本地读取入口，不意味着把文件上传到 GitHub。

## 关键实现

### 1. 读取与尺寸控制

`handleFile()` 验证 MIME 类型与 10 MB 文件上限，并显示原图。`convert()` 再解码图片，根据原始宽高计算：

```js
const ratio = Math.min(1, 1400 / Math.max(width, height));
const outputWidth = Math.round(width * ratio);
const outputHeight = Math.round(height * ratio);
```

这限制的是**参与描摹的像素尺寸**，因此超大源图的 SVG 输出视口也会缩小。SVG 的路径几何仍可在矢量软件中缩放。浏览器必须先能解码原文件；10 MB 与 1400 px 是实用性保护，并非对内存或处理时间的硬保证。

### 2. 颜色量化与曲线拟合

Canvas 的 `getImageData()` 产出 RGBA 像素。`ImageTracer.imagedataToSVG()` 负责将颜色归为有限调色板、检测相邻色块边界，再拟合线段与二次曲线。主要参数由 `makeOptions()` 生成：

| UI 设置 / 参数 | 当前用途 |
| --- | --- |
| `numberofcolors` | 色彩层次滑块，范围 4–40；越高通常保留更多色阶，也更容易增加路径量。 |
| `ltres`, `qtres` | 曲线精度滑块映射的线段、曲线拟合容差；等级越高，容差越小，轮廓通常更贴近像素。 |
| `pathomit` | 省略较小路径；极简模式至少为 15，用来压制细碎色块。 |
| `blurradius` | 预处理模糊半径；丰富细节为 0，精致插画为 1，极简图形为 3。 |
| `colorsampling: 2` | 引擎颜色取样策略。 |
| `colorquantcycles: 3` | 颜色量化迭代次数。 |
| `rightangleenhance` | 丰富细节和极简模式开启直角增强，精致插画关闭。 |
| `roundcoords: 2` | SVG 坐标保留两位小数。 |

三种预设只是参数起点。滑块改动后必须再次点“生成矢量图”，预览才会使用新参数。颜色数高不一定更好；对有渐变或噪点的照片，高颜色数会生成大量互相覆盖的小路径。

### 3. SVG 结果清理

`cleanSVG()` 用 `DOMParser` 读取引擎 SVG，再建立新的 SVG 根元素，并逐条复制非空路径的 `d` 与少量绘制属性：`style`、`fill`、`stroke`、`stroke-width`、`fill-rule`、`transform`。这让交付文件保持简单且可编辑。当前处理流程不保留分组、图层名、渐变定义和文本节点；因此不能把它理解为语义化设计稿。

SVG 文件中的颜色可能由路径的 `style` 属性给出。网页改色时使用 `element.style.fill` 修改选中路径；最终文件由 `XMLSerializer` 从当前 DOM 生成。下载时会去掉只用于预览的选中态 class 与辅助可访问性属性。

### 4. 编辑、撤销与导出

- 点击矢量预览中的任意 `<path>` 即可选中。修改颜色或删除前，当前 SVG 字符串被推入历史栈。
- 历史栈最多保存 **20** 个状态。撤销会重新解析上一个 SVG；重新生成会清空历史。
- 导出通过 `Blob` 创建本地下载链接，文件名为原文件名加 `-livectra.svg`。网页不直接产生 Adobe Illustrator 专有 `.ai` 文件。
- Illustrator 等编辑器打开 SVG 后仍需按实际用途整理图层和路径，必要时另存为 `.ai`。

## 文件结构

```text
laoli-livectra/
├── index.html                  页面结构与中文界面
├── style.css                   响应式视觉样式
├── app.js                      本地转换、编辑和导出
├── favicon.svg                 网站图标
├── vendor/
│   ├── imagetracer.js          第三方描摹引擎 1.2.6
│   └── LICENSE-ImageTracer     第三方许可
├── docs/
│   ├── TECHNICAL.md            本文
│   └── assets/                 README 图示与自制示例
├── .github/workflows/pages.yml GitHub Pages 自动部署
├── LICENSE                     LIVECTRA 的 MIT 许可
└── README.md                   中文项目主页
```

## 本地开发与部署

项目没有打包器或运行时依赖安装步骤。在仓库根目录启动静态服务器，例如 `python -m http.server 8080`，然后访问 `http://localhost:8080`。修改 HTML、CSS 或 JS 后刷新即可。图片转换逻辑均在客户端，调试时可查看浏览器控制台与页面底部状态提示。

部署使用仓库内的 GitHub Actions 工作流。它在 `main` 分支推送或手动触发时，把仓库作为静态站点工件上传，再部署至 GitHub Pages。首次部署需要仓库的 Pages Source 设为 **GitHub Actions**。站点不需要 API 密钥或环境变量。

## 质量边界与后续方向

自动描摹按照像素外观生成形状，无法推断原画的图层语义、文字内容、线条骨架或视觉设计意图。复杂图片常需要手动合并色块、减少路径、重画局部轮廓。当前网页编辑仅支持改单条路径填充色、删除与撤销；尚无节点编辑、分层、批量优化或 AI 辅助重绘。

如要实现更接近人工重绘的效果，合理方向是增加“对象识别 + 分层建议 + 局部重绘 + 人工校对”的工作流。那将是未来功能，**不属于当前版本能力**。欢迎通过 Issue 讨论具体方案和可验证的测试素材。
