import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUp, Clock3, FolderOpen, Plus, Sparkles } from "lucide-react";
import { categories, createProposal, newItem, relativeDate } from "../data";
import { useWorkshop } from "../store";
import { Artwork, Icon } from "../components/Art";
import { ProjectCard } from "./Projects";
import "./Home.css";

const examples = {
  characters: ["以消耗卡牌积累余烬的角色", "施加中毒时获得格挡的角色"],
  cards: ["造成伤害并获得余烬的攻击牌", "施加中毒并获得格挡的技能牌"],
  relics: ["战斗开始时获得余烬的遗物", "施加中毒时回复生命的遗物"],
  potions: ["获得余烬并造成伤害的药水", "回复生命并移除虚弱的药水"],
};

export default function Home({ onNewProject, onEdit }) {
  const { projects, items } = useWorkshop();
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState("cards");
  const [projectId, setProjectId] = useState("");
  const promptRef = useRef(null);
  const recentItems = [...items].sort((a, b) => new Date(b.updated) - new Date(a.updated)).slice(0, 4);
  const recentProjects = [...projects].sort((a, b) => new Date(b.updated) - new Date(a.updated)).slice(0, 3);

  function submit(e) {
    e.preventDefault();
    if (prompt.trim()) onEdit(createProposal(prompt.trim(), kind, projectId));
  }

  return (
    <div className="workbench">
      <header className="workbench-heading">
        <div>
          <h1>工作台</h1>
          <p>杀戮尖塔 2 <span>/</span> {projects.length} 个项目 <span>/</span> {items.length} 个作品</p>
        </div>
        <button className="button primary" onClick={onNewProject}>
          <Plus size={17} />新建项目
        </button>
      </header>
      <section className="workspace-categories" aria-label="作品分类">
        {Object.entries(categories).map(([key, cat]) => (
          <Link key={key} to={`/${key}`} className={`workspace-category ${cat.color}`}>
            <span className="entry-icon"><Icon name={cat.icon} size={24} /></span>
            <div><h2>{cat.label}</h2><p>{cat.fields}</p></div>
            <span className="category-count">{items.filter((item) => item.kind === key).length}</span>
            <ArrowRight size={16} className="category-arrow" />
          </Link>
        ))}
      </section>
      <div className="workspace-main">
        <section className="workspace-agent" aria-labelledby="agent-title">
          <div className="workspace-section-title">
            <div><Sparkles size={20} /><h2 id="agent-title">制作 Agent</h2></div>
            <span className="template-status">本地模板演示</span>
          </div>
          <form onSubmit={submit} className="workspace-composer">
            <div className="workspace-kind" aria-label="草案类型">
              {Object.entries(categories).map(([key, cat]) => (
                <button type="button" key={key} className={kind === key ? "selected" : ""}
                  aria-pressed={kind === key} onClick={() => setKind(key)}>
                  <Icon name={cat.icon} size={16} />{cat.label}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="creation-brief">制作需求</label>
            <textarea id="creation-brief" ref={promptRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder={`描述${categories[kind].label}的主题、触发条件与效果数值…`} rows={4} maxLength={1000}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form.requestSubmit();
                }
              }} />
            <div className="workspace-composer-footer">
              <label className="workspace-project-select">
                <FolderOpen size={16} /><span className="sr-only">草案所属项目</span>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">独立作品</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <div className="workspace-submit">
                <span>{prompt.length} / 1000</span>
                <button className="button primary" type="submit" disabled={!prompt.trim()}>
                  生成示例草案<ArrowUp size={17} />
                </button>
              </div>
            </div>
          </form>
          <div className="workspace-examples">
            <span>示例需求</span>
            {examples[kind].map((example) => (
              <button key={example} onClick={() => { setPrompt(example); promptRef.current?.focus(); }}>
                {example}<Plus size={12} />
              </button>
            ))}
          </div>
          <div className="workspace-agent-note">
            <p>使用预设模板生成可编辑草案，尚未连接 AI 服务。</p>
            <button onClick={() => onEdit(newItem(kind, projectId))}>手动创建{categories[kind].label}<ArrowRight size={14} /></button>
          </div>
        </section>
        <section className="workspace-recents" aria-labelledby="recent-items-title">
          <div className="workspace-section-title">
            <div><Clock3 size={18} /><h2 id="recent-items-title">最近编辑</h2></div>
            <span>{recentItems.length} 个作品</span>
          </div>
          <div className="recent-item-list">
            {recentItems.map((item) => (
              <button className="recent-item-row" key={item.id} onClick={() => onEdit(item)}>
                <span className="recent-item-art"><Artwork type={item.art} color={item.color} /></span>
                <span className="recent-item-copy"><strong>{item.name}</strong>
                  <small>{categories[item.kind].label} <span>/</span> {relativeDate(item.updated)}</small>
                </span>
                <span className={`recent-item-status ${item.status === "已完成" ? "complete" : ""}`}>{item.status}</span>
                <ArrowRight size={14} />
              </button>
            ))}
            {!recentItems.length && <p className="workspace-empty">暂无作品。选择类型创建，保存后会显示在这里。</p>}
          </div>
        </section>
      </div>
      <section className="workspace-projects" aria-labelledby="recent-projects-title">
        <div className="workspace-section-title">
          <div><FolderOpen size={20} /><h2 id="recent-projects-title">最近项目</h2></div>
          <Link to="/projects" className="inline-link">全部项目<ArrowRight size={15} /></Link>
        </div>
        <div className="workspace-project-grid">
          {recentProjects.map((project) => <ProjectCard project={project} key={project.id} compact />)}
          {recentProjects.length < 3 && (
            <button className="new-project-tile" onClick={onNewProject}>
              <span><Plus size={22} /></span><h3>新建项目</h3><p>集中管理角色、卡牌、遗物和药水</p>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
