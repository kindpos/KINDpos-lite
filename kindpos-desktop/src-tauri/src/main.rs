// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod port;
mod server;

use server::ServerManager;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

/// Return the application data directory: `<data_dir>/KINDpos/`
fn app_data_dir() -> PathBuf {
    dirs::data_dir()
        .expect("Could not determine OS data directory")
        .join("KINDpos")
}

/// On first run (or after a version bump), copy embedded resources into the
/// application data directory so the Python backend can be launched from there.
fn ensure_resources_extracted(app_dir: &PathBuf, resource_dir: &PathBuf) {
    let marker = app_dir.join(".version");
    let current_version = env!("CARGO_PKG_VERSION");

    let needs_extract = if marker.exists() {
        let installed = fs::read_to_string(&marker).unwrap_or_default();
        installed.trim() != current_version
    } else {
        true
    };

    if !needs_extract {
        return;
    }

    // Copy resource sub-directories into app_dir.
    for dir_name in &["python", "backend", "frontend"] {
        let src = resource_dir.join(dir_name);
        let dst = app_dir.join(dir_name);
        if src.exists() {
            if dst.exists() {
                let _ = fs::remove_dir_all(&dst);
            }
            copy_dir_recursive(&src, &dst)
                .unwrap_or_else(|e| panic!("Failed to extract {dir_name}: {e}"));
        }
    }

    fs::write(&marker, current_version).ok();
}

/// Recursively copy a directory tree.
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn main() {
    let app_dir = app_data_dir();
    fs::create_dir_all(app_dir.join("data"))
        .expect("Failed to create KINDpos data directory");

    // --- Find an available port ---
    let port = port::find_available_port(8000, 8099)
        .expect("No available port in range 8000-8099");

    // --- Build and run the Tauri application ---
    tauri::Builder::default()
        .manage(Mutex::new(Option::<ServerManager>::None))
        .setup(move |app| {
            let resource_dir = app
                .path_resolver()
                .resolve_resource("resources")
                .expect("Failed to resolve bundled resources directory");

            // Extract resources on first run / version change.
            ensure_resources_extracted(&app_dir, &resource_dir);

            // Start the backend server.
            let srv = ServerManager::start(&app_dir, port)
                .expect("Failed to start backend server");

            srv.wait_for_health(Duration::from_secs(30))
                .expect("Backend server failed to become healthy");

            // Store the server handle so we can shut it down on exit.
            let state = app.state::<Mutex<Option<ServerManager>>>();
            *state.lock().unwrap() = Some(srv);

            // Point the webview at the running backend.
            let window = app.get_window("main").expect("No main window");
            window
                .eval(&format!(
                    "window.location.replace('http://127.0.0.1:{port}')"
                ))
                .ok();

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                let state = event.window().state::<Mutex<Option<ServerManager>>>();
                if let Some(srv) = state.lock().unwrap().as_mut() {
                    srv.stop();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Error while running KINDpos");
}
