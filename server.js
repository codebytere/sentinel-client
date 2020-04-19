const fastify = require('fastify')
const shortid = require('shortid')
const semver = require('semver')
const { request } = require('@octokit/request')

const fast = fastify({ logger: true })

const {
  GITHUB_TOKEN,
  MINIMUM_ELECTRON_VERSION,
  PORT = 3000,
  HOST = '0.0.0.0',
  S3_BUCKET_NAME,
  S3_BUCKET_ACCESS_ID,
  S3_BUCKET_ACCESS_KEY,
} = process.env

function getHostOS(platform) {
  const ACTIONS_OPTIONS = {
    windows: 'windows-latest',
    macos: 'macos-latest',
    linux: 'ubuntu-latest',
  }

  if (['win32-ia32', 'win32-x64'].includes(platform)) {
    return ACTIONS_OPTIONS.windows
  } else if (['darwin-x64', 'mas-x64'].includes(platform)) {
    return ACTIONS_OPTIONS.macos
  } else if (['linux-ia32', 'linux-x64'].includes(platform)) {
    return ACTIONS_OPTIONS.linux
  }
}

function handleDispatch(req, repoSlug) {
  const { platformInstallData, reportCallback, versionQualifier } = req.body

  const [GITHUB_OWNER, GITHUB_REPO] = repoSlug.split('/')

  let minimumVersion = MINIMUM_ELECTRON_VERSION
  if (!MINIMUM_ELECTRON_VERSION || !semver.valid(minimumVersion)) {
    fast.log.error('MINIMUM_ELECTRON_VERSION env var invalid or not set')
    return
  } else {
    minimumVersion = semver.clean(minimumVersion)
  }

  const sessionToken = shortid.generate()

  if (!semver.gte(versionQualifier, minimumVersion)) {
    return { reportsExpected: 0, sessionToken }
  }

  fast.log.info('BUCKET NAME: ', S3_BUCKET_NAME)
  fast.log.info(`generate-sentinel-report-${GITHUB_REPO}`)

  request(`POST /repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`, {
    headers: { authorization: `token ${GITHUB_TOKEN}` },
    event_type: `generate-sentinel-report-${GITHUB_REPO}`,
    client_payload: {
      hostOS: getHostOS(platformInstallData.platform),
      sessionToken,
      reportCallback,
      versionQualifier,
      platformInstallData,
      name: GITHUB_REPO,
      s3Credentials: {
        S3_BUCKET_NAME,
        S3_BUCKET_ACCESS_ID,
        S3_BUCKET_ACCESS_KEY,
      },
    },
  })

  return { reportsExpected: 1, sessionToken }
}

fast.get('/', async (req, res) => {
  res.send('Client Endpoint Up')
})

fast.post('/vscode', async (req) => handleDispatch(req, 'codebytere/vscode'))

fast.post('/fiddle', async (req) => handleDispatch(req, 'codebytere/fiddle'))

const start = async () => {
  try {
    await fast.listen({ port: PORT, host: HOST })
    fast.log.info(`server listening on ${fast.server.address().port}`)
  } catch (error) {
    fast.log.error(error)
  }
}

start()
