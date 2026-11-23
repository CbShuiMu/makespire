# BaseLib 工程与内容实现

核查日：2026-11-11。名称用于定位，不代替目标版本源码。

## 工程选择与依赖

新建前查 `dotnet new list`；尚未安装时使用维护者的模板包，并查看帮助：

```powershell
dotnet new install Alchyr.Sts2.Templates
dotnet new alchyrsts2contentmod --help
```

| 需求 | 已核查短名 |
| --- | --- |
| 卡牌、遗物等内容 | `alchyrsts2contentmod` |
| 新角色及配套池/场景 | `alchyrsts2charmod` |
| 空白逻辑/补丁工程 | `alchyrsts2mod` |

按名称/作者和实际帮助生成到目标目录，已有工程增量修改。例：`dotnet new alchyrsts2contentmod --ModAuthor YourName -o EmberMod`。模板项目名避免空格和下划线，显示名另设。Godot 使用 `.sln`，注意 solution 与 project 位置。

当前 Setup 首选 MegaDot，回退引擎须匹配版本。当前模板为 `Godot.NET.Sdk/4.5.1`、`net9.0`，这只是快照，不作为以后强制升级/降级的规则。.NET SDK 还须满足工程语言版本，不只看目标框架。

NuGet 包为 `Alchyr.Sts2.BaseLib`，分析器为 `Alchyr.Sts2.ModAnalyzers`。模板使用浮动版本 `*`，交付应记录实际解析版本；需要可复现构建时锁定已验证版本。编译依赖和运行时安装分开核对：游戏仍须加载相应 BaseLib 模组及资源。当前 manifest 使用 `dependencies` 内的 `{ "id": "BaseLib", "min_version": "…" }`，具体格式服从目标游戏版本。

旧 `mods/template` 只引用游戏/Harmony DLL，没有 BaseLib，也可能缺 manifest。迁移不能只添加 PackageReference，须核对注册、ID、本地化入口与资源布局。

来源：[Setup](https://github.com/Alchyr/ModTemplate-StS2/wiki/Setup)、[内容工程](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentMod.csproj)。

## 模型与注册

| 内容 | 首选检查位置 | 核查重点 |
| --- | --- | --- |
| Card | 工程 `<ModName>Card` → `BaseLib.Abstracts.CustomCardModel` | cost/type/rarity/target、CanonicalVars、OnPlay、OnUpgrade、pool |
| Power | 工程 `<ModName>Power` → `CustomPowerModel` | Type、StackType、Owner/来源、触发过滤、层数及清理 |
| Relic | 工程 `<ModName>Relic` → `CustomRelicModel` | 稀有度、池、获取/战斗/回合触发、持久状态 |
| Character | 角色模板与 `CustomCharacterModel` 文档 | 起始牌组/遗物、池、选择界面、视觉与本地化 |
| Potion / Orb / Event / Ancient 等 | 对应原版 Model 与当前 BaseLib Abstracts | 真实基类、生命周期、注册和资源；不臆造统一 Register API |

BaseLib 卡牌和遗物使用 `[Pool(typeof(...))]` 确定池；标注可从基类继承，先查已有基类以免重复。自动加入 BaseLib 内容集合不等于可省略池归属。工程沿用 `ModHelper.AddModelToPool` 时先核查，不把两套注册盲目叠加。

`CustomCardModel` 与 `ConstructedCardModel` 是不同方式；`WithDamage` 等构造方法不能随意用在普通 `CustomCardModel` 上。维持工程风格，从同版本类定义确认方法所属类型。

入口使用游戏 `ModInitializer` 特性，保留模板入口和唯一 Harmony ID。场景实际引用模组 C# 脚本时，再核对 Godot 脚本发现配置。命名空间不必一概等于 manifest id；需要一致的是加载器标识、产物名与工程资源约定。

来源：[CustomCardModel](https://alchyr.github.io/BaseLib-Wiki/docs/models/custom-card.html)、[CustomRelicModel](https://alchyr.github.io/BaseLib-Wiki/docs/models/custom-relic.html)、[初始化入口](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentModCode/MainFile.cs)。

## 本地化与资源

优先用分析器或真实 ID 推导键，保留模组前缀、大小写及 `.title`、`.description` 等实际后缀。部分模型需要额外描述或升级文本，不限定为两个字段。按任务维护 `eng`/`zhs` 等语言，不覆盖无关条目。

当前内容模板资源位于 `<ModId>/`，代码位于 `<ModId>Code/`；扩展方法和基类决定加载路径，与旧工程根级 `localization/`、`images/packed/` 不同。

| 资源 | 当前模板的路径习惯（相对工程根） |
| --- | --- |
| 本地化 | `<ModId>/localization/{eng,zhs}/{cards,powers,relics,...}.json` |
| 卡牌大图 | `<ModId>/images/card_portraits/big/<entry_without_prefix>.png` |
| 卡牌缩略图/测试图 | `<ModId>/images/card_portraits/` 和 `beta/` 子目录 |
| Power 图 | `<ModId>/images/powers/` 及 `big/` |
| 遗物图 | `<ModId>/images/relics/`、`big/`，轮廓通常为 `*_outline.png` |

当前基类使用 `Id.Entry.RemovePrefix().ToLowerInvariant()` 等生成文件名，先查真实 ID，不另造 snake_case 规则。常规卡图建议 1000×760，较小同宽高比可缩放；全图卡为 606×852，具体服从目标工程。

动态变量名称须在代码和描述中对应，例如 SmartFormat 的 `{Damage:diff()}`。BaseLib SimpleLoc 需要显式启用条目（如 `#` 前缀）；未确认启用时不写 `!D!` 简写。

检查 JSON 语法、重复键、语言条目、占位符、资源文件、导出规则和 `res://` 大小写。旧 `rules.json` 的遗物规则有重复 `file_path2`，普通解析会覆盖前值，因此只能作线索，不能作为完整验收依据。

来源：[添加卡牌](https://github.com/Alchyr/ModTemplate-StS2/wiki/Adding-Cards)、[卡牌基类](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentModCode/Cards/ContentModCard.cs)、[Power 基类](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentModCode/Powers/ContentModPower.cs)、[遗物基类](https://github.com/Alchyr/ModTemplate-StS2/blob/master/content/ContentModTemplate/ContentModCode/Relics/ContentModRelic.cs)、[SimpleLoc](https://alchyr.github.io/BaseLib-Wiki/docs/localization/simplified-loc.html)。
