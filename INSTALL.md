# Installation (Windows)

This project uses **Tauri + Rust + Node.js**.

## Prerequisites

Install these once:

- Node.js (18+ LTS): https://nodejs.org  
- Rust: https://www.rust-lang.org/tools/install  
- Microsoft C++ Build Tools (MSVC):  
  https://visualstudio.microsoft.com/visual-cpp-build-tools/  
  *(Select “Desktop development with C++”)*

## Setup

Install project dependencies from the project folder:
```sh
npm install
```

## Development run 

Run the project in dev mode (slow the first time):
```sh
npx tauri dev
```

## Compile

```sh
npx tauri build
```

