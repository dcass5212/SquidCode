//! Filesystem commands (typed contract mirrored in `src/core/fs.ts`). All commands are live.
//!
//! Scope rule: Rust owns the list of opened roots. `pick_folder` shows the native dialog itself
//! and records the chosen root; every other command canonicalizes its path and rejects anything
//! outside a recorded root. The webview can never grant itself access.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

/// Folders the user has opened. Only Rust writes to it.
#[derive(Default)]
pub struct Scope(Mutex<Vec<PathBuf>>);

impl Scope {
    /// Canonicalizes `path` (resolving `..` and symlinks) and checks it lies under an opened root.
    pub(crate) fn resolve(&self, path: &str) -> Result<PathBuf, FsError> {
        let canonical = Path::new(path).canonicalize().map_err(FsError::from)?;
        let roots = self.0.lock().unwrap();
        if roots.iter().any(|root| canonical.starts_with(root)) {
            Ok(canonical)
        } else {
            Err(FsError::new(
                "outside_scope",
                format!("{path} is outside the opened folder"),
            ))
        }
    }
}

impl Scope {
    /// The opened folder (single workspace), if any.
    pub(crate) fn root(&self) -> Option<PathBuf> {
        self.0.lock().unwrap().first().cloned()
    }
}

/// Canonical Windows paths carry a `\\?\` verbatim prefix, which is noise in the UI.
fn display_path(path: &Path) -> String {
    let s = path.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with("UNC") => rest.to_string(),
        _ => s.into_owned(),
    }
}

fn mtime_ms(meta: &std::fs::Metadata) -> f64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map_or(0.0, |d| d.as_secs_f64() * 1000.0)
}

#[derive(Serialize)]
pub struct FsError {
    kind: &'static str,
    message: String,
}

impl FsError {
    pub(crate) fn new(kind: &'static str, message: String) -> Self {
        Self { kind, message }
    }
}

impl From<std::io::Error> for FsError {
    fn from(e: std::io::Error) -> Self {
        let kind = if e.kind() == std::io::ErrorKind::NotFound {
            "not_found"
        } else {
            "io"
        };
        Self::new(kind, e.to_string())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    name: String,
    kind: &'static str, // "file" | "dir" | "symlink"
    size: u64,
    mtime_ms: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    text: String,
    mtime_ms: f64,
    encoding: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stat {
    kind: &'static str,
    size: u64,
    mtime_ms: f64,
}

/// Shows the native dialog and records the choice as the only accessible root (single workspace).
#[tauri::command]
pub async fn pick_folder(
    app: AppHandle,
    scope: State<'_, Scope>,
) -> Result<Option<String>, FsError> {
    let Some(picked) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let picked = picked
        .into_path()
        .map_err(|e| FsError::new("io", e.to_string()))?;
    let root = picked.canonicalize().map_err(FsError::from)?;
    let shown = display_path(&root);
    *scope.0.lock().unwrap() = vec![root];
    remember_folder(&app, &shown);
    Ok(Some(shown))
}

/// File in the app's config dir holding the last folder the user picked via the dialog.
fn last_folder_file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("last-folder.txt"))
}

/// Best effort: failing to remember the folder only costs a manual re-open next launch.
fn remember_folder(app: &AppHandle, folder: &str) {
    let Some(file) = last_folder_file(app) else { return };
    if let Some(dir) = file.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(file, folder);
}

/// Re-opens the folder the user last picked. The path comes from a file only Rust writes, never
/// from the webview, so the webview still cannot grant itself access to an arbitrary folder.
#[tauri::command]
pub fn restore_folder(app: AppHandle, scope: State<'_, Scope>) -> Option<String> {
    let saved = std::fs::read_to_string(last_folder_file(&app)?).ok()?;
    let root = Path::new(saved.trim()).canonicalize().ok().filter(|p| p.is_dir())?;
    let shown = display_path(&root);
    *scope.0.lock().unwrap() = vec![root];
    Some(shown)
}

#[tauri::command]
pub fn read_dir(path: String, scope: State<'_, Scope>) -> Result<Vec<Entry>, FsError> {
    let dir = scope.resolve(&path)?;
    let mut entries = Vec::new();
    for item in std::fs::read_dir(dir)?.flatten() {
        // Entries we cannot stat (permissions, races) are skipped rather than failing the listing.
        let (Ok(file_type), Ok(meta)) = (item.file_type(), item.metadata()) else {
            continue;
        };
        let kind = if file_type.is_symlink() {
            "symlink"
        } else if file_type.is_dir() {
            "dir"
        } else {
            "file"
        };
        entries.push(Entry {
            name: item.file_name().to_string_lossy().into_owned(),
            kind,
            size: meta.len(),
            mtime_ms: mtime_ms(&meta),
        });
    }
    Ok(entries)
}

