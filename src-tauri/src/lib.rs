mod devserver;
mod fs;
mod job;
mod preview;

use tauri::{Manager, RunEvent};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(fs::Scope::default())
        .manage(preview::Preview::default())
        .manage(devserver::DevServer::default())
        .invoke_handler(tauri::generate_handler![
            fs::pick_folder,
            fs::restore_folder,
            fs::read_dir,
            fs::read_file,
            fs::read_file_bytes,
            fs::write_file,
            fs::stat,
            preview::preview_url,
            preview::preview_buffer,
            devserver::dev_start,
            devserver::dev_stop,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // A dev server must never outlive the app.
            if let RunEvent::Exit = event {
                devserver::stop(&app.state::<devserver::DevServer>());
            }
        });
}
