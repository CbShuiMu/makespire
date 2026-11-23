mod storage;

use std::{fs, sync::Mutex};

use serde::Serialize;
use serde_json::Value;
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use storage::{parse_import, read_workshop, write_json, write_workshop, Workshop};

#[derive(Default)]
struct StorageLock(Mutex<()>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoadedWorkspace {
    data: Option<Workshop>,
    storage_path: String,
}

fn json_dialog(app: &tauri::AppHandle) -> tauri_plugin_dialog::FileDialogBuilder<tauri::Wry> {
    let mut dialog = app.dialog().file().add_filter("JSON", &["json"]);
    if let Ok(directory) = app.path().document_dir() {
        dialog = dialog.set_directory(directory);
    }
    if let Some(window) = app.get_webview_window("main") {
        dialog = dialog.set_parent(&window);
    }
    dialog
}

#[tauri::command]
fn load_workspace(
    app: tauri::AppHandle,
    state: State<'_, StorageLock>,
) -> Result<LoadedWorkspace, String> {
    let _guard = state.0.lock().map_err(|e| e.to_string())?;
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let path = directory.join("workshop.json");
    Ok(LoadedWorkspace {
        data: read_workshop(&path).map_err(|e| e.to_string())?,
        storage_path: path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn save_workspace(
    app: tauri::AppHandle,
    state: State<'_, StorageLock>,
    data: Workshop,
) -> Result<(), String> {
    let _guard = state.0.lock().map_err(|e| e.to_string())?;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("workshop.json");
    write_workshop(&path, &data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_json(app: tauri::AppHandle, name: String, data: Value) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let filename = format!(
            "{}.json",
            name.replace(['<', '>', ':', '"', '/', '\\', '|', '?', '*'], "-")
        );
        let file = json_dialog(&app)
            .set_title("导出设定")
            .set_file_name(filename)
            .blocking_save_file();
        let Some(file) = file else {
            return Ok(false);
        };
        let path = file.into_path().map_err(|e| e.to_string())?;
        write_json(&path, &data).map_err(|e| e.to_string())?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn import_json(app: tauri::AppHandle) -> Result<Option<Workshop>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let file = json_dialog(&app)
            .set_title("导入项目或工作空间")
            .blocking_pick_file();
        let Some(file) = file else {
            return Ok(None);
        };
        let path = file.into_path().map_err(|e| e.to_string())?;
        let bytes = fs::read(path).map_err(|e| e.to_string())?;
        parse_import(&bytes).map(Some).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn open_data_directory(app: tauri::AppHandle) -> Result<(), String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    app.opener()
        .open_path(directory.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

pub fn run() -> Result<(), tauri::Error> {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(StorageLock::default())
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            save_workspace,
            export_json,
            import_json,
            open_data_directory
        ])
        .run(tauri::generate_context!())
}
