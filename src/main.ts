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

interface ImageOptions {
  size: number;
  noAlphaChannel?: boolean;
}

const osDict = new Map<OS, Map<string, ImageOptions>>();

const ICO_SP_SIZE = -1;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

function addAndroidEntry(map: Map<string, ImageOptions>, dir: string, opt: ImageOptions) {
  map.set(np.join(androidDir, dir, 'ic_launcher.png'), opt);
}

function addIosEntry(map: Map<string, ImageOptions>, name: string, opt: ImageOptions) {
  // No alpha channels in iOS.
  map.set(np.join(iosDir, `Icon-App-${name}.png`), { ...opt, noAlphaChannel: true });
}

function addMacOSEntry(map: Map<string, ImageOptions>, opt: ImageOptions) {
  map.set(np.join(macosDir, `app_icon_${opt.size}.png`), opt);
}

function addWebEntry(map: Map<string, ImageOptions>, opt: ImageOptions) {
  map.set(np.join(webDir, 'icons', `Icon-${opt.size}.png`), opt);
}

function addWindowsEntry(map: Map<string, ImageOptions>, file: string) {
  map.set(np.join(windowsDir, file), { size: ICO_SP_SIZE });
}

function log(s: unknown) {
  // eslint-disable-next-line no-console
  console.log(s);
}

function logError(s: unknown) {
  return log(chalk.red(s));
}

function initMap() {
  let map = new Map<string, ImageOptions>();
  addAndroidEntry(map, 'mipmap-hdpi', { size: 72 });
  addAndroidEntry(map, 'mipmap-mdpi', { size: 48 });
  addAndroidEntry(map, 'mipmap-xhdpi', { size: 96 });
  addAndroidEntry(map, 'mipmap-xxhdpi', { size: 144 });
  addAndroidEntry(map, 'mipmap-xxxhdpi', { size: 192 });
  osDict.set(OS.android, map);

  map = new Map<string, ImageOptions>();
  addIosEntry(map, '20x20@1x', { size: 20 });
  addIosEntry(map, '20x20@2x', { size: 40 });
  addIosEntry(map, '20x20@3x', { size: 60 });
  addIosEntry(map, '29x29@1x', { size: 29 });
  addIosEntry(map, '29x29@2x', { size: 58 });
  addIosEntry(map, '29x29@3x', { size: 87 });
  addIosEntry(map, '40x40@1x', { size: 40 });
  addIosEntry(map, '40x40@2x', { size: 80 });
  addIosEntry(map, '40x40@3x', { size: 120 });
  addIosEntry(map, '60x60@2x', { size: 120 });
  addIosEntry(map, '60x60@3x', { size: 180 });
  addIosEntry(map, '76x76@1x', { size: 76 });
  addIosEntry(map, '76x76@2x', { size: 152 });
  addIosEntry(map, '83.5x83.5@2x', { size: 167 });
  addIosEntry(map, '1024x1024@1x', { size: 1024 });
  osDict.set(OS.ios, map);

  map = new Map<string, ImageOptions>();
  addMacOSEntry(map, { size: 16 });
  addMacOSEntry(map, { size: 32 });
  addMacOSEntry(map, { size: 64 });
  addMacOSEntry(map, { size: 128 });
  addMacOSEntry(map, { size: 256 });
  addMacOSEntry(map, { size: 512 });
  addMacOSEntry(map, { size: 1024 });
  osDict.set(OS.macos, map);

  map = new Map<string, ImageOptions>();
  addWindowsEntry(map, 'app_icon.ico');
  osDict.set(OS.windows, map);

  // Favicon.
  map = new Map<string, ImageOptions>();
  map.set(np.join(webDir, 'favicon.png'), { size: 16 });
  addWebEntry(map, { size: 192 });
  addWebEntry(map, { size: 512 });
  osDict.set(OS.web, map);
}

async function handleFile(
  src: string,
  dest: string,
  opt: ImageOptions,
  dryRun: boolean,
  // If true, create a new file if it doesn't exist.
  newFile: boolean,
) {
  if (!newFile) {
    // Check if the file exists.
    try {
      await fs.promises.access(dest, fs.constants.F_OK);
    } catch (_) {
      // eslint-disable-next-line no-console
      console.log(chalk.red(`Icon file missing: "${dest}"`));
      return;
    }
  }
  try {
    // eslint-disable-next-line no-console
    console.log(`${dest} [${JSON.stringify(opt)}]`);
    if (dryRun) {
      return;
    }
    if (opt.size === ICO_SP_SIZE) {
      // To .ico
      const layers = await Promise.all(ICO_SIZES.map((sz) => sharp(src).resize(sz).toBuffer()));
      await fs.promises.writeFile(dest, await toIco(layers));
    } else {
      // To .png
      let img = sharp(src).resize(opt.size);
      if (opt.noAlphaChannel) {
        img = img.flatten();
      }
      await img.toFile(dest);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(chalk.red(`Error converting file "${dest}": ${err}`));
  }
}

function runMap(
  map: Map<string, ImageOptions>,
  projectDir: string,
  iconFile: string,
  dryRun: boolean,
) {
  return Promise.all(
    Array.from(map).map(([dir, opt]) =>
      handleFile(iconFile, np.join(projectDir, dir), opt, dryRun, false),
    ),
  );
}

async function runOS(os: OS, projectDir: string, iconFile: string, dryRun: boolean) {
  const map = osDict.get(os);
  if (!map) {
    throw new Error(`Unexpected OS ${os}`);
  }
  // eslint-disable-next-line no-console
  console.log(chalk.yellow(`=== ${OS[os]} ===`));
  await runMap(map, projectDir, iconFile, dryRun);
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
    $ npx update-flutter-app-icon ./flutter_proj/updateIcons.json
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
    if (config.raw && Array.isArray(config.raw)) {
      // eslint-disable-next-line no-console
      console.log(chalk.yellow('=== raw ==='));
      await Promise.all(
        config.raw.map((action) =>
          handleFile(
            resolveIconFile(action.icon),
            np.resolve(projectDir, action.out),
            { size: action.size },
            dryRun,
            true,
          ),
        ),
      );
    }
  } catch (err) {
    const message = errMsg(err);
    logError(message);
  }
})();
