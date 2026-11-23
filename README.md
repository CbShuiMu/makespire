<p align="center">
  <img src="src-tauri/icons/128x128.png" width="80" height="80" alt="尖塔工坊图标">
</p>

# MakeSpire · 尖塔工坊

<p align="center">
  <img src="https://img.shields.io/badge/平台-Windows-2563eb?style=flat-square" alt="平台：Windows" />
  <img src="https://img.shields.io/badge/桌面框架-Tauri%202-eab308?style=flat-square" alt="桌面框架：Tauri 2" />
  <img src="https://img.shields.io/badge/编辑器-4%20类作品-2563eb?style=flat-square" alt="编辑器：4 类作品" />
  <img src="https://img.shields.io/badge/数据-本地%20JSON-475569?style=flat-square" alt="数据：本地 JSON" />
</p>

尖塔工坊（Spire Factory）是面向《杀戮尖塔 2》同人创作的 Windows 桌面工作台。你可以把自定义角色、卡牌、遗物和药水整理到同一个项目，预览设定，并通过 JSON 备份或分享。

## 你可以做什么

- **管理项目**。为一个角色或主题建立项目，将相关作品归档在一起。
- **编辑作品**。分别编辑角色、卡牌、遗物和药水。卡牌编辑器提供卡面预览。
- **从模板起稿**。制作 Agent 根据输入选用余烬或自然系列的本地模板，生成可继续修改的草案。
- **导入与导出**。从顶栏导入项目或完整工作空间，也可在对应编辑器中导出单份设定。导入确认后，相同 ID 的条目会更新，其余条目会保留。旧网页版的项目可先导出为 JSON，再导入桌面版。

> [!NOTE]
> 导出的 JSON 用于交换创作设定，无法直接安装到游戏。桌面应用目前尚未接入在线模型、动作帧生成或游戏模组打包。

## 在 Windows 上运行

需要 Node.js 20.19+（20.x）或 22.12+、Rust 1.90+ 的 MSVC 工具链、Visual Studio C++ Build Tools（含 Windows SDK）以及 WebView2 Runtime。

```powershell
git clone https://github.com/CbShuiMu/makespire.git
cd makespire
npm ci
npm run dev
```

`npm run dev` 会启动 Vite 开发服务器并打开 Tauri 桌面窗口。首次启动时可以从内置示例开始，也可以在「项目」中创建自己的项目。

## 构建与检查

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 构建 Windows 可执行文件和 NSIS 安装包 |
| `npm run ui:build` | 仅构建前端资源，输出到 `dist/` |
| `npm run test:rust` | 运行 Rust 测试 |
| `npm run check:rust` | 运行 Clippy 检查 |

桌面构建生成 `src-tauri/target/release/spire-factory.exe`，NSIS 安装包位于 `src-tauri/target/release/bundle/nsis/`。当前安装包未配置代码签名。运行已构建的桌面应用无需 Node.js 或开发服务器。

## 本地数据

Windows 工作空间保存在 `%APPDATA%\com.shuimu.spirefactory\workshop.json`。保存时通过临时文件替换原文件，并将上一版保存在同目录的 `workshop.backup.json`。顶栏可打开数据目录或导出完整工作空间。读取失败时，应用会保留原文件并提供重试。

## 图片生成 API

以下资料用于调用独立的图片渲染服务。桌面仓库提供接口文档和示例请求，运行示例需要一个可访问的渲染服务。

- [图片生成 API 文档](md/image-api.md)介绍如何把卡牌或遗物的 JSON 渲染成透明背景的 PNG，包含单张与批量请求、字段、响应格式和限额。
- [图片生成请求示例](md/examples/render-images.json)包含一张卡牌和一件遗物。可以将整个数组提交给批量接口，也可以取其中一个对象提交给单张接口。

## 项目结构

| 路径 | 内容 |
| --- | --- |
| [`src/`](src/) | React 界面、编辑器、本地模板和工作空间状态 |
| [`src-tauri/`](src-tauri/) | Tauri 桌面壳、文件对话框、JSON 校验和本地存储 |
| [`public/assets/`](public/assets/) | 卡框、字体和界面图标 |
| [`sts2-modding/`](sts2-modding/) | 供独立 C# 模组工程使用的开发指南和验证脚本 |

独立模组工程可通过仓库内的验证脚本检查编译、PCK、manifest 和加载初始化。具体环境要求和验证范围见[构建与验证指南](sts2-modding/references/build-test.md)。

卡框、字体和角色小图标沿用 `sts2customcard` 项目中的资源。演示插画和示例机制为尖塔工坊的演示内容。
