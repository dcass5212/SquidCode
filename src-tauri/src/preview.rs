//! Local static server for the HTML preview, so a page's relative CSS/JS/images just work.
//!
//! Safety: it binds 127.0.0.1 only, every URL starts with a random per-run token (other pages in
//! the user's browser cannot guess it), the Host header must be ours (blocks DNS rebinding), and
//! files go through the same `Scope::resolve` check as every other command.

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Manager, State};

use crate::fs::{FsError, Scope};

/// Port and token of the running server (started on first use), plus unsaved editor text that is
/// served in place of the file on disk so the preview shows edits before they are saved.
#[derive(Default)]
pub struct Preview {
    server: Mutex<Option<(u16, String)>>,
    buffers: Mutex<HashMap<PathBuf, String>>,
}

const MAX_SERVED_BYTES: u64 = 50 * 1024 * 1024;

fn new_token() -> Result<String, FsError> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|e| FsError::new("io", e.to_string()))?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

fn percent_encode(segment: &str) -> String {
    let mut out = String::new();
    for b in segment.bytes() {
        if b.is_ascii_alphanumeric() || b"-._~".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

fn percent_decode(s: &str) -> Option<String> {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = s.get(i + 1..i + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

fn content_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase)
        .as_deref()
    {
        Some("html" | "htm") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js" | "mjs") => "text/javascript; charset=utf-8",
        Some("json" | "map") => "application/json; charset=utf-8",
        Some("txt" | "md") => "text/plain; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("ico") => "image/x-icon",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("ttf") => "font/ttf",
        Some("wasm") => "application/wasm",
        _ => "application/octet-stream",
    }
}

fn respond(stream: &mut TcpStream, status: &str, ctype: &str, body: &[u8], head_only: bool) {
    let header = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {ctype}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(header.as_bytes());
    if !head_only {
        let _ = stream.write_all(body);
    }
}

/// The still-encoded path of a request, relative to the opened folder. Normally the URL starts
/// with our token; a root-absolute reference (`/css/a.css`) in a served page does not, so it is
/// accepted only when the Referer proves it came from a page of ours (the token stays secret).
fn relative_path(path: &str, referer: &str, token: &str) -> Option<String> {
    let prefix = format!("/{token}/");
    if let Some(rest) = path.strip_prefix(&prefix) {
        return Some(rest.to_string());
    }
    let from_us = referer.split(['?', '#']).next()?.contains(&prefix);
    from_us.then(|| path.strip_prefix('/').unwrap_or(path).to_string())
}

fn handle(mut stream: TcpStream, app: &AppHandle, port: u16, token: &str) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut request_line = String::new();
    if reader.by_ref().take(8192).read_line(&mut request_line).is_err() {
        return;
    }
    let mut host = String::new();
    let mut referer = String::new();
    for _ in 0..64 {
        let mut line = String::new();
        if reader.by_ref().take(8192).read_line(&mut line).unwrap_or(0) == 0 || line == "\r\n" {
            break;
        }
        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("host") {
                host = value.trim().to_ascii_lowercase();
            } else if name.eq_ignore_ascii_case("referer") {
                referer = value.trim().to_string();
            }
        }
    }

    let mut parts = request_line.split_whitespace();
    let (method, target) = (parts.next().unwrap_or(""), parts.next().unwrap_or(""));
    let head_only = method == "HEAD";
    if method != "GET" && !head_only {
        return respond(&mut stream, "405 Method Not Allowed", "text/plain", b"", false);
    }
    if host != format!("127.0.0.1:{port}") && host != format!("localhost:{port}") {
        return respond(&mut stream, "403 Forbidden", "text/plain", b"", false);
    }

    let path_only = target.split(['?', '#']).next().unwrap_or("");
    let Some(rel) = relative_path(path_only, &referer, token).and_then(|p| percent_decode(&p)) else {
        return respond(&mut stream, "404 Not Found", "text/plain", b"Not found", head_only);
    };

    let scope = app.state::<Scope>();
    let not_found = |s: &mut TcpStream| respond(s, "404 Not Found", "text/plain", b"Not found", head_only);
    let Some(root) = scope.root() else {
        return not_found(&mut stream);
    };
    let mut candidate = root.join(rel.replace('\\', "/"));
    if candidate.is_dir() {
        candidate.push("index.html");
    }
    // Canonicalizes (so `..` and symlinks can't escape) and enforces the opened-folder scope.
    let Ok(file) = scope.resolve(&candidate.to_string_lossy()) else {
        return not_found(&mut stream);
    };
    if let Some(text) = app.state::<Preview>().buffers.lock().unwrap().get(&file) {
        return respond(&mut stream, "200 OK", content_type(&file), text.as_bytes(), head_only);
    }
    match std::fs::metadata(&file) {
        Ok(m) if m.is_file() && m.len() <= MAX_SERVED_BYTES => match std::fs::read(&file) {
            Ok(body) => respond(&mut stream, "200 OK", content_type(&file), &body, head_only),
            Err(_) => not_found(&mut stream),
        },
        _ => not_found(&mut stream),
    }
}

