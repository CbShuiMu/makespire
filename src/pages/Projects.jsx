import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { categories, newItem, relativeDate } from "../data";
import { useWorkshop } from "../store";
import { Artwork, Icon } from "../components/Art";
import { ItemTile } from "./Collection";

export function ProjectCard({ project, compact = false }) {
  const { items } = useWorkshop();
  const count = items.filter((i) => i.projectId === project.id).length;
  return (
    <Link
      to={`/projects/${project.id}`}
      className={`project-card ${compact ? "compact" : ""}`}
    >
      <div className={`project-cover ${project.color}`}>
        <Artwork
          type={project.color === "forest" ? "forest" : "character"}
          color={project.color}
        />
        <span
          className={`status-badge ${project.status === "已完成" ? "complete" : ""}`}
        >
          <span />
          {project.status}
        </span>
        <ArrowUpRight className="project-arrow" size={19} />
      </div>
      <div className="project-card-body">
        <div className="project-title-row">
          <h3>{project.name}</h3>
          {compact && <span>{count} 个作品</span>}
        </div>
        <p>{project.description || "暂无项目介绍"}</p>
        {!compact && (
          <div className="project-tags">
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        <div className="project-meta">
          <span>
            <Icon name="project" size={14} />
            {compact
              ? `${relativeDate(project.updated)}编辑`
              : `${count} 个作品`}
          </span>
          <span>
            {compact ? "打开项目" : `${relativeDate(project.updated)}更新`}
            <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Projects({ onNewProject }) {
  const { projects, items } = useWorkshop();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部项目");
  const shown = projects.filter(
    (p) =>
      `${p.name}${p.description}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "全部项目" || p.status === filter),
  );
  return (
    <div className="listing-page">
      <header className="page-heading">
        <div>
          <h1>项目</h1>
          <p>按项目管理角色、卡牌、遗物和药水。</p>
        </div>
        <button className="button primary" onClick={onNewProject}>
          <Plus size={17} />
          新建项目
        </button>
      </header>
      <div className="collection-overview">
        <span>
          <strong>{projects.length}</strong> 个项目
        </span>
        <span>
          <strong>{items.length}</strong> 个作品
        </span>
        <p>项目保存在本地工作空间。</p>
      </div>
      <div className="collection-toolbar">
        <div className="filter-tabs">
          {["全部项目", "构思中", "进行中", "已完成"].map((status) => (
            <button
              key={status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="搜索项目"
            placeholder="搜索项目…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <h2 className="sr-only">项目列表</h2>
      <div className="projects-grid">
        {shown.map((project) => (
          <ProjectCard project={project} key={project.id} />
        ))}
        {!query && filter === "全部项目" && (
          <button className="new-project-tile large" onClick={onNewProject}>
            <span>
              <Plus size={25} />
            </span>
            <h3>新建项目</h3>
            <p>设置名称、介绍和项目状态</p>
          </button>
        )}
      </div>
      {shown.length === 0 && (query || filter !== "全部项目") && (
        <div className="empty-state">
          <Search size={30} />
          <h3>没有找到匹配的项目</h3>
          <p>修改关键词或清除筛选。</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setFilter("全部项目");
            }}
          >
            清除筛选
          </button>
        </div>
      )}
    </div>
  );
}

export function ProjectDetail({ onEdit, onEditProject }) {
  const { id } = useParams();
  const { projects, items, exportJson } = useWorkshop();
  const [kind, setKind] = useState("all");
  const project = projects.find((p) => p.id === id);
  if (!project)
    return (
      <div className="empty-state">
        <h1>项目不存在</h1>
        <Link to="/projects" className="button primary">
          返回项目
        </Link>
      </div>
    );
  const projectItems = items.filter((i) => i.projectId === id);
  const visible = projectItems.filter((i) => kind === "all" || i.kind === kind);
  return (
    <div className="listing-page">
      <Link className="back-link" to="/projects">
        <ArrowLeft size={15} />
        返回项目
      </Link>
      <header className="page-heading">
        <div>
          <span className="page-kicker">
            {project.status} · {projectItems.length} 个作品
          </span>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            onClick={() => onEditProject(project)}
          >
            <Pencil size={16} />
            编辑项目
          </button>
          <button
            className="button primary"
            onClick={() => {
              exportJson(project.name, {
                schemaVersion: 1,
                project,
                items: projectItems,
              });
            }}
          >
            <Download size={16} />
            导出项目
          </button>
        </div>
      </header>
      <div className="project-create-row">
        {Object.entries(categories).map(([key, cat]) => (
          <button key={key} onClick={() => onEdit(newItem(key, id))}>
            <Icon name={cat.icon} />
            <span>创建{cat.label}</span>
            <Plus size={16} />
          </button>
        ))}
      </div>
      <div className="collection-toolbar">
        <div className="filter-tabs">
          <button
            className={kind === "all" ? "active" : ""}
            onClick={() => setKind("all")}
          >
            全部作品
          </button>
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              className={kind === key ? "active" : ""}
              onClick={() => setKind(key)}
            >
              {cat.label}{" "}
              <span>{projectItems.filter((i) => i.kind === key).length}</span>
            </button>
          ))}
        </div>
      </div>
      <h2 className="sr-only">项目作品</h2>
      {visible.length ? (
        <div className="item-grid">
          {visible.map((item) => (
            <ItemTile item={item} key={item.id} onEdit={onEdit} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="sparkles" size={30} />
          <h3>暂无作品</h3>
          <p>选择上方的类型创建作品。</p>
        </div>
      )}
    </div>
  );
}
