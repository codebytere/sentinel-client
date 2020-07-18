const fastify = require('fastify');
const semver = require('semver');
const hash = require('string-hash');
const { request } = require('@octokit/request');

const {
  ACTIONS_OPTIONS,
  CHANNELS,
  PLATFORMS,
  GITHUB_TOKEN,
  MINIMUM_ELECTRON_VERSION,
  PORT,
  HOST,
  S3_BUCKET_NAME,
  S3_BUCKET_ACCESS_ID,
  S3_BUCKET_ACCESS_KEY
} = require('./constants');

const fast = fastify({ logger: true });

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

const isNightly = (v) => v.contains('nightly');
const isBeta = (v) => v.contains('beta');

// Generate a session token unique to the version, commit, and registrant.
function generateSessionToken(sha, version, slug) {
  const versionHash = hash(version);
  const slugHash = hash(slug);
  return `${sha}-${versionHash}-${slugHash}`;
}

// Trigger CI runs on a specific registrant and send initial data to Sentinel.
function handleDispatch(req, repoSlug, isOSS = false) {
  const {
    platformInstallData,
    reportCallback,
    versionQualifier,
    commitHash
  } = req.body;

  let [owner, repo] = repoSlug.split('/');
  const hostOS = getHostOS(platformInstallData.platform);
  const dispatchLocation = isOSS
    ? `codebytere/sentinel-oss`
    : `${owner}/${repo}`;

  let minimumVersion = MINIMUM_ELECTRON_VERSION;
  if (!MINIMUM_ELECTRON_VERSION || !semver.valid(minimumVersion)) {
    fast.log.error('MINIMUM_ELECTRON_VERSION env var invalid or not set');
    return;
  } else {
    minimumVersion = semver.clean(minimumVersion);
  }

  // We need to ensure the session token is unique but also the same across different
  // platforms for a single registrant-specific Sentinel report.
  const sessionToken = generateSessionToken(
    commitHash,
    versionQualifier,
    repoSlug
  );

  // For OSS apps, check lookup table and bail early if this release
  // is not one a given OSS app has registered for.
  if (isOSS) {
    const apps = require('./oss-apps.json');
    if (!apps[repo]) {
      fast.log.error(`Could not find ${repo} in lookup table`);
      return { reportsExpected: 0, sessionToken };
    }

    const platforms = apps[repo].platforms;
    const platform = hostOS.substring(0, hostOS.indexOf('-'));
    if (!platforms.includes(platform)) {
      fast.log.info(`${repo} is not registered for ${platform}`);
      return { reportsExpected: 0, sessionToken };
    }

    const channels = apps[repo].channels;
    if (isNightly && !channels.includes(CHANNELS.NIGHTLY)) {
      fast.log.info(`${repo} is not registered for nightly versions`);
      return { reportsExpected: 0, sessionToken };
    } else if (isBeta && !channels.includes(CHANNELS.BETA)) {
      fast.log.info(`${repo} is not registered for beta versions`);
      return { reportsExpected: 0, sessionToken };
    } else if (!channels.includes(CHANNELS.STABLE)) {
      fast.log.info(`${repo} is not registered for stable versions`);
      return { reportsExpected: 0, sessionToken };
    }
  }

  if (!semver.gte(versionQualifier, minimumVersion)) {
    return { reportsExpected: 0, sessionToken };
  }

  fast.log.info('BUCKET NAME: ', S3_BUCKET_NAME);
  fast.log.info(`generate-sentinel-report-${repo}`);

  request(`POST /repos/${dispatchLocation}/dispatches`, {
    headers: { authorization: `token ${GITHUB_TOKEN}` },
    event_type: `generate-sentinel-report-${repo}`,
    client_payload: {
      hostOS,
      sessionToken,
      reportCallback,
      versionQualifier,
      platformInstallData,
      name: repo,
      s3Credentials: {
        S3_BUCKET_NAME,
        S3_BUCKET_ACCESS_ID,
        S3_BUCKET_ACCESS_KEY
      }
    }
  });

  return { reportsExpected: 1, sessionToken };
}

fast.get('/', async (req, res) => {
  res.send('Client Endpoint Up');
});

fast.post('/gitify', async (req) =>
  handleDispatch(req, 'manosim/gitify', true)
);

fast.post('/fiddle', async (req) =>
  handleDispatch(req, 'electron/fiddle', true)
);

fast.post('/vscode', async (req) => handleDispatch(req, 'codebytere/vscode'));

const start = async () => {
  try {
    await fast.listen({ port: PORT, host: HOST });
    fast.log.info(`server listening on ${fast.server.address().port}`);
  } catch (error) {
    fast.log.error(error);
  }
};

start();