fn start(app: &AppHandle) -> Result<(u16, String), FsError> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    let token = new_token()?;
    let (app, thread_token) = (app.clone(), token.clone());
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let (app, token) = (app.clone(), thread_token.clone());
            std::thread::spawn(move || handle(stream, &app, port, &token));
        }
    });
    Ok((port, token))
}

/// URL under which the preview server serves `path` (a file inside the opened folder).
#[tauri::command]
pub fn preview_url(
    path: String,
    app: AppHandle,
    scope: State<'_, Scope>,
    preview: State<'_, Preview>,
) -> Result<String, FsError> {
    let file = scope.resolve(&path)?;
    let root = scope
        .root()
        .ok_or_else(|| FsError::new("outside_scope", "No folder is open".into()))?;
    let rel = file
        .strip_prefix(&root)
        .map_err(|_| FsError::new("outside_scope", format!("{path} is outside the opened folder")))?;

    let mut running = preview.server.lock().unwrap();
    if running.is_none() {
        *running = Some(start(&app)?);
    }
    let (port, token) = running.as_ref().unwrap();
    let encoded: Vec<String> = rel
        .components()
        .map(|c| percent_encode(&c.as_os_str().to_string_lossy()))
        .collect();
    Ok(format!("http://127.0.0.1:{port}/{token}/{}", encoded.join("/")))
}

/// Sets (or, with `None`, clears) the unsaved text served for an HTML file in the opened folder.
#[tauri::command]
pub fn preview_buffer(
    path: String,
    text: Option<String>,
    scope: State<'_, Scope>,
    preview: State<'_, Preview>,
) -> Result<(), FsError> {
    let file = scope.resolve(&path)?;
    let mut buffers = preview.buffers.lock().unwrap();
    match text {
        Some(text) => buffers.insert(file, text),
        None => buffers.remove(&file),
    };
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_prefix_is_stripped() {
        assert_eq!(relative_path("/tok/a/b.css", "", "tok").as_deref(), Some("a/b.css"));
    }

    #[test]
    fn root_absolute_needs_our_referer() {
        let referer = "http://127.0.0.1:5000/tok/page.html";
        assert_eq!(relative_path("/css/a.css", referer, "tok").as_deref(), Some("css/a.css"));
        assert_eq!(relative_path("/css/a.css", "", "tok"), None);
        assert_eq!(relative_path("/css/a.css", "http://evil.test/", "tok"), None);
        // The token only counts in the Referer's path, not in a query a stranger controls.
        assert_eq!(relative_path("/x", "http://evil.test/?u=/tok/", "tok"), None);
    }

    #[test]
    fn percent_round_trip() {
        let name = "my file é#1.html";
        assert_eq!(percent_decode(&percent_encode(name)).as_deref(), Some(name));
    }

    #[test]
    fn rejects_bad_escapes() {
        assert_eq!(percent_decode("%zz"), None);
        assert_eq!(percent_decode("%4"), None);
    }

    #[test]
    fn tokens_are_unique_hex() {
        let (a, b) = (new_token().ok().unwrap(), new_token().ok().unwrap());
        assert_eq!(a.len(), 32);
        assert_ne!(a, b);
    }
}
