const hash = require('string-hash');
const { ACTIONS_OPTIONS, PLATFORMS } = require('../../constants');

// Map architectures to GitHub Actions runner OS names.
function getHostOS(platform) {
  if (PLATFORMS.WINDOWS.includes(platform)) {
    return ACTIONS_OPTIONS.WINDOWS;
  } else if (PLATFORMS.MACOS.includes(platform)) {
    return ACTIONS_OPTIONS.MACOS;
  } else if (PLATFORMS.LINUX.includes(platform)) {
    return ACTIONS_OPTIONS.LINUX;
  }
}

// Return the human-readable name for a given platform.
function getFriendlyName(platform) {
  switch (platform) {
    case ACTIONS_OPTIONS.WINDOWS:
      return 'windows';
    case ACTIONS_OPTIONS.MACOS:
      return 'macos';
    case ACTIONS_OPTIONS.LINUX:
      return 'linux';
    default:
      throw new Error(`Unrecognized platform ${platform}`)
  }
}

// Generate a session token unique to the version, commit, and registrant.
function generateSessionToken(sha, version, slug) {
  const versionHash = hash(version);
  const slugHash = hash(slug);
  return `${sha}-${versionHash}-${slugHash}`;
}

module.exports = {
  generateSessionToken,
  getFriendlyName,
  getHostOS
};
