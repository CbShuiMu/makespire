import { useState } from "react";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { categories, newItem } from "../data";
import { useWorkshop } from "../store";
import { Artwork, GameCard, Icon } from "../components/Art";

export function ItemTile({ item, onEdit, list = false }) {
  const { projects } = useWorkshop();
  const project = projects.find((p) => p.id === item.projectId);
  return (
    <button
      className={`item-tile ${list ? "list-item" : ""}`}
      onClick={() => onEdit(item)}
      aria-label={`编辑${categories[item.kind].label}：${item.name}`}
    >
      <div className={`item-art theme-${item.color}`}>
        {item.kind === "cards" ? (
          <GameCard item={item} />
        ) : (
          <Artwork type={item.art} color={item.color} />
        )}
        {!list && (
          <span
            className={`item-status ${item.status === "已完成" ? "complete" : ""}`}
          >
            {item.status}
          </span>
        )}
      </div>
      <div className="item-tile-body">
        <div className="item-title">
          <h3>{item.name}</h3>
          <span>
            {item.kind === "cards"
              ? item.cardType
              : categories[item.kind].label}
          </span>
        </div>
        <p>{item.description}</p>
        <div className="item-meta">
          <span>{project?.name || "独立作品"}</span>
          <span>{item.rarity}</span>
        </div>
      </div>
    </button>
  );
}

export default function Collection({ kind, onEdit }) {
  const { items, projects } = useWorkshop();
  const cat = categories[kind];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("全部作品");
  const [project, setProject] = useState("all");
  const [layout, setLayout] = useState("grid");
  const collection = items.filter((i) => i.kind === kind);
  const shown = collection.filter(
    (i) =>
      `${i.name}${i.description}`.toLowerCase().includes(query.toLowerCase()) &&
      (status === "全部作品" || i.status === status) &&
      (project === "all" || i.projectId === project),
  );
  return (
    <div className="listing-page">
      <header className="page-heading">
        <div>
          <h1>{cat.title}</h1>
          <p>{cat.description}</p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            onEdit(newItem(kind, project === "all" ? "" : project))
          }
        >
          <Plus size={17} />
          创建{cat.label}
        </button>
      </header>
      <div className="collection-overview">
        <span>
          <strong>{collection.length}</strong> 个{cat.label}
        </span>
        <span>
          <strong>
            {collection.filter((i) => i.status === "草稿").length}
          </strong>{" "}
          个草稿
        </span>
        <p>点击作品查看或编辑设定。</p>
      </div>
      <div className="collection-toolbar">
        <div className="filter-tabs">
          {["全部作品", "草稿", "已完成"].map((value) => (
            <button
              key={value}
              className={status === value ? "active" : ""}
              onClick={() => setStatus(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="toolbar-controls">
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label={`搜索${cat.label}`}
              placeholder={`搜索${cat.label}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="筛选所属项目"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="all">全部项目</option>
            <option value="">独立作品</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="view-toggle">
            <button
              className={layout === "grid" ? "active" : ""}
              onClick={() => setLayout("grid")}
              aria-label="网格视图"
              aria-pressed={layout === "grid"}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              className={layout === "list" ? "active" : ""}
              onClick={() => setLayout("list")}
              aria-label="列表视图"
              aria-pressed={layout === "list"}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
      <h2 className="sr-only">{cat.label}作品列表</h2>
      {shown.length ? (
        <div className={layout === "grid" ? "item-grid" : "item-list"}>
          {shown.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              onEdit={onEdit}
              list={layout === "list"}
            />
          ))}
          {layout === "grid" && (
            <button
              className="new-project-tile item-new"
              onClick={() =>
                onEdit(newItem(kind, project === "all" ? "" : project))
              }
            >
              <span>
                <Plus size={24} />
              </span>
              <h3>创建{cat.label}</h3>
              <p>{cat.fields}</p>
            </button>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name={cat.icon} size={32} />
          <h3>
            {collection.length
              ? "没有找到匹配的作品"
              : `暂无${cat.label}`}
          </h3>
          <p>
            {collection.length
              ? "试试其他关键词或项目筛选。"
              : `点击创建${cat.label}，填写属性和效果。`}
          </p>
          <button
            className="button secondary"
            onClick={() => {
              if (collection.length) {
                setQuery("");
                setStatus("全部作品");
                setProject("all");
              } else onEdit(newItem(kind));
            }}
          >
            {collection.length ? "清除筛选" : `创建${cat.label}`}
          </button>
        </div>
      )}
      <div className="collection-footnote">
        共 {shown.length} 个作品<span>本地创作空间</span>
      </div>
    </div>
  );
}
