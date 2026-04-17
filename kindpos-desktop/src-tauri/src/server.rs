use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::time::{Duration, Instant};
use std::{env, thread};

/// Manages the lifecycle of the embedded uvicorn/FastAPI server process.
pub struct ServerManager {
    child: Child,
    port: u16,
}

/// Locate a usable Python interpreter.
/// Prefers the embedded portable copy; falls back to system Python.
fn find_python(app_dir: &Path) -> Result<PathBuf, String> {
    let embedded = if cfg!(windows) {
        app_dir.join("python").join("python.exe")
    } else {
        app_dir.join("python").join("bin").join("python3")
    };

    if embedded.exists() {
        return Ok(embedded);
    }

    // Fallback: look for python on the system PATH.
    for name in &["python", "python3"] {
        if let Ok(output) = Command::new(name).arg("--version").output() {
            if output.status.success() {
                return Ok(PathBuf::from(name));
            }
        }
    }

    Err(format!(
        "No Python found. Checked embedded ({}) and system PATH.",
        embedded.display()
    ))
}

impl ServerManager {
    /// Spawn uvicorn with the best available Python interpreter.
    ///
    /// `app_dir` is the root extraction directory (e.g. `%APPDATA%/KINDpos`).
    /// `bind_host` is "127.0.0.1" for Terminals (loopback only) or "0.0.0.0"
    /// for the Overseer (reachable by Terminals on the LAN).
    pub fn start(app_dir: &Path, port: u16, bind_host: &str) -> Result<Self, String> {
        let python = find_python(app_dir)?;

        let backend_dir = app_dir.join("backend");
        let db_path = app_dir.join("data").join("event_ledger.db");
        let hw_db_path = app_dir.join("data").join("hardware_config.db");

        let child = Command::new(&python)
            .args([
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                bind_host,
                "--port",
                &port.to_string(),
            ])
            .current_dir(&backend_dir)
            .env("KINDPOS_STORE_MODE", env::var("KINDPOS_STORE_MODE").unwrap_or_else(|_| "production".into()))
            .env("KINDPOS_DATABASE_PATH", &db_path)
            .env("KINDPOS_HARDWARE_DB_PATH", &hw_db_path)
            .env("KINDPOS_HOST", bind_host)
            .env("KINDPOS_PORT", port.to_string())
            .env("KINDPOS_DEBUG", env::var("KINDPOS_DEBUG").unwrap_or_else(|_| "false".into()))
            .spawn()
            .map_err(|e| format!("Failed to spawn uvicorn: {e}"))?;

        Ok(Self { child, port })
    }

    /// Block until the server responds 200 on `/health`, or until `timeout` elapses.
    pub fn wait_for_health(&self, timeout: Duration) -> Result<(), String> {
        let url = format!("http://127.0.0.1:{}/health", self.port);
        let start = Instant::now();
        let poll_interval = Duration::from_millis(500);

        while start.elapsed() < timeout {
            if let Ok(resp) = ureq::get(&url).call() {
                if resp.status() == 200 {
                    return Ok(());
                }
            }
            thread::sleep(poll_interval);
        }

        Err(format!(
            "Server did not become healthy within {}s",
            timeout.as_secs()
        ))
    }

    /// Gracefully stop the server. Sends a kill signal and waits up to 5 s
    /// for the process to exit before force-killing.
    pub fn stop(&mut self) {
        // On Unix, `kill()` sends SIGKILL; ideally we'd SIGTERM first.
        // For Windows, `kill()` terminates the process tree.
        #[cfg(unix)]
        {
            // Try SIGTERM first for graceful shutdown.
            unsafe {
                libc::kill(self.child.id() as i32, libc::SIGTERM);
            }
            let deadline = Instant::now() + Duration::from_secs(5);
            loop {
                match self.child.try_wait() {
                    Ok(Some(_)) => return,
                    Ok(None) if Instant::now() < deadline => {
                        thread::sleep(Duration::from_millis(250));
                    }
                    _ => break,
                }
            }
        }

        // Force-kill as a fallback (or primary on Windows).
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Drop for ServerManager {
    fn drop(&mut self) {
        self.stop();
    }
}
