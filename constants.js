const PLATFORMS = {
  WINDOWS: ['win32-ia32', 'win32-x64', 'win32-arm64', 'win32-arm64-x64'],
  MACOS: ['darwin-x64', 'mas-x64'],
  LINUX: ['linux-armv7l', 'linux-arm64', 'linux-ia32', 'linux-x64'],
};

const ACTIONS_OPTIONS = {
  WINDOWS: 'windows-latest',
  MACOS: 'macos-latest',
  LINUX: 'ubuntu-latest',
};

const CHANNELS = {
  NIGHTLY: 'nightly',
  BETA: 'beta',
  STABLE: 'stable'
}

const {
  GITHUB_TOKEN,
  MINIMUM_ELECTRON_VERSION,
  PORT = 3000,
  HOST = '0.0.0.0',
  S3_BUCKET_NAME,
  S3_BUCKET_ACCESS_ID,
  S3_BUCKET_ACCESS_KEY,
} = process.env;

module.exports = {
  ACTIONS_OPTIONS,
  CHANNELS,
  PLATFORMS,
  GITHUB_TOKEN,
  MINIMUM_ELECTRON_VERSION,
  PORT,
  HOST,
  S3_BUCKET_NAME,
  S3_BUCKET_ACCESS_ID,
  S3_BUCKET_ACCESS_KEY,
};
