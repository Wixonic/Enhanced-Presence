use std::process::Command;

fn main() {
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rerun-if-changed=icons/icon.icon");

        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        let icon_path = format!("{}/icons/icon.icon", manifest_dir);
        let compile_path = format!("{}/icons", manifest_dir);
        let plist_path = format!("{}/icons/partial.plist", manifest_dir);

        let output = Command::new("actool")
            .args(&[
                &icon_path,
                "--compile",
                &compile_path,
                "--app-icon",
                "icon",
                "--target-device",
                "mac",
                "--platform",
                "macosx",
                "--minimum-deployment-target",
                "26.0",
                "--output-partial-info-plist",
                &plist_path,
            ])
            .output();

        match output {
            Ok(out) => {
                if !out.status.success() {
                    let err = String::from_utf8_lossy(&out.stderr);
                    println!(
                        "cargo:warning=Failed to compile icon.icon with actool: {}",
                        err
                    );
                }
            }
            Err(e) => {
                println!(
                    "cargo:warning=actool command not found or failed to execute: {}",
                    e
                );
            }
        }
    }

    tauri_build::build();
}
