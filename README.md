# update-flutter-app-icon

CLI to update flutter project app icons (Android, iOS, Web, macOS).

## Prerequisites

- Make sure node 14+ is installed in your system.
- Your app icon should be at least 1024 x 1024.

## Usage:

### Create a config file

Create a JSON file, for example, `updateIcons.json` in your flutter project, and you have different logo files for each platform within a folder named `./design/`:

```json
{
  "project": "./", // Flutter project dir relative to this config file.
  // ⬇️ PNG files for each platform.
  "windows": "design/windows.png",
  "macos": "design/macos.png",
  "ios": "design/mobile.png",
  "android": "design/mobile.png"
}
```

### Update icons via CLI

```
  Usage
    $ npx update-flutter-app-icon <config_file>

  Options
    --dry-run  Show the results but don't update any files.

  Examples
    $ npx update-flutter-app-icon ./flutter_proj/updateIcons.json
```

## Raw actions

If you want to create new icons instead of replacing old ones, use raw actions. For example, I want to create a 512x512 copy in asset folder for app about dialog:

```json
{
  "project": "./", // Flutter project dir relative to this config file.
  // ⬇️ PNG files for each platform.
  "windows": "design/windows.png",
  "macos": "design/macos.png",
  "ios": "design/mobile.png",
  "android": "design/mobile.png",
  // Raw actions.
  "raw": [
    {
      "icon": "macos.png", // Source icon file.
      "out": "res/about_logo_512.png", // Dest path.
      "size": 512 // New size.
    }
  ]
}
```

## Known issues

- Maskable icons for web are not supported. You can replace maskable icons in `web/icons` via raw actions mentioned above.
