#!/usr/bin/env node
import * as np from 'node:path';
import meow from 'meow';
import * as fs from 'fs';
import chalk from 'chalk';
import sharp from 'sharp';
import errMsg from 'catch-err-msg';
import toIco from 'to-ico';
import Config from './config.js';

const androidDir = 'android/app/src/main/res';
const iosDir = 'ios/Runner/Assets.xcassets/AppIcon.appiconset';
const macosDir = 'macos/Runner/Assets.xcassets/AppIcon.appiconset';
const webDir = 'web';
const windowsDir = 'windows/runner/resources';

enum OS {
  windows,
  macos,
  ios,
  android,
  web,
}

const osDict = new Map<OS, Map<string, number>>();

const ICO_SP_SIZE = -1;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

function addAndroidEntry(map: Map<string, number>, dir: string, size: number) {
  map.set(np.join(androidDir, dir, 'ic_launcher.png'), size);
}

function addIosEntry(map: Map<string, number>, name: string, size: number) {
  map.set(np.join(iosDir, `Icon-App-${name}.png`), size);
}

function addMacOSEntry(map: Map<string, number>, size: number) {
  map.set(np.join(macosDir, `app_icon_${size}.png`), size);
}

function addWebEntry(map: Map<string, number>, size: number) {
  map.set(np.join(webDir, 'icons', `Icon-${size}.png`), size);
}

function addWindowsEntry(map: Map<string, number>, file: string) {
  map.set(np.join(windowsDir, file), ICO_SP_SIZE);
}

function log(s: unknown) {
  // eslint-disable-next-line no-console
  console.log(s);
}

function logError(s: unknown) {
  return log(chalk.red(s));
}

function initMap() {
  let map = new Map<string, number>();
  addAndroidEntry(map, 'mipmap-hdpi', 72);
  addAndroidEntry(map, 'mipmap-mdpi', 48);
  addAndroidEntry(map, 'mipmap-xhdpi', 96);
  addAndroidEntry(map, 'mipmap-xxhdpi', 144);
  addAndroidEntry(map, 'mipmap-xxxhdpi', 192);
  osDict.set(OS.android, map);

  map = new Map<string, number>();
  addIosEntry(map, '20x20@1x', 20);
  addIosEntry(map, '20x20@2x', 40);
  addIosEntry(map, '20x20@3x', 60);
  addIosEntry(map, '29x29@1x', 29);
  addIosEntry(map, '29x29@2x', 58);
  addIosEntry(map, '29x29@3x', 87);
  addIosEntry(map, '40x40@1x', 40);
  addIosEntry(map, '40x40@2x', 80);
  addIosEntry(map, '40x40@3x', 120);
  addIosEntry(map, '60x60@2x', 120);
  addIosEntry(map, '60x60@3x', 180);
  addIosEntry(map, '76x76@1x', 76);
  addIosEntry(map, '76x76@2x', 152);
  addIosEntry(map, '83.5x83.5@2x', 167);
  addIosEntry(map, '1024x1024@1x', 1024);
  osDict.set(OS.ios, map);

  map = new Map<string, number>();
  addMacOSEntry(map, 16);
  addMacOSEntry(map, 32);
  addMacOSEntry(map, 64);
  addMacOSEntry(map, 128);
  addMacOSEntry(map, 256);
  addMacOSEntry(map, 512);
  addMacOSEntry(map, 1024);
  osDict.set(OS.macos, map);

  map = new Map<string, number>();
  addWindowsEntry(map, 'app_icon.ico');
  osDict.set(OS.windows, map);

  // Favicon.
  map = new Map<string, number>();
  map.set(np.join(webDir, 'favicon.png'), 16);
  addWebEntry(map, 192);
  addWebEntry(map, 512);
  osDict.set(OS.web, map);
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
    if (size === ICO_SP_SIZE) {
      // To .ico
      const layers = await Promise.all(ICO_SIZES.map((sz) => sharp(src).resize(sz).toBuffer()));
      await fs.promises.writeFile(dest, await toIco(layers));
    } else {
      // To .png
      await sharp(src).resize(size).toFile(dest);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(chalk.red(`Error converting file "${dest}": ${err}`));
  }
}

async function runOS(os: OS, projectDir: string, iconFile: string, dryRun: boolean) {
  const map = osDict.get(os);
  if (!map) {
    throw new Error(`Unexpected OS ${os}`);
  }
  // eslint-disable-next-line no-console
  console.log(chalk.yellow(`=== ${OS[os]} ===`));
  await Promise.all(
    Array.from(map).map(([dir, size]) =>
      handleFile(iconFile, np.join(projectDir, dir), size, dryRun),
    ),
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  try {
    const cli = meow(
      `
  Usage
    $ npx update-flutter-app-icon <config_file>
  
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

    const configFile = cli.input[0];
    if (!configFile) {
      logError('Missing <config_file>. See --help for help');
      process.exit(1);
    }
    initMap();
    const dryRun = !!cli.flags.dryRun;
    const configFileDir = np.dirname(configFile);
    const config = JSON.parse(await fs.promises.readFile(configFile, 'utf8')) as Config;
    const projectDir = np.resolve(configFileDir, config.project ?? '');

    // eslint-disable-next-line no-inner-declarations
    function resolveIconFile(value: string) {
      return np.resolve(configFileDir, value);
    }

    if (config.windows) {
      await runOS(OS.windows, projectDir, resolveIconFile(config.windows), dryRun);
    }
    if (config.macos) {
      await runOS(OS.macos, projectDir, resolveIconFile(config.macos), dryRun);
    }
    if (config.android) {
      await runOS(OS.android, projectDir, resolveIconFile(config.android), dryRun);
    }
    if (config.ios) {
      await runOS(OS.ios, projectDir, resolveIconFile(config.ios), dryRun);
    }
    if (config.web) {
      await runOS(OS.web, projectDir, resolveIconFile(config.web), dryRun);
    }
  } catch (err) {
    const message = errMsg(err);
    logError(message);
  }
})();
