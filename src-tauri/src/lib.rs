use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

#[tauri::command]
async fn choose_output_path(app: tauri::AppHandle, filename: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let extension = filename.rsplit('.').next().unwrap_or_default();
        if !matches!(extension, "png" | "jpg" | "pdf" | "zip") {
            return Err("Formato de salida no admitido".to_owned());
        }
        let choice = app
            .dialog()
            .file()
            .set_file_name(&filename)
            .add_filter(extension.to_uppercase(), &[extension])
            .blocking_save_file();
        let Some(choice) = choice else { return Ok(None) };
        let path = choice.into_path().map_err(|error| error.to_string())?;
        app.fs_scope().allow_file(&path).map_err(|error| error.to_string())?;
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![choose_output_path])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Logos ERACIS Plus");
}
