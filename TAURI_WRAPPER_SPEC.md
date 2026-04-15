# KINDpos/lite — Tauri Desktop Wrapper Spec

## Purpose
Package KINDpos/lite as a single Windows executable for team testing.
Double-click to launch — no Python install, no terminal commands.

---

## Architecture

```
KINDpos.exe (Tauri)
  ├── Embedded portable Python 3.12
  ├── Backend (FastAPI app)
  ├── Frontend (static HTML/JS/CSS)
  └── Webview (OS native via WebView2)
```

### Startup Flow
1. First run: extract embedded Python + app to `%APPDATA%/KINDpos/`
2. Find available port (scan 8000-8099)
3. Spawn `uvicorn app.main:app --host 127.0.0.1 --port {PORT}`
4. Poll `http://127.0.0.1:{PORT}/health` every 500ms until 200
5. Open webview to `http://127.0.0.1:{PORT}` in full-screen kiosk mode
6. Show splash/loading screen during startup (~3-5 seconds)

### Shutdown Flow
1. User closes window (or Ctrl+Q)
2. Send SIGTERM to uvicorn child process
3. Wait up to 5s for graceful shutdown
4. Force-kill if needed
5. Exit

---

## Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Platform | Windows x64 | WebView2 (Edge-based) |
| Window | Full screen, no chrome | No title bar, no resize, no minimize |
| Port | Auto-detect 8000-8099 | First available |
| Data dir | `%APPDATA%/KINDpos/data/` | Persists between launches |
| Store mode | `KINDPOS_STORE_MODE=demo` | Sammy's Pizza demo data |
| Database | `%APPDATA%/KINDpos/data/event_ledger.db` | Auto-created on first run |
| Hardware DB | `%APPDATA%/KINDpos/data/hardware_config.db` | Device configs |
| Debug | `KINDPOS_DEBUG=false` | No debug output |

---

## Environment Variables (set by wrapper before spawn)

```
KINDPOS_STORE_MODE=demo
KINDPOS_DATABASE_PATH=%APPDATA%/KINDpos/data/event_ledger.db
KINDPOS_HOST=127.0.0.1
KINDPOS_PORT={auto-detected}
KINDPOS_DEBUG=false
```

---

## Tauri Project Structure

```
kindpos-desktop/
  ├── src-tauri/
  │   ├── Cargo.toml
  │   ├── tauri.conf.json
  │   ├── src/
  │   │   ├── main.rs          # Tauri entry, process management
  │   │   ├── server.rs        # Spawn/manage uvicorn process
  │   │   └── port.rs          # Find available port
  │   ├── icons/               # App icons (ICO for Windows)
  │   └── resources/
  │       ├── python/           # Embedded Python 3.12 (portable)
  │       ├── backend/          # Copy of KINDpos-lite/backend/
  │       └── frontend/         # Copy of KINDpos-lite/frontend/
  ├── src/
  │   └── index.html            # Minimal loader (redirects to backend)
  ├── package.json
  └── build.sh                  # Build script
```

---

## Rust: main.rs (pseudocode)

```rust
fn main() {
    // 1. Ensure app data directory exists
    let app_dir = dirs::data_dir() / "KINDpos";
    fs::create_dir_all(app_dir / "data");

    // 2. Extract resources on first run (or if version changed)
    if !app_dir.join("python").exists() || version_changed() {
        extract_resources(app_dir);
    }

    // 3. Find available port
    let port = find_available_port(8000, 8099);

    // 4. Set environment variables
    env::set_var("KINDPOS_STORE_MODE", "demo");
    env::set_var("KINDPOS_DATABASE_PATH", app_dir / "data/event_ledger.db");
    env::set_var("KINDPOS_HOST", "127.0.0.1");
    env::set_var("KINDPOS_PORT", port.to_string());

    // 5. Spawn uvicorn
    let server = Command::new(app_dir / "python/python.exe")
        .args(["-m", "uvicorn", "app.main:app",
               "--host", "127.0.0.1", "--port", &port.to_string()])
        .current_dir(app_dir / "backend")
        .spawn();

    // 6. Wait for health check
    wait_for_health(port, Duration::from_secs(30));

    // 7. Launch Tauri webview
    tauri::Builder::default()
        .setup(move |app| {
            let window = app.get_window("main").unwrap();
            window.set_fullscreen(true);
            window.eval(&format!("window.location = 'http://127.0.0.1:{}'", port));
            Ok(())
        })
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { .. } = event.event() {
                // Kill uvicorn
                server.kill();
            }
        })
        .run(context);
}
```

---

## Embedded Python

Use **Python 3.12 embeddable package** (Windows):
- Download from python.org (~10MB zip)
- Add pip via `get-pip.py`
- Install requirements: `pip install -r requirements.txt --target ./Lib`
- Total size: ~50-80MB

### requirements.txt (from backend/)
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic-settings==2.1.0
aiosqlite==0.20.0
httpx==0.27.0
```

---

## Build Process

```bash
# 1. Clone repos
git clone kindpos-lite
git clone kindpos-desktop

# 2. Copy app into resources
cp -r kindpos-lite/backend kindpos-desktop/src-tauri/resources/
cp -r kindpos-lite/frontend kindpos-desktop/src-tauri/resources/

# 3. Download + prepare embedded Python
./scripts/prepare-python.sh  # Downloads embeddable Python, installs deps

# 4. Build Tauri
cd kindpos-desktop
cargo tauri build --target x86_64-pc-windows-msvc

# Output: src-tauri/target/release/bundle/msi/KINDpos_1.0.0_x64.msi
# Or:     src-tauri/target/release/KINDpos.exe
```

---

## tauri.conf.json (key settings)

```json
{
  "package": {
    "productName": "KINDpos",
    "version": "1.2.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "identifier": "com.kindpos.lite",
      "icon": ["icons/icon.ico"],
      "resources": ["resources/**/*"],
      "targets": ["msi", "nsis"],
      "windows": {
        "certificateThumbprint": null,
        "wix": {
          "language": "en-US"
        }
      }
    },
    "windows": [
      {
        "title": "KINDpos",
        "fullscreen": true,
        "resizable": false,
        "decorations": false,
        "width": 1024,
        "height": 600
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src http://127.0.0.1:*; style-src 'self' 'unsafe-inline'; font-src 'self'"
    }
  }
}
```

---

## Distribution

- Build produces: `KINDpos_1.2.0_x64_setup.exe` (NSIS installer, ~80MB)
- Or: `KINDpos_1.2.0_x64.msi` (MSI installer)
- Team downloads from shared drive / GitHub release
- Double-click install → desktop shortcut → double-click to launch
- Data persists in `%APPDATA%/KINDpos/` across reinstalls

---

## Future Enhancements

- [ ] Auto-update via Tauri's built-in updater (checks GitHub releases)
- [ ] Mac build (WebKit webview, bundled Python via framework)
- [ ] Tray icon with status indicator
- [ ] Production mode toggle (KINDPOS_STORE_MODE=production)
- [ ] Connect to Overseer for remote configuration push