/// Larger files are refused rather than loaded into the editor.
const MAX_FILE_BYTES: u64 = 5 * 1024 * 1024;

/// A NUL byte in the first chunk is the usual (git-style) binary signal.
const BINARY_SNIFF_BYTES: usize = 8192;

#[tauri::command]
pub fn read_file(path: String, scope: State<'_, Scope>) -> Result<FileContent, FsError> {
    let file = scope.resolve(&path)?;
    let meta = std::fs::metadata(&file)?;
    if !meta.is_file() {
        return Err(FsError::new("io", format!("{path} is not a file")));
    }
    if meta.len() > MAX_FILE_BYTES {
        return Err(FsError::new(
            "too_large",
            format!("File is {:.1} MB; the limit is 5 MB", meta.len() as f64 / 1_048_576.0),
        ));
    }
    let bytes = std::fs::read(&file)?;
    let sniff = &bytes[..bytes.len().min(BINARY_SNIFF_BYTES)];
    let not_binary = !sniff.contains(&0);
    // Invalid UTF-8 is refused too: lossy decoding would corrupt the file on save.
    let text = String::from_utf8(bytes)
        .ok()
        .filter(|_| not_binary)
        .ok_or_else(|| FsError::new("binary", "Not a UTF-8 text file".into()))?;
    Ok(FileContent {
        text,
        mtime_ms: mtime_ms(&meta),
        encoding: "utf-8",
    })
}

/// Images shown in the Markdown preview; kept small so a stray huge file can't stall the UI.
const MAX_IMAGE_BYTES: u64 = 20 * 1024 * 1024;

/// Raw bytes for the preview's relative images. Same scope check as every other command.
#[tauri::command]
pub fn read_file_bytes(
    path: String,
    scope: State<'_, Scope>,
) -> Result<tauri::ipc::Response, FsError> {
    let file = scope.resolve(&path)?;
    let meta = std::fs::metadata(&file)?;
    if !meta.is_file() {
        return Err(FsError::new("io", format!("{path} is not a file")));
    }
    if meta.len() > MAX_IMAGE_BYTES {
        return Err(FsError::new("too_large", "File is too large to preview".into()));
    }
    Ok(tauri::ipc::Response::new(std::fs::read(&file)?))
}

/// Returns the new mtime. Fails with kind "conflict" if disk mtime != `expected_mtime_ms`.
/// Writes a sibling temp file then renames over the target, so a crash never leaves a torn file.
#[tauri::command]
pub fn write_file(
    path: String,
    text: String,
    expected_mtime_ms: Option<f64>,
    scope: State<'_, Scope>,
) -> Result<f64, FsError> {
    let file = scope.resolve(&path)?;
    let current = std::fs::metadata(&file)?;
    if let Some(expected) = expected_mtime_ms {
        // Sub-millisecond slack: mtime round-trips through an f64 of milliseconds.
        if (mtime_ms(&current) - expected).abs() >= 1.0 {
            return Err(FsError::new(
                "conflict",
                "The file changed on disk since it was opened".into(),
            ));
        }
    }
    let dir = file
        .parent()
        .ok_or_else(|| FsError::new("io", "File has no parent folder".into()))?;
    let name = file.file_name().unwrap_or_default().to_string_lossy();
    let tmp = dir.join(format!(".{name}.squidcode-tmp"));
    let result = (|| -> std::io::Result<()> {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(text.as_bytes())?;
        f.sync_all()?; // data on disk before the rename makes it visible
        drop(f);
        std::fs::set_permissions(&tmp, current.permissions())?; // keeps read-only/attrs consistent
        std::fs::rename(&tmp, &file)
    })();
    if let Err(e) = result {
        let _ = std::fs::remove_file(&tmp);
        return Err(e.into());
    }
    Ok(mtime_ms(&std::fs::metadata(&file)?))
}

#[tauri::command]
pub fn stat(path: String, scope: State<'_, Scope>) -> Result<Stat, FsError> {
    let file = scope.resolve(&path)?;
    let meta = std::fs::metadata(&file)?;
    Ok(Stat {
        kind: if meta.is_dir() { "dir" } else { "file" },
        size: meta.len(),
        mtime_ms: mtime_ms(&meta),
    })
}
