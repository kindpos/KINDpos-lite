//! Terminal-side LAN sync with the Overseer.
//!
//! On boot, the Terminal:
//!   1. Reads `overseer.json` (persistent config) to find the Overseer URL.
//!   2. Reads `sync_cursor.txt` for the last seen Overseer sequence number.
//!   3. GETs `<overseer_url>/api/v1/sync/config/events?since=<cursor>`.
//!   4. POSTs the returned events to the local backend's
//!      `/api/v1/sync/config/events/replay`, which appends them to the local
//!      ledger (idempotent via event_id).
//!   5. Writes the new cursor to disk.
//!
//! The whole process is best-effort: if the Overseer is offline or unreachable,
//! the Terminal falls back to its local (possibly stale) config and keeps working.

use std::fs;
use std::path::{Path, PathBuf};

const SYNC_BATCH_LIMIT: usize = 1000;
const HTTP_TIMEOUT_SECS: u64 = 5;

fn config_path(app_dir: &Path) -> PathBuf {
    app_dir.join("overseer.json")
}

fn cursor_path(app_dir: &Path) -> PathBuf {
    app_dir.join("data").join("sync_cursor.txt")
}

/// Returns the configured Overseer base URL (e.g. "http://192.168.1.50:8765"),
/// or `None` if the terminal hasn't been pointed at an Overseer yet.
pub fn load_overseer_url(app_dir: &Path) -> Option<String> {
    // 1. Environment variable takes precedence (for testing / kiosk provisioning).
    if let Ok(url) = std::env::var("KINDPOS_OVERSEER_URL") {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.trim_end_matches('/').to_string());
        }
    }

    // 2. Persisted config file.
    let raw = fs::read_to_string(config_path(app_dir)).ok()?;
    // Minimal JSON parse: look for "url": "<value>".
    // We keep this tiny on purpose — no serde overhead just for one field.
    let key_idx = raw.find("\"url\"")?;
    let after = &raw[key_idx + 5..];
    let colon = after.find(':')?;
    let rest = after[colon + 1..].trim_start();
    let start = rest.find('"')? + 1;
    let tail = &rest[start..];
    let end = tail.find('"')?;
    let url = tail[..end].trim();
    if url.is_empty() {
        None
    } else {
        Some(url.trim_end_matches('/').to_string())
    }
}

fn load_cursor(app_dir: &Path) -> i64 {
    fs::read_to_string(cursor_path(app_dir))
        .ok()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0)
}

fn save_cursor(app_dir: &Path, cursor: i64) {
    let _ = fs::create_dir_all(app_dir.join("data"));
    let _ = fs::write(cursor_path(app_dir), cursor.to_string());
}

/// Pull config events from the Overseer and replay them into the local ledger.
/// Returns the number of events applied, or an error string if unreachable.
pub fn pull_config_from_overseer(
    app_dir: &Path,
    overseer_url: &str,
    local_url: &str,
) -> Result<usize, String> {
    let cursor = load_cursor(app_dir);

    let fetch_url = format!(
        "{}/api/v1/sync/config/events?since={}&limit={}",
        overseer_url, cursor, SYNC_BATCH_LIMIT
    );

    let agent = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(HTTP_TIMEOUT_SECS))
        .build();

    let resp = agent
        .get(&fetch_url)
        .call()
        .map_err(|e| format!("fetch from overseer failed: {e}"))?;

    let body: String = resp
        .into_string()
        .map_err(|e| format!("read overseer response: {e}"))?;

    // Extract the events array and the latest_sequence.
    // We forward the raw JSON body to the local backend, which handles parsing.
    let events_payload = extract_events_object(&body).unwrap_or_else(|| body.clone());
    let latest_sequence = extract_latest_sequence(&body).unwrap_or(cursor);

    let replay_url = format!("{}/api/v1/sync/config/events/replay", local_url);
    let replay_resp = agent
        .post(&replay_url)
        .set("Content-Type", "application/json")
        .send_string(&events_payload)
        .map_err(|e| format!("replay to local backend failed: {e}"))?;

    let replay_body: String = replay_resp
        .into_string()
        .map_err(|e| format!("read replay response: {e}"))?;

    let applied = extract_applied_count(&replay_body).unwrap_or(0);

    if latest_sequence > cursor {
        save_cursor(app_dir, latest_sequence);
    }

    Ok(applied)
}

/// The Overseer returns `{"events": [...], "latest_sequence": N, ...}`.
/// The replay endpoint expects `{"events": [...]}`. Reuse the same wrapper.
fn extract_events_object(body: &str) -> Option<String> {
    // Find the "events" key and re-wrap the array in `{"events": ...}`.
    let key_idx = body.find("\"events\"")?;
    let after = &body[key_idx + 8..];
    let colon = after.find(':')?;
    let arr = after[colon + 1..].trim_start();
    if !arr.starts_with('[') {
        return None;
    }
    // Walk the array, tracking nesting.
    let bytes = arr.as_bytes();
    let mut depth: i32 = 0;
    let mut in_string = false;
    let mut escape = false;
    let mut end = 0usize;
    for (i, &b) in bytes.iter().enumerate() {
        if escape {
            escape = false;
            continue;
        }
        match b {
            b'\\' if in_string => escape = true,
            b'"' => in_string = !in_string,
            b'[' if !in_string => depth += 1,
            b']' if !in_string => {
                depth -= 1;
                if depth == 0 {
                    end = i + 1;
                    break;
                }
            }
            _ => {}
        }
    }
    if end == 0 {
        return None;
    }
    let arr_str = &arr[..end];
    Some(format!("{{\"events\":{}}}", arr_str))
}

fn extract_latest_sequence(body: &str) -> Option<i64> {
    extract_integer_field(body, "latest_sequence")
}

fn extract_applied_count(body: &str) -> Option<usize> {
    extract_integer_field(body, "applied").map(|v| v.max(0) as usize)
}

fn extract_integer_field(body: &str, field: &str) -> Option<i64> {
    let needle = format!("\"{}\"", field);
    let idx = body.find(&needle)?;
    let after = &body[idx + needle.len()..];
    let colon = after.find(':')?;
    let rest = after[colon + 1..].trim_start();
    let end = rest
        .find(|c: char| !(c.is_ascii_digit() || c == '-'))
        .unwrap_or(rest.len());
    rest[..end].parse().ok()
}
