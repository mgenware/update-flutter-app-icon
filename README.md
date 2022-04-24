# update-flutter-app-icon

CLI to update flutter project app icon (Android, iOS, Web, macOS).

## Prerequisites

- Make sure node 14+ is installed in your system.
- Your app icon should be at least 1024 x 1024.

## CLI Usage:

```
  Usage
    $ npx update-flutter-app-icon <project_dir> <icon_file>

  Options
    --dry-run  Show the results but don't update any files.

  Examples
    $ npx update-flutter-app-icon ./flutter_proj ./flutter_proj/res/app_logo.png
```

## Known issues

- Maskable icons for web are not supported. You have to manually replace the maskable icons in `web/icons`.
