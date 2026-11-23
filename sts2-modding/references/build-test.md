# 构建、打包与验收

## 默认后台验证

Windows 模组工程写入完成后，Agent 自动调用技能自带的验证器。路径按当前技能根目录解析。

```powershell
python scripts/verify_mod.py 'E:/Mods/EmberMod'
```

脚本使用 Python 3.10+ 标准库和本机 .NET SDK，自动读取 Steam 库路径，优先用当前安装游戏的 DLL 替换暂存副本内旧式 `libs/` 引用。验证器从官方 `megadot.megacrit.com` 自动下载与游戏匹配的 Windows Mono 编辑器，验证官方 SHA256 后缓存。首次需下载约 580 MB，后续复用。缓存和每次独立运行目录在 `%LOCALAPPDATA%/SpireFactory/verification/`，所有子进程隐藏窗口、捕获日志并设置超时。工具安装和运行由进程锁串行执行。

输入为单个根目录 `.csproj` 的完整工程。读取源工程构建目标后执行，常见 `ModsPath` 输出会定向到暂存目录。跨目录 ProjectReference、自定义硬编码部署脚本需按实际工程适配，不能假设复制工程会隔离任意构建脚本的副作用。可选 `--game`、`--godot`、`--preset`、`--cache` 由 Agent 在自动发现不足时传入。

验证链为 C# 编译、直接导出本次 PCK、全新 MegaDot 进程挂载并读取包内文件和 JSON、manifest 核对、原版 ModManager 初始化。加载探针使用独立 Godot 项目、挂载本机游戏资源，并从本机已安装模组或 Workshop 复制声明的依赖到暂存包。它检查实际 `Mod.state` 和 `Mod.errors`，初始化完成日志仅作为辅助证据。当前加载探针已针对 STS2 v0.111.0、MegaDot 4.5.1-m.14、net9.0 实测，游戏 API 更新引起探针编译失败时应修复探针并记录兼容性。

退出码 0 表示报告中已执行阶段通过，退出码 1 附失败阶段和日志路径。报告单独记录 `game_startup`、`gameplay` 为 `not_run`。加载探针覆盖原版加载器、依赖、初始化和当场应用的 Harmony 补丁；完整启动、延迟补丁、卡牌效果、场景实例化与联机需另外验证。依赖完整游戏生命周期的模组在探针中报错时，先判断宿主上下文缺失，避免为通过探针修改正确玩法代码。

缺少 manifest、依赖或编译错误时，Agent 根据日志完成任务范围内的修复后重新运行。重复同一外部依赖问题且已无可执行修复时，准确报告缺口。源工程修复完成后的新结果才可用于交付。

## 执行前查实际构建行为

读取 `.csproj`、`Directory.Build.props/targets`、导入的 props、`export_presets.cfg`。当前 Alchyr 模板的 Build 会拷贝 DLL/manifest/PDB 到 `ModsPath`，Publish 还会调用引擎导出 PCK；本地构建也可能安装模组。

若任务只需构建产物，将已确认可覆盖的 `ModsPath` 定向到工程内 staging，并保留目录末尾分隔符（模板部分目标使用字符串拼接）。示例仅适用于已核对的 Alchyr 模板：

```powershell
$modProject = 'E:\Mods\EmberMod\EmberMod.csproj'
$stageMods = 'E:/Mods/EmberMod/artifacts/mods/'
dotnet build $modProject -c Debug "-p:ModsPath=$stageMods"
# 改动本地化、图片或场景后：
dotnet publish $modProject -c Debug "-p:ModsPath=$stageMods"
```

`ModsPath` 不是所有模组通用属性；先读脚本再用。用户已要求部署测试时，在确认实际路径后可直接安装到对应游戏 mods 子目录，无需重复确认。不要覆盖其他模组。

当前模板 `GodotPublish` 使用 `ContinueOnError="WarnAndContinue"`。因此检查构建输出中的引擎错误、PCK 时间/大小及本次内容，不能只看 dotnet 退出码或旧 PCK 是否存在。导出失败不能复制上次文件冒充新产物。

