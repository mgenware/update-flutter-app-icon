#!/usr/bin/env node
import * as np from 'node:path';
import meow from 'meow';
import * as fs from 'fs';
import chalk from 'chalk';
import sharp from 'sharp';
import errMsg from 'catch-err-msg';

const androidDir = 'android/app/src/main/res';
const iosDir = 'ios/Runner/Assets.xcassets/AppIcon.appiconset';
const macosDir = 'macos/Runner/Assets.xcassets/AppIcon.appiconset';
const webDir = 'web';
const map = new Map<string, number>();

function addAndroidEntry(dir: string, size: number) {
  map.set(np.join(androidDir, dir, 'ic_launcher.png'), size);
}

function addIosEntry(name: string, size: number) {
  map.set(np.join(iosDir, `Icon-App-${name}.png`), size);
}

function addMacOSEntry(size: number) {
  map.set(np.join(macosDir, `app_icon_${size}.png`), size);
}

function addWebEntry(size: number) {
  map.set(np.join(webDir, 'icons', `Icon-${size}.png`), size);
}

function log(s: unknown) {
  // eslint-disable-next-line no-console
  console.log(s);
}

function logError(s: unknown) {
  return log(chalk.red(s));
}

function initMap() {
  addAndroidEntry('mipmap-hdpi', 72);
  addAndroidEntry('mipmap-mdpi', 48);
  addAndroidEntry('mipmap-xhdpi', 96);
  addAndroidEntry('mipmap-xxhdpi', 144);
  addAndroidEntry('mipmap-xxxhdpi', 192);

  addIosEntry('20x20@1x', 20);
  addIosEntry('20x20@2x', 40);
  addIosEntry('20x20@3x', 60);
  addIosEntry('29x29@1x', 29);
  addIosEntry('29x29@2x', 58);
  addIosEntry('29x29@3x', 87);
  addIosEntry('40x40@1x', 40);
  addIosEntry('40x40@2x', 80);
  addIosEntry('40x40@3x', 120);
  addIosEntry('60x60@2x', 120);
  addIosEntry('60x60@3x', 180);
  addIosEntry('76x76@1x', 76);
  addIosEntry('76x76@2x', 152);
  addIosEntry('83.5x83.5@2x', 167);
  addIosEntry('1024x1024@1x', 1024);

  addMacOSEntry(16);
  addMacOSEntry(32);
  addMacOSEntry(64);
  addMacOSEntry(128);
  addMacOSEntry(256);
  addMacOSEntry(512);
  addMacOSEntry(1024);

  // Favicon.
  map.set(np.join(webDir, 'favicon.png'), 16);
  addWebEntry(192);
  addWebEntry(512);
}

async function handleFile(src: string, dest: string, size: number, dryRun: boolean) {
  // Check if the file exists.
  try {
    await fs.promises.access(dest, fs.constants.F_OK);
  } catch (_) {
    // eslint-disable-next-line no-console
    console.log(chalk.yellow(`Icon file missing: "${dest}"`));
    return;
  }
  try {
    // eslint-disable-next-line no-console
    console.log(`${dest}`);
    if (dryRun) {
      return;
    }
    await sharp(src).resize(size).toFile(dest);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(chalk.red(`Error converting file "${dest}": ${err}`));
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  try {
    const cli = meow(
      `
  Usage
    $ npx update-flutter-app-icon <project_dir> <icon_file>
  
  Options
    --dry-run  Show the results but don't update any files.
  
  Examples
    $ npx update-flutter-app-icon ./flutter_proj ./flutter_proj/res/app_logo.png
  `,
      {
        importMeta: import.meta,
        flags: {
          dryRun: {
            type: 'boolean',
          },
        },
      },
    );

    const projectDir = cli.input[0];
    const iconFile = cli.input[1];
    if (!projectDir) {
      logError('Missing <project_dir>. See --help for help');
      process.exit(1);
    }
    if (!iconFile) {
      logError('Missing <icon_file>. See --help for help');
      process.exit(1);
    }
    initMap();
    await Promise.all(
      Array.from(map).map(([dir, size]) =>
        handleFile(iconFile, np.join(projectDir, dir), size, !!cli.flags.dryRun),
      ),
    );
  } catch (err) {
    const message = errMsg(err);
    logError(message);
  }
})();
