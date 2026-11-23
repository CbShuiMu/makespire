import { useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { seedItems, seedProjects } from "./data";
import { WorkshopContext } from "./context";
export { useWorkshop } from "./context";

export function WorkshopProvider({ children }) {
  const [data, setData] = useState(null);
  const [storagePath, setStoragePath] = useState("");
  const [storageError, setStorageError] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const current = useRef(null);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStorageError("");
      try {
        if (!isTauri())
          throw new Error("请从 Spire Factory 桌面应用打开工作空间。");
        const loaded = await invoke("load_workspace");
        if (cancelled) return;
        const workspace = loaded.data || {
          schemaVersion: 1,
          projects: seedProjects,
          items: seedItems,
        };
        if (!loaded.data) await invoke("save_workspace", { data: workspace });
        if (cancelled) return;
        current.current = workspace;
        setData(workspace);
        setStoragePath(loaded.storagePath);
      } catch (error) {
        if (!cancelled) setStorageError(String(error));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function commit(update, message) {
    pending.current += 1;
    setSaving(true);
    // Apply each update to the last successfully persisted state.
    const operation = queue.current.then(async () => {
      try {
        const next = update(current.current);
        await invoke("save_workspace", { data: next });
        current.current = next;
        setData(next);
        setStorageError("");
        setToast(message);
        return true;
      } catch (error) {
        setStorageError(String(error));
        return false;
      } finally {
        pending.current -= 1;
        setSaving(pending.current > 0);
      }
    });
    queue.current = operation;
    return operation;
  }

  function saveItem(item) {
    const updated = new Date().toISOString();
    return commit(
      (previous) => ({
        ...previous,
        projects: previous.projects.map((project) =>
          project.id === item.projectId ? { ...project, updated } : project,
        ),
        items: previous.items.some((entry) => entry.id === item.id)
          ? previous.items.map((entry) =>
              entry.id === item.id ? { ...item, updated } : entry,
            )
          : [{ ...item, updated }, ...previous.items],
      }),
      `「${item.name}」已保存到本地`,
    );
  }

  function saveProject(project) {
    const updated = new Date().toISOString();
    return commit(
      (previous) => ({
        ...previous,
        projects: previous.projects.some((entry) => entry.id === project.id)
          ? previous.projects.map((entry) =>
              entry.id === project.id ? { ...project, updated } : entry,
            )
          : [{ ...project, updated }, ...previous.projects],
      }),
      `项目「${project.name}」已保存到本地`,
    );
  }

  function deleteItem(id) {
    return commit(
      (previous) => ({
        ...previous,
        items: previous.items.filter((item) => item.id !== id),
      }),
      "作品已删除",
    );
  }

  function mergeWorkspace(imported) {
    const merge = (existing, incoming) => [
      ...new Map(
        [...existing, ...incoming].map((entry) => [entry.id, entry]),
      ).values(),
    ];
    return commit(
      (previous) => ({
        ...previous,
        projects: merge(previous.projects, imported.projects),
        items: merge(previous.items, imported.items),
      }),
      "导入完成",
    );
  }

  async function exportJson(name, value) {
    try {
      const saved = await invoke("export_json", { name, data: value });
      if (saved) setToast("JSON 文件已导出");
      return saved;
    } catch (error) {
      setStorageError(`导出失败：${error}`);
      return false;
    }
  }

  return (
    <WorkshopContext.Provider
      value={{
        projects: data?.projects || [],
        items: data?.items || [],
        ready: Boolean(data),
        saving,
        storagePath,
        storageError,
        toast,
        saveItem,
        saveProject,
        deleteItem,
        mergeWorkspace,
        exportJson,
        notify: setToast,
        reportError: (error) => setStorageError(String(error)),
        retryLoad: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </WorkshopContext.Provider>
  );
}
