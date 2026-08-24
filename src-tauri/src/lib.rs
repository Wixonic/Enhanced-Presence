use serde::{Deserialize, Serialize};
use tauri::{
	menu::{Menu, MenuItem},
	tray::{TrayIconBuilder, TrayIconEvent},
	Manager,
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppleMusicTrack {
	pub running: bool,
	pub player_state: String,
	pub name: Option<String>,
	pub artist: Option<String>,
	pub album: Option<String>,
	pub position: Option<f64>,
	pub duration: Option<f64>,
}

#[tauri::command]
fn get_apple_music_state() -> AppleMusicTrack {
	#[cfg(target_os = "macos")]
	{
		use std::process::Command;
		let script = r#"
			if application "Music" is running then
				tell application "Music"
					try
						set pState to player state as string
						if pState is "playing" then
							set tName to name of current track
							set tArtist to artist of current track
							set tAlbum to album of current track
							set tPos to player position
							set tDur to duration of current track
							return pState & "|||" & tName & "|||" & tArtist & "|||" & tAlbum & "|||" & (tPos as string) & "|||" & (tDur as string)
						else
							return pState
						end if
					on error
						return "stopped"
					end try
				end tell
			else
				return "not_running"
			end if
		"#;

		if let Ok(out) = Command::new("osascript").arg("-e").arg(script).output() {
			let res = String::from_utf8_lossy(&out.stdout).trim().to_string();
			if res == "not_running" {
				return AppleMusicTrack {
					running: false,
					player_state: "stopped".into(),
					name: None,
					artist: None,
					album: None,
					position: None,
					duration: None,
				};
			}
			if res.starts_with("playing|||") {
				let parts: Vec<&str> = res.split("|||").collect();
				let parse_num = |idx: usize| -> Option<f64> {
					parts.get(idx).and_then(|s| s.replace(',', ".").trim().parse::<f64>().ok())
				};
				return AppleMusicTrack {
					running: true,
					player_state: "playing".into(),
					name: parts.get(1).filter(|s| !s.is_empty()).map(|s| s.to_string()),
					artist: parts.get(2).filter(|s| !s.is_empty()).map(|s| s.to_string()),
					album: parts.get(3).filter(|s| !s.is_empty()).map(|s| s.to_string()),
					position: parse_num(4),
					duration: parse_num(5),
				};
			}
			return AppleMusicTrack {
				running: true,
				player_state: res,
				name: None,
				artist: None,
				album: None,
				position: None,
				duration: None,
			};
		}
	}

	AppleMusicTrack {
		running: false,
		player_state: "stopped".into(),
		name: None,
		artist: None,
		album: None,
		position: None,
		duration: None,
	}
}

#[tauri::command]
fn show_settings(app: tauri::AppHandle) {
	if let Some(window) = app.get_webview_window("main") {
		let _ = window.show();
		let _ = window.set_focus();
		#[cfg(target_os = "macos")]
		let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
	}
}

#[tauri::command]
fn hide_settings(app: tauri::AppHandle) {
	if let Some(window) = app.get_webview_window("main") {
		let _ = window.hide();
		#[cfg(target_os = "macos")]
		let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
	}
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
	app.exit(0);
}

pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_http::init())
		.plugin(tauri_plugin_websocket::init())
		.invoke_handler(tauri::generate_handler![
			get_apple_music_state,
			show_settings,
			hide_settings,
			quit_app
		])
		.setup(|app| {
			#[cfg(target_os = "macos")]
			app.set_activation_policy(tauri::ActivationPolicy::Accessory);

			let settings_i = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
			let quit_i = MenuItem::with_id(app, "quit", "Quit Enhanced Presence", true, None::<&str>)?;
			let menu = Menu::with_items(app, &[&settings_i, &quit_i])?;

			let mut tray_builder = TrayIconBuilder::new()
				.menu(&menu)
				.show_menu_on_left_click(false)
				.on_menu_event(|app, event| match event.id.as_ref() {
					"settings" => {
						show_settings(app.clone());
					}
					"quit" => {
						quit_app(app.clone());
					}
					_ => {}
				})
				.on_tray_icon_event(|tray, event| {
					if let TrayIconEvent::Click {
						button: tauri::tray::MouseButton::Left,
						button_state: tauri::tray::MouseButtonState::Up,
						..
					} = event
					{
						let app = tray.app_handle();
						if let Some(window) = app.get_webview_window("main") {
							if window.is_visible().unwrap_or(false) {
								hide_settings(app.clone());
							} else {
								show_settings(app.clone());
							}
						}
					}
				});

			if let Some(icon) = app.default_window_icon() {
				tray_builder = tray_builder.icon(icon.clone());
			}

			tray_builder.build(app)?;

			Ok(())
		})
		.on_window_event(|window, event| {
			if let tauri::WindowEvent::CloseRequested { api, .. } = event {
				api.prevent_close();
				let _ = window.hide();
				#[cfg(target_os = "macos")]
				{
					let app = window.app_handle();
					let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
				}
			}
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
