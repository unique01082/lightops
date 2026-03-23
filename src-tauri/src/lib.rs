mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_updater::Builder::new()
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            scan_folders,
            build_rename_plan,
            execute_plan,
            cancel_execution,
            pick_folder,
            check_update,
            save_preset,
            list_presets,
            load_preset,
            delete_preset,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LightOps");
}
