import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Download, FolderOpen, Upload } from "lucide-react";
import { Dialog } from "./Dialogs";
import { useWorkshop } from "../store";

export function DesktopActions() {
  const { projects, items, exportJson, mergeWorkspace, reportError, saving } =
    useWorkshop();
  const [imported, setImported] = useState(null);
  const [busy, setBusy] = useState(false);

  async function chooseImport() {
    setBusy(true);
    try {
      setImported(await invoke("import_json"));
    } catch (error) {
      reportError(`导入失败：${error}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="help-button"
        title="导入项目或工作空间"
        aria-label="导入 JSON"
        disabled={busy || saving}
        onClick={chooseImport}
      >
        <Upload size={18} />
      </button>
      <button
        className="help-button"
        title="导出整个工作空间"
        aria-label="导出工作空间"
        disabled={busy || saving}
        onClick={async () => {
          setBusy(true);
          await exportJson("SpireFactory-workspace", {
            schemaVersion: 1,
            projects,
            items,
          });
          setBusy(false);
        }}
      >
        <Download size={18} />
      </button>
      <button
        className="help-button"
        title="打开数据目录"
        aria-label="打开数据目录"
        onClick={() => invoke("open_data_directory").catch(reportError)}
      >
        <FolderOpen size={18} />
      </button>
      {imported && (
        <Dialog
          title="导入工作空间"
          onClose={() => {
            if (!saving) setImported(null);
          }}
        >
          <div className="help-content">
            <p>
              导入 {imported.projects.length} 个项目、{imported.items.length}{" "}
              个作品。相同 ID 的记录将更新，其他记录保留。原数据会自动备份。
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                disabled={saving}
                onClick={() => setImported(null)}
              >
                取消
              </button>
              <button
                className="button primary"
                disabled={saving}
                onClick={async () => {
                  if (await mergeWorkspace(imported)) setImported(null);
                }}
              >
                {saving ? "正在导入…" : "确认导入"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

export function DesktopLifecycle() {
  const { saving, notify, reportError } = useWorkshop();
  const [confirmExit, setConfirmExit] = useState(false);
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten;
    getCurrentWindow()
      .onCloseRequested((event) => {
        if (saving) {
          event.preventDefault();
          notify("正在保存，请稍后关闭窗口");
        } else if (document.querySelector('[data-unsaved="true"]')) {
          event.preventDefault();
          setConfirmExit(true);
        }
      })
      .then((cleanup) => {
        if (disposed) cleanup();
        else unlisten = cleanup;
      })
      .catch(reportError);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [saving]);

  if (!confirmExit) return null;
  return (
    <Dialog title="关闭应用？" onClose={() => setConfirmExit(false)}>
      <div className="help-content">
        <p>编辑器中有未保存的修改。关闭应用会放弃这些修改。</p>
        <div className="dialog-actions">
          <button
            className="button secondary"
            autoFocus
            onClick={() => setConfirmExit(false)}
          >
            继续编辑
          </button>
          <button
            className="button danger"
            onClick={() => getCurrentWindow().destroy().catch(reportError)}
          >
            放弃修改并关闭
          </button>
        </div>
      </div>
    </Dialog>
  );
}
