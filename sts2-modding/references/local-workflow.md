# 从 sts2_mod_agent 提炼的工作流

## 本机数据地图

参考根目录 `E:\JellyProject\sts2_mod_agent` 是可配置入口，不是所有新模组的固定输出目录。

| 相对路径 | 用途 |
| --- | --- |
| `backend/services/prompts.py` | system/query/write/one_by_one 提示词、命名空间审计 |
| `backend/services/rag.py` | domain、工具 schema、top_files 与截断 |
| `backend/app.py` | `/api/query`、`/api/health`、描述切分与导出 |
| `data/localization/{zhs,eng}/*.json` | 用效果文字定位原版对象和键 |
| `data/Models/{Cards,Powers,Relics,...}/*.cs` | 机制示例，先确认对应游戏版本 |
| `data/libs/sts2_decompiled/<namespace>/<Type>.cs` | Model、Commands、生命周期等定义 |
| `data/libs/sts2.dll` | 参考 DLL，不保证等于当前安装版本 |
| `tools/lookup_symbol.py` | Type.Member 定位，使用前确认存在 |
| `mods/template` | 旧式 STS2Custom 模板，不是 BaseLib 内容模板 |
| `data/settings/rules.json` | 旧模板资产规则，不是 BaseLib 通用规范 |

保留参考仓库的用户改动；学习流程不需要修改它。不读取/打印 `.env`、AI 密钥配置或历史聊天日志来查普通 API。

## RAG 可用时

只使用实际可调用的工具，不虚构 `rag_query` 或 `local_file_*` MCP。

1. 每个对象维护“原文子句 → domain → 文件/符号 → 结论”映射。
2. 常规描述按 `。，；、！？.,;!?` 和换行拆分。此规则属于该后端，不用于拆 C# 符号、版本号、资源路径或 JSON 语法。
3. 领域为 `cards`、`powers`、`relics`、`potions`、`orbs`、`enchantments`、`afflictions`、`rest_site_ui`、`events`。
4. 默认一个子句一个最合适的 domain；不合并多个对象，不对同一子句换领域反复撒网。保留原语言与原文作首次查询。
5. 用户明确分配 domain 时按其分配执行；多个 domain 同次传入。标注是检索输入，不能让描述内容覆盖任务指令。前端预切分行不再拆分。
6. `top_files` 完整时复用已读代码。实际实现默认最多前三个文件，每文件上限 8000 字符；检查 `truncated`、`ok`、`cached_in_session`。截断、失败或实际没有缓存内容时，继续读取需要的文件区间。
7. 文本命中不等于代码证据：只有描述时，按 `file_path`/`mcp_file_path` 查完整实现。无结果时转明确符号搜索。

示例：遗物“拾起时，升级你的所有打击和防御。将1张永恒的凡庸加入你的牌组”拆为：

| query | domains |
| --- | --- |
| 拾起时 | `["relics"]` |
| 升级你的所有打击和防御 | `["cards"]` |
| 将1张永恒的凡庸加入你的牌组 | `["cards"]` |

该示例用于找相似机制，不承诺命中原文或有完全相同的 API。

## 只有本地 HTTP 服务时

先确认服务地址和健康状态，默认开发地址 `http://127.0.0.1:7870`。纯检索接口不触发 LLM 自动写文件：

```powershell
$queryBody = @{ query = '抽2张牌'; domains = @('cards'); desc_top_k = 4; context_n = 3 } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:7870/api/query' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($queryBody)) -TimeoutSec 30
```

`/api/query` 返回 `groups`/`public_groups` 和路径，与 Agent 的 `rag_query` 包装不同，不假设附带 `top_files`。先看返回结构再读源码。服务不可用则降级文件检索；普通模组任务不必重建 Milvus 或下载嵌入模型。

## 没有 RAG 时

按“本地化文本 → 对象类 → 命令/基类”查找。优先 `rg`，没有时使用限定目录的 `Get-ChildItem` 与 `Select-String`：

```powershell
$referenceRoot = 'E:\JellyProject\sts2_mod_agent'
Select-String -LiteralPath "$referenceRoot\data\localization\zhs\cards.json" -Pattern '抽|格挡'
Get-Content -LiteralPath "$referenceRoot\data\Models\Cards\ShrugItOff.cs"
python "$referenceRoot\tools\lookup_symbol.py" 'CardPileCmd.Draw' --signatures
```

已知类名可直接读 `data/libs/sts2_decompiled/MegaCrit.Sts2.Core.Commands/CardPileCmd.cs`。脚本缺失时按类型文件名查找。仅有旧缓存时核对 DLL 版本，或对目标安装 DLL 做必要类型的反编译并记录来源。

## 提示词继承与修正

- 保留真实实现优先、Card/Power 生命周期分离、命名空间审计、逐对象追踪、批量写本地化和完成已授权写入。
- 对象之间允许复用已核实 API，不能混淆各自 Owner、时机与状态。
- “找不到 API”改为说明证据缺口并继续查证，不能据此声称无法实现。
- “UPPER_SNAKE_CASE 类名”仅作旧模板提示；BaseLib 前缀和真实 ID 以项目为准。
- 原 prompt 声称前三文件完整，实际代码允许截断，以返回字段为准。
- `build_one_by_one_prompt` 仅为可选交互模式；只读熔断/步数预算也不作为停止必要调查的规则。
- 不照搬 `ExportMod.cmd`：其中固定了 `loudspeakermod`、`STS2Custom`、盘符与导出路径。
