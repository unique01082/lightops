use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub body: Option<String>,
}

/// Check GitHub Releases for a newer version.
/// Returns UpdateInfo; never throws — errors result in available: false.
#[tauri::command]
pub async fn check_update(app: AppHandle) -> UpdateInfo {
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => UpdateInfo {
                available: true,
                version: Some(update.version.clone()),
                body: update.body.clone(),
            },
            _ => UpdateInfo {
                available: false,
                version: None,
                body: None,
            },
        },
        Err(_) => UpdateInfo {
            available: false,
            version: None,
            body: None,
        },
    }
}
