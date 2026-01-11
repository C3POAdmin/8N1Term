# Installation (Windows)

This project is built with **Tauri + Rust + Node.js**.  
These instructions are **Windows-only**.  
Linux/macOS users can translate as needed.

End goal:
npm run tauri dev

## 1. Install Node.js

Download and install **Node.js 18+ (LTS recommended)**:
https://nodejs.org

Verify:
node -v
npm -v

## 2. Install Rust

Download and run:
https://www.rust-lang.org/tools/install

Accept defaults.

After install, **close and reopen your terminal**, then verify:
rustc --version
cargo --version

## 3. Install Microsoft C++ Build Tools

Rust + Tauri require MSVC.

Download:
https://visualstudio.microsoft.com/visual-cpp-build-tools/

During install, select:
- **Desktop development with C++**
- MSVC v143 (or latest)
- Windows 10/11 SDK

No need to install full Visual Studio.

## 4. Install Tauri CLI

In a terminal:
cargo install tauri-cli --version "^2.0.0"

Verify:
tauri --version

## 5. Install Project Dependencies

From the project root:
npm install

## 6. Run the App (Dev Mode)

From the project root:
npm run tauri dev

First build will be slow. This is normal.  
Subsequent runs are fast.

## Common Errors

### `link.exe not found`
→ C++ Build Tools not installed correctly.  
Re-run installer and ensure **Desktop development with C++** is selected.

### `tauri: command not found`
→ Cargo bin directory not on PATH.

Ensure this exists in PATH:
C:\Users<yourname>.cargo\bin

Restart terminal after fixing.

## Notes

- Native build only. No Docker. No WSL. No VM.
- Use **PowerShell** or **CMD** (not Git Bash).
- If it fails, scroll up. Rust errors are verbose but accurate.

## Done

If everything worked, the app is now running via:
npm run tauri dev
