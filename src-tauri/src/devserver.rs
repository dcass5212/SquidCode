//! Runs the user's dev-server command inside the opened folder and streams its output.
//!
//! The command string comes from the app's own UI (typed by the user), never from a file in the
//! opened folder, so merely opening a cloned repo can't run anything. One process at a time; it
//! is killed with its whole process tree on stop, on folder switch (frontend) and on app exit;
//! a Job Object (see `job.rs`) also covers the app being force-killed.

use std::io::{BufRead, BufReader, Read};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::fs::{FsError, Scope};
use crate::job::Job;

/// The running command. `job` is None where the OS can't group processes (or assignment failed).
struct Running {
    child: Child,
    job: Option<Job>,
}

#[derive(Default)]
pub struct DevServer(Mutex<Option<Running>>);

#[derive(Clone, Serialize)]
struct Exit {
    code: Option<i32>,
}

#[cfg(windows)]
fn shell(command: &str) -> Command {
    use std::os::windows::process::CommandExt;
    let mut c = Command::new("cmd");
    // `raw_arg` keeps the user's quoting intact; CREATE_NO_WINDOW avoids a console flash.
    c.raw_arg("/C").raw_arg(command).creation_flags(0x0800_0000);
    c
}

#[cfg(not(windows))]
fn shell(command: &str) -> Command {
    let mut c = Command::new("sh");
    c.args(["-c", command]);
    c
}

/// Kills the process and everything it spawned (`cmd /C` → uvicorn / node / ...).
fn kill_tree(mut running: Running) {
    if running.job.is_none() {
        // No job to tear down the tree, so ask Windows to walk it.
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let _ = Command::new("taskkill")
                .args(["/PID", &running.child.id().to_string(), "/T", "/F"])
                .creation_flags(0x0800_0000)
                .output();
        }
    }
    drop(running.job.take()); // kill-on-close takes the whole tree
    let _ = running.child.kill();
    let _ = running.child.wait();
}

fn forward<R: Read + Send + 'static>(app: &AppHandle, stream: R) {
    let app = app.clone();
    std::thread::spawn(move || {
        for line in BufReader::new(stream).lines().map_while(Result::ok) {
            let _ = app.emit("dev:output", line);
        }
    });
}

#[tauri::command]
pub fn dev_start(
    command: String,
    app: AppHandle,
    scope: State<'_, Scope>,
    dev: State<'_, DevServer>,
) -> Result<(), FsError> {
    if command.trim().is_empty() {
        return Err(FsError::new("io", "Enter a command to run".into()));
    }
    let root = scope
        .root()
        .ok_or_else(|| FsError::new("outside_scope", "Open a folder first".into()))?;
    let mut slot = dev.0.lock().unwrap();
    if slot.is_some() {
        return Err(FsError::new("io", "A dev server is already running".into()));
    }
    let mut child = shell(&command)
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        // Python buffers piped stdout, which would hide uvicorn/flask output until exit.
        .env("PYTHONUNBUFFERED", "1")
        .spawn()?;
    if let Some(out) = child.stdout.take() {
        forward(&app, out);
    }
    if let Some(err) = child.stderr.take() {
        forward(&app, err);
    }
    // Grouped before the shell has had time to start its own children, so they inherit the job.
    let job = Job::new().filter(|job| job.assign(&child));
    *slot = Some(Running { child, job });
    drop(slot);

    // Reports natural exits (crash, Ctrl+C in the command) and frees the slot.
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(300));
        let dev = app.state::<DevServer>();
        let mut slot = dev.0.lock().unwrap();
        match slot.as_mut().map(|r| r.child.try_wait()) {
            None => return, // stopped via dev_stop
            Some(Ok(Some(status))) => {
                *slot = None;
                let _ = app.emit("dev:exit", Exit { code: status.code() });
                return;
            }
            Some(_) => {}
        }
    });
    Ok(())
}

#[tauri::command]
pub fn dev_stop(app: AppHandle, dev: State<'_, DevServer>) {
    stop(&dev);
    let _ = app.emit("dev:exit", Exit { code: None });
}

/// Also called when the app exits so no server outlives it.
pub fn stop(dev: &DevServer) {
    if let Some(running) = dev.0.lock().unwrap().take() {
        kill_tree(running);
    }
}