旧工程可使用匹配版本引擎的 `--headless --path <项目> --export-pack <实际预设> <输出.pck>`，参数由当前工程确认。旧模板预设是 `Windows Desktop`，当前 Alchyr 模板是 `BasicExport`，不可互换。导入资产、安装导出模板等按实际报错解决，不预先修改全局配置。

来源：[内容工程构建目标](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentMod.csproj)、[引擎路径配置](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/Directory.Build.props)。

## 静态与产物检查

1. 对照需求逐项确认对象、时机、目标、数值和升级；新增卡牌/遗物已归属正确池，Power 有正确叠加规则。
2. 运行 `scripts/inspect_mod.py <root>`：JSON/XML 语法、重复键、manifest 文件名/id、依赖声明、构建副作用线索。警告需要人工判断；脚本不解析 C#，不计算完整 MSBuild 属性，不核验所有图像引用。
3. 编译实际工程，不使用伪造 DLL、空桩 API 或只编译孤立 C# 文件来代替真实引用。区分缺 SDK/包/游戏 DLL 与业务编译错误。
4. 检查 manifest 的 `id` 与同目录 DLL/PCK 名称，`has_dll`/`has_pck` 与产物一致。`dependencies`、最低游戏版本和实际运行时匹配。改变玩法的模组应正确标记 `affects_gameplay`，不能为绕过联机校验而写 false。
5. 资源变更重新导出；确认项目导出包含本模组资源，保留 Godot 导入/场景依赖。不要把 `.godot` 缓存、开发用 `sts2.dll`、反编译源码或整套游戏资源作为发布包。
6. 暂存包通常为 `<ModId>/<ModId>.json`、`.dll`、`.pck`，仅包含 manifest 声明需要的文件及自身允许分发的依赖。记录实际 BaseLib/游戏兼容版本。

## 游戏内验证

使用当前游戏已启用的模组环境；维护测试存档，不把删除存档作为默认排障手段。查 Mod Settings 是否识别模组与依赖，再确认对象能生成/获取。

开发控制台先用 `help`、`help card` 等确认当前命令语法，不凭记忆拼生成指令。BaseLib 提供 `showlog`，`open logs` 可定位日志；Windows 常见目录为 `%APPDATA%/SlayTheSpire2/logs`，最新日志通常是 `godot.log`，以本机实际位置为准。

针对变更测试：

- 卡牌：使用、目标/无目标、能量消耗、升级前后数值、抽弃耗尽等相关行为。
- Power/遗物：获得、叠加、移除、归属、回合/战斗边界及重复触发。
- 持久机制：保存/载入恢复状态；避免静态字段跨局污染。
- 本地化/资源：实际语言下无裸键、数值随升级更新、图像/场景无缺失。
- 联机相关改动：同版本/模组组合的主客机重现玩家选择与 RNG；未经验证不宣称支持联机。

来源：[Testing and Debugging](https://github.com/Alchyr/ModTemplate-StS2/wiki/Testing-and-Debugging)、[manifest 与模组文件](https://github.com/Alchyr/ModTemplate-StS2/wiki/Modding-Basics)。

## 常见症状的调查顺序

| 症状 | 优先检查 |
| --- | --- |
| 编译成功但对象不出现 | 初始化日志、依赖、注册/Pool、对象过滤条件 |
| 描述显示键名或图片没更新 | 真正 ID/前缀、语言目录、资源路径、PCK 是否本次重新生成 |
| 游戏更新后 MissingMethod/TypeLoad | 目标游戏分支、引用 DLL 与 BaseLib 运行时是否一致 |
| 游戏无法加载 PCK | 引擎版本、导出日志、预设与包路径，不只看文件存在 |
| Harmony Patch 失败 | 原始方法签名、重载、可见性、其他补丁及初始化顺序 |
| 升级描述与实效不同 | 动态变量名、BaseValue/实际值、OnUpgrade 与本地化格式 |
| 联机不同步 | RNG、choice context、执行顺序、静态共享状态、玩法标记 |

交付明确区分：静态检查通过 / 编译通过 / PCK 导出核验 / 游戏内验证。未能执行的步骤给出原因和可复现操作，不将它们写成已通过。
