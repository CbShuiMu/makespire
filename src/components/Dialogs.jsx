import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Download,
  Heart,
  Coins,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { categories, createProposal } from "../data";
import { useWorkshop } from "../store";
import { Artwork, GameCard, Icon } from "./Art";

let openDialogCount = 0;
let originalBodyOverflow = "";

export function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const active = document.activeElement;
    dialog.showModal();
    if (openDialogCount === 0)
      originalBodyOverflow = document.body.style.overflow;
    openDialogCount += 1;
    document.body.style.overflow = "hidden";
    return () => {
      openDialogCount -= 1;
      if (openDialogCount === 0)
        document.body.style.overflow = originalBodyOverflow;
      active?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const box = e.target.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="关闭弹窗">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function ProjectDialog({ project, onClose, onCreated }) {
  const { saveProject, saving, storageError } = useWorkshop();
  const [form, setForm] = useState(
    project || {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      color: "ember",
      status: "构思中",
      tags: ["原创企划"],
    },
  );
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <Dialog
      title={project ? "编辑项目" : "新建项目"}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form
        className="project-form"
        data-unsaved={
          project
            ? JSON.stringify(form) !== JSON.stringify(project)
            : Boolean(form.name || form.description)
        }
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          if (
            saving ||
            !(await saveProject({ ...form, name: form.name.trim() }))
          )
            return;
          onClose();
          onCreated?.(form.id);
        }}
      >
        <p className="muted">项目用于集中管理角色、卡牌、遗物和药水。</p>
        <label>
          项目名称
          <input
            autoFocus
            required
            maxLength={40}
            placeholder="例如：余烬行者"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </label>
        <label>
          项目介绍
          <textarea
            rows={3}
            maxLength={300}
            placeholder="填写项目主题、核心机制和制作范围"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
        <label>
          创作状态
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option>构思中</option>
            <option>进行中</option>
            <option>已完成</option>
          </select>
        </label>
        <fieldset>
          <legend>项目主题</legend>
          <div className="theme-options">
            {[
              ["ember", "余烬"],
              ["forest", "幽林"],
              ["violet", "星夜"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`theme-option ${value} ${form.color === value ? "selected" : ""}`}
                onClick={() => update("color", value)}
                aria-pressed={form.color === value}
              >
                <span />
                {label}
                {form.color === value && <Check size={14} />}
              </button>
            ))}
          </div>
        </fieldset>
        {storageError && (
          <p className="form-error" role="alert">
            {storageError}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {project ? "保存项目" : "创建项目"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function ItemEditor({ item, onClose }) {
  const {
    projects,
    items,
    saveItem,
    deleteItem,
    notify,
    exportJson,
    saving,
    storageError,
  } = useWorkshop();
  const [form, setForm] = useState(item);
  const [prompt, setPrompt] = useState(item.brief || "");
  const [proposal, setProposal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const existing = items.some((i) => i.id === item.id);
  const dirty =
    (!existing && Boolean(form.name || form.description)) ||
    JSON.stringify(form) !== JSON.stringify(item);
  function close() {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }
  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (saving || !(await saveItem({ ...form, name: form.name.trim() })))
      return;
    onClose();
  }
  const kind = categories[form.kind];
  return (
    <Dialog
      title={`${existing ? "编辑" : "创建"}${kind.label}`}
      onClose={close}
      wide
    >
      <div className="editor-layout" inert={saving}>
        <form
          id="item-form"
          className="editor-fields"
          onSubmit={save}
          data-unsaved={dirty}
        >
          <div className="small-heading">
            <Icon name={kind.icon} size={17} />
            <h3>基础设定</h3>
          </div>
          <label>
            {kind.label}名称
            <input
              autoFocus
              required
              maxLength={24}
              value={form.name}
              placeholder={`输入${kind.label}名称`}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label>
            所属项目
            <select
              value={form.projectId}
              onChange={(e) => update("projectId", e.target.value)}
            >
              <option value="">独立作品</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {form.kind === "cards" && (
            <div className="field-pair">
              <label>
                类型
                <select
                  value={form.cardType}
                  onChange={(e) => update("cardType", e.target.value)}
                >
                  {["攻击", "技能", "能力"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                能量消耗
                <input
                  type="number"
                  min={0}
                  max={9}
                  required
                  value={form.cost}
                  onChange={(e) =>
                    update(
                      "cost",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </label>
            </div>
          )}
          {form.kind === "characters" ? (
            <div className="field-pair">
              <label>
                初始生命
                <input
                  type="number"
                  required
                  min={1}
                  max={999}
                  value={form.hp}
                  onChange={(e) =>
                    update(
                      "hp",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </label>
              <label>
                初始金币
                <input
                  type="number"
                  required
                  min={0}
                  max={9999}
                  value={form.gold}
                  onChange={(e) =>
                    update(
                      "gold",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </label>
            </div>
          ) : (
            <label>
              稀有度
              <select
                value={form.rarity}
                onChange={(e) => update("rarity", e.target.value)}
              >
                {["初始", "普通", "罕见", "稀有", "特殊"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          )}
          {form.kind === "potions" && (
            <label>
              使用目标
              <select
                value={form.target}
                onChange={(e) => update("target", e.target.value)}
              >
                {["自身", "单个敌人", "所有敌人"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            {form.kind === "characters" ? "角色机制" : "效果描述"}
            <textarea
              rows={4}
              required
              maxLength={300}
              value={form.description}
              placeholder="描述触发条件、数值与效果…"
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label>
            风味文字
            <input
              maxLength={70}
              value={form.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
              placeholder="可选：作品的背景描述"
            />
          </label>
          <div className="field-pair">
            <label>
              视觉主题
              <select
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
              >
                <option value="ember">余烬</option>
                <option value="forest">幽林</option>
                <option value="violet">星夜</option>
              </select>
            </label>
            <label>
              状态
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                <option>草稿</option>
                <option>已完成</option>
              </select>
            </label>
          </div>
          {form.kind === "cards" && (
            <label>
              插画
              <select
                value={form.art}
                onChange={(e) => update("art", e.target.value)}
              >
                <option value="sword">余烬剑刃</option>
                <option value="flame">魔法火焰</option>
                <option value="forest">月下幽林</option>
              </select>
            </label>
          )}
        </form>
        <section className="editor-preview">
          <div className="preview-label">
            <span className="status-dot" />
            实时预览
          </div>
          {form.kind === "cards" ? (
            <GameCard item={form} />
          ) : (
            <div className={`object-preview theme-${form.color}`}>
              <Artwork type={form.art} color={form.color} />
              <div className="object-preview-copy">
                <span className="rarity-label">
                  {form.kind === "characters"
                    ? "原创角色"
                    : form.rarity + kind.label}
                </span>
                <h2>{form.name || `未命名${kind.label}`}</h2>
                {form.kind === "characters" && (
                  <div className="character-stats">
                    <span>
                      <Heart size={16} />
                      {form.hp}
                    </span>
                    <span>
                      <Coins size={16} />
                      {form.gold}
                    </span>
                  </div>
                )}
                <p>{form.description || "暂无效果描述"}</p>
                <small>{form.subtitle}</small>
              </div>
            </div>
          )}
          <span className="preview-note">预览随属性修改同步更新</span>
        </section>
        <aside className="editor-agent">
          <div className="agent-heading">
            <span className="agent-symbol">
              <Sparkles size={19} />
            </span>
            <div>
              <h3>制作 Agent</h3>
              <small>设定草案</small>
            </div>
            <span className="demo-tag">演示</span>
          </div>
          <div className="agent-message">
            <p>
              输入制作需求，使用本地模板生成草案。应用后可继续修改属性与效果。
            </p>
          </div>
          <div className="agent-hint">
            <Sparkles size={15} />
            <p>当前提供余烬与自然两组示例模板。</p>
          </div>
          {proposal && (
            <div className="proposal">
              <span>
                <Check size={14} />
                示例草案已准备好
              </span>
              <h4>{proposal.name}</h4>
              <p>{proposal.description}</p>
              <button
                className="button secondary"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    ...proposal,
                    id: prev.id,
                    projectId: prev.projectId,
                    status: prev.status,
                  }));
                  setProposal(null);
                  notify("草案已应用，可继续编辑后保存");
                }}
              >
                应用到编辑器
              </button>
            </div>
          )}
          <form
            className="agent-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim())
                setProposal(createProposal(prompt, form.kind, form.projectId));
            }}
          >
            <textarea
              aria-label="Agent 制作需求"
              placeholder="例如：设计一张围绕余烬的攻击牌…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <div>
              <span>本地模板演示</span>
              <button
                className="send-button"
                disabled={!prompt.trim()}
                aria-label="生成示例草案"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </form>
          <p className="demo-explanation">
            当前使用预设模板，尚未连接 AI 服务。
          </p>
        </aside>
      </div>
      <div className="editor-footer">
        {storageError && (
          <p className="form-error" role="alert">
            {storageError}
          </p>
        )}
        <div>
          {existing && (
            <button
              className="button danger-quiet"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} />
              删除
            </button>
          )}
          <button
            className="button text-button"
            onClick={() => {
              exportJson(form.name || "未命名作品", form);
            }}
          >
            <Download size={16} />
            导出设定
          </button>
        </div>
        <div>
          <button className="button secondary" onClick={close}>
            取消
          </button>
          <button
            type="submit"
            form="item-form"
            className="button primary"
            disabled={saving}
          >
            <Save size={16} />
            保存{kind.label}
          </button>
        </div>
      </div>
      {(confirmDelete || confirmDiscard) && (
        <Dialog
          title={confirmDelete ? "删除这个作品？" : "放弃未保存的修改？"}
          onClose={() => {
            setConfirmDelete(false);
            setConfirmDiscard(false);
          }}
        >
          <div className="help-content">
            <p>
              {confirmDelete
                ? "删除后无法恢复，建议先导出设定。"
                : "本次编辑的内容还没有保存。"}
            </p>
            <div className="dialog-actions">
              <button
                autoFocus
                className="button secondary"
                onClick={() => {
                  setConfirmDelete(false);
                  setConfirmDiscard(false);
                }}
              >
                继续编辑
              </button>
              <button
                className="button danger"
                disabled={saving}
                onClick={async () => {
                  if (confirmDelete && !(await deleteItem(item.id))) return;
                  onClose();
                }}
              >
                {confirmDelete ? "确认删除" : "放弃修改"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
}
