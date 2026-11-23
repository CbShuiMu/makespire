# 来源、范围与刷新

研究日期：2026-11-11（Asia/Shanghai）。本技能是原始工作流与维护者资料的归纳，未复制游戏源码或二进制文件。

## 一手在线来源

| 来源 | 使用目的 |
| --- | --- |
| [BaseLib-StS2](https://github.com/Alchyr/BaseLib-StS2) | 确认项目身份、NuGet 与运行时依赖 |
| [BaseLib Wiki](https://alchyr.github.io/BaseLib-Wiki/) | 模型、Hooks、场景、本地化的入口 |
| [BaseLib Abstracts](https://github.com/Alchyr/BaseLib-StS2/tree/master/Abstracts) | 按实际版本核对 Custom* 类型 |
| [BaseLib.csproj](https://github.com/Alchyr/BaseLib-StS2/blob/master/BaseLib.csproj) | 引用和版本快照；核查时为 3.4.7，非永久推荐版本 |
| [ModTemplate-StS2](https://github.com/Alchyr/ModTemplate-StS2) | 空白、内容、角色三类模板 |
| [Setup](https://github.com/Alchyr/ModTemplate-StS2/wiki/Setup) | MegaDot、.NET、模板命令、项目配置 |
| [MegaDot](https://megadot.megacrit.com/) | Mega Crit 引擎发布入口 |
| [内容模板](https://github.com/Alchyr/ModTemplate-StS2/tree/master/content/ContentModTemplate) | manifest、csproj、初始化及资源基类 |
| [Adding Cards](https://github.com/Alchyr/ModTemplate-StS2/wiki/Adding-Cards) | 池、本地化、图像规范 |
| [Modding Basics](https://github.com/Alchyr/ModTemplate-StS2/wiki/Modding-Basics) | manifest、存档分离、运行时文件及兼容性 |
| [Testing and Debugging](https://github.com/Alchyr/ModTemplate-StS2/wiki/Testing-and-Debugging) | 控制台、日志、调试与联机测试入口 |
| [SimpleLoc](https://alchyr.github.io/BaseLib-Wiki/docs/localization/simplified-loc.html) | 简写启用条件与格式 |

网页示例不一定可以直接编译：核查到 CustomCardModel 页面有变量名/构造方式不一致的示例，因此技能采用“读目标版本类定义和工作工程”原则，不将网页代码直接内置为生成模板。

## 本地一手证据

根目录：`E:\JellyProject\sts2_mod_agent`。读取时 HEAD 为 `aa0f02d08a8632b8fe253e024ae567d746839847`；存在用户未提交文件，未修改参考仓库。

- `README.md`：架构、描述索引到代码的流程、领域拆分、资产核查。
- `backend/services/prompts.py`：`build_system_prompt`、`build_query_prompt`、`build_write_prompt`、可选 `build_one_by_one_prompt`、`build_namespace_audit`。
- `backend/services/rag.py`：`make_rag_query_handler`、8000 字符截断、`top_files`、缓存与 domain 规则。
- `backend/app.py`：`/api/query` 与 Agent 包装差别、`one_by_one` 默认 false。
- `backend/sts2_core/paths.py`：实际数据目录；`tools/lookup_symbol.py`：符号定位参数。
- `mods/template/STS2Custom.csproj`、`ModInitializer.cs`、`export_presets.cfg`：旧模板不含 BaseLib、固定项目名与引擎预设。
- `tools/ExportMod.cmd`：固定工程及安装路径，需要替换为当前项目配置。
- `data/settings/rules.json`：旧资产规则及重复键问题。
- `data/Models/Cards/ShrugItOff.cs`、基础 `CardModel.cs`：验证本地存在可用机制/签名证据，也存在反编译生成辅助类型。

## 后续刷新策略

任务开始优先读取目标项目的安装/锁定版本。遇到升级、签名不符、运行时异常或新模板时，再查对应 release/tag、源文件与 Wiki。记录事实来源和已验证版本；不要把当前 master 或“最新”当成所有游戏分支的兼容版本。未联网时可使用已核查资料作定位线索，但明确其版本边界。
