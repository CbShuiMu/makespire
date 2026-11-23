import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { CheckCircle2, CircleHelp, Menu, X } from "lucide-react";
import Home from "./pages/Home";
import Projects, { ProjectDetail } from "./pages/Projects";
import Collection from "./pages/Collection";
import { Dialog, ItemEditor, ProjectDialog } from "./components/Dialogs";
import { categories } from "./data";
import { useWorkshop } from "./store";
import { DesktopActions, DesktopLifecycle } from "./components/Desktop";

export default function App() {
  const [editor, setEditor] = useState(null);
  const [projectDialog, setProjectDialog] = useState(null);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const { toast, storageError, ready, saving, storagePath, retryLoad } =
    useWorkshop();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
    const page =
      categories[location.pathname.split("/")[1]]?.label ||
      (location.pathname.startsWith("/projects") ? "项目" : "首页");
    document.title = `${page} · Spire Factory 尖塔工坊`;
  }, [location.pathname]);
  if (!ready) {
    return (
      <div className="desktop-loading" role={storageError ? "alert" : "status"}>
        <img src="/favicon.svg" alt="" />
        <h1>Spire Factory</h1>
        <p>{storageError || "正在读取本地工作空间…"}</p>
        {storageError && (
          <button className="button primary" onClick={retryLoad}>
            重新读取
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="app-shell">
      <button
        onClick={() => document.getElementById("main-content")?.focus()}
        className="skip-link"
      >
        跳转到主内容
      </button>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Spire Factory 首页">
          <img src="/favicon.svg" alt="" />
          <div>
            <strong>Spire Factory</strong>
            <span>尖塔工坊</span>
          </div>
        </Link>
        <nav className={`navbar ${menu ? "open" : ""}`} aria-label="主导航">
          <NavLink end to="/">
            首页
          </NavLink>
          <NavLink to="/projects">项目</NavLink>
          {Object.entries(categories).map(([key, cat]) => (
            <NavLink key={key} to={`/${key}`}>
              {cat.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="local-indicator" title={storagePath}>
            <span />
            {saving ? "正在保存…" : "本地文件"}
          </span>
          <DesktopActions />
          <button
            className="help-button"
            onClick={() => setHelp(true)}
            aria-label="使用指南"
          >
            <CircleHelp size={19} />
          </button>
          <button
            className="menu-button icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "关闭导航" : "展开导航"}
            aria-expanded={menu}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <main id="main-content" className="main-panel" tabIndex={-1}>
        {storageError && (
          <div className="storage-warning" role="alert">
            {storageError}
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <Home
                onNewProject={() => setProjectDialog({})}
                onEdit={setEditor}
              />
            }
          />
          <Route
            path="/projects"
            element={<Projects onNewProject={() => setProjectDialog({})} />}
          />
          <Route
            path="/projects/:id"
            element={
              <ProjectDetail
                onEdit={setEditor}
                onEditProject={(p) => setProjectDialog({ project: p })}
              />
            }
          />
          {Object.keys(categories).map((key) => (
            <Route
              key={key}
              path={`/${key}`}
              element={<Collection key={key} kind={key} onEdit={setEditor} />}
            />
          ))}
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>页面不存在</h1>
                <p>请检查地址，或返回首页。</p>
                <Link className="button primary" to="/">
                  返回首页
                </Link>
              </div>
            }
          />
        </Routes>
        <footer className="site-footer">
          <span>
            <img src="/favicon.svg" alt="" />
            Spire Factory <span className="footer-divider">/</span> 尖塔工坊
          </span>
          <p>杀戮尖塔 2 · 非官方制作工具</p>
          <span className="footer-version">v0.2 桌面版</span>
        </footer>
      </main>
      {editor && (
        <ItemEditor
          key={editor.id}
          item={editor}
          onClose={() => setEditor(null)}
        />
      )}
      {projectDialog && (
        <ProjectDialog
          project={projectDialog.project}
          onClose={() => setProjectDialog(null)}
          onCreated={
            projectDialog.project
              ? undefined
              : (id) => navigate(`/projects/${id}`)
          }
        />
      )}
      {help && (
        <Dialog title="使用指南" onClose={() => setHelp(false)}>
          <div className="help-content">
            <p>管理《杀戮尖塔 2》的角色、卡牌、遗物与药水设定。</p>
            <ol>
              <li>
                <strong>建立项目</strong>
                <p>用项目收纳同一个主题下的角色、卡牌、遗物与药水。</p>
              </li>
              <li>
                <strong>编辑作品</strong>
                <p>选择创作类型，编辑效果和数值，实时查看预览。</p>
              </li>
              <li>
                <strong>保存与导出</strong>
                <p>保存到本地工作空间，或通过系统文件对话框导出 JSON。</p>
              </li>
            </ol>
            <div className="help-note">
              制作 Agent 使用本地预设模板，尚未连接
              AI；导出的是设定数据，不能直接作为游戏 Mod
              安装。示例内容为原创演示设定。
            </div>
            <p className="storage-path">数据文件：{storagePath}</p>
            <button className="button primary" onClick={() => setHelp(false)}>
              关闭指南
            </button>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      <DesktopLifecycle />
    </div>
  );
}
