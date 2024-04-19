import { createRequire } from 'module';
import { join } from 'path';

const supportedMatrix = {
  win32: {
    x64: {
      msvc: true,
    },
    arm64: {
      msvc: true,
    },
    ia32: {
      msvc: true,
    },
  },
  darwin: {
    x64: true,
    arm64: true,
    universal: true,
  },
  linux: {
    x64: {
      gnu: true,
      musl: true,
    },
    arm64: {
      gnu: true,
      musl: true,
    },
    arm: {
      gnueabihf: true,
      musleabihf: true,
    },
    riscv64: {
      gnu: true,
    },
  },
};

function isMusl() {
  const { glibcVersionRuntime } = process.report?.getReport().header;
  return !glibcVersionRuntime;
}

function getAddonName() {
  const { platform, arch } = process;

  let abi = '';
  if (platform === 'win32') {
    abi = 'msvc';
  } else if (platform === 'linux') {
    const _isMusl = isMusl();
    if (_isMusl) {
      abi = 'musl';
    } else {
      abi = 'gun';
    }
    if (arch === 'arm') {
      abi += 'eabihf';
    }
  }

  const names = [platform, arch, abi].filter(Boolean);
  const isSupport = getProperty(supportedMatrix, names);

  if (isSupport === true) {
    return names.join('-');
  }

  return false;
}

function getProperty(obj, keys) {
  const [key, ...rest] = keys;

  return rest.length ? getProperty(obj?.[key], rest) : obj?.[key];
}

function loadAddon() {
  const addonFolder = join(__dirname, '../addons/clipboard-rs');
  const pkgName = 'clipboard-rs';
  const addonName = getAddonName();

  if (!addonName) {
    const { platform, arch } = process;
    console.log(`clipboard-rs not support on platform: ${platform}-${arch}`);
    return {
      supported: false,
    };
  }

  const addonPath = join(addonFolder, `${pkgName}.${addonName}.node`);

  const bindings = createRequire(__filename)(addonPath);

  return bindings;
}

const bindings = loadAddon();

const { readText, readFiles, readImage, writeText, writeFiles, writeImage, supported = true } = bindings;
export { readText, readFiles, readImage, writeText, writeFiles, writeImage, supported };
