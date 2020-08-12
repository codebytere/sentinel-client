const fastify = require('fastify');
const semver = require('semver');
const { request } = require('@octokit/request');

const {
  CHANNELS,
  GITHUB_TOKEN,
  MINIMUM_ELECTRON_VERSION,
  PORT,
  HOST,
  S3_BUCKET_NAME,
  S3_BUCKET_ACCESS_ID,
  S3_BUCKET_ACCESS_KEY
} = require('./constants');
const {
  generateSessionToken,
  getFriendlyName,
  getHostOS
} = require('./src/utils/server-util');

const fast = fastify({ logger: true });

const isNightly = (v) => v.includes('nightly');
const isBeta = (v) => v.includes('beta');

// Trigger CI runs on a specific registrant and send initial data to Sentinel.
async function handleDispatch(req, repoSlug, isOSS = false) {
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

    const { platforms } = apps[repo];
    const platform = getFriendlyName(hostOS);
    if (!platforms.includes(platform)) {
      fast.log.info(`${repo} is not registered for ${platform}`);
      return { reportsExpected: 0, sessionToken };
    }

    const channels = apps[repo].channels;
    if (isNightly(versionQualifier) && !channels.includes(CHANNELS.NIGHTLY)) {
      fast.log.info(`${repo} is not registered for nightly versions`);
      return { reportsExpected: 0, sessionToken };
    } else if (isBeta(versionQualifier) && !channels.includes(CHANNELS.BETA)) {
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

  const result = await request(`POST /repos/${dispatchLocation}/dispatches`, {
    headers: { authorization: `token ${GITHUB_TOKEN}` },
    event_type: `generate-sentinel-report-${repo}`,
    client_payload: {
      hostOS,
      sessionToken,
      reportCallback,
      versionQualifier,
      platformInstallData,
      repoSlug,
      s3Credentials: {
        S3_BUCKET_NAME,
        S3_BUCKET_ACCESS_ID,
        S3_BUCKET_ACCESS_KEY
      }
    }
  });

  if (result.status !== 200) {
    fast.log.error(`Failed to trigger workflow for ${repo}: `, result.data);
  } else {
    fast.log.info(`Successfully triggered workflow for ${repo}`);
  }

  return { reportsExpected: 1, sessionToken };
}

fast.get('/', async (req, res) => {
  res.send('Client Endpoint Up');
});

fast.post(
  '/gitify',
  async (req) => await handleDispatch(req, 'manosim/gitify', true)
);

fast.post(
  '/fiddle',
  async (req) => await handleDispatch(req, 'electron/fiddle', true)
);

fast.post(
  '/vscode',
  async (req) => await handleDispatch(req, 'microsoft/vscode', true)
);

fast.post(
  '/kap',
  async (req) => await handleDispatch(req, 'wulkano/kap', true)
);

const start = async () => {
  try {
    await fast.listen({ port: PORT, host: HOST });
    fast.log.info(`server listening on ${fast.server.address().port}`);
  } catch (error) {
    fast.log.error(error);
  }
};

start();
