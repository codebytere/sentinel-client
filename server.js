const fastify = require('fastify')
const shortid = require('shortid')
const semver = require('semver')
const { request } = require("@octokit/request");

const fast = fastify({ logger: true })

fast.get('/', async (req, res) => {
  res.send('Client Endpoint Up')
})

fast.post('/fiddle', async req => {
  const {
    platformInstallData,
    reportCallback,
    versionQualifier
  } = req.body
  
  let minimumVersion = process.env.MINIMUM_ELECTRON_VERSION
  if (!minimumVersion || !semver.valid(minimumVersion)) {
    fast.log.error('MINIMUM_ELECTRON_VERSION env var invalid or not set')
    return
  } else {
    minimumVersion = semver.clean(minimumVersion)
  }

  const sessionToken = shortid.generate()

  if (!semver.gte(versionQualifier, minimumVersion)) {
    return { reportsExpected: 0, sessionToken }
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN

  request(`POST /repos/${owner}/${repo}/dispatches`,
    {
      headers: { authorization: `token ${token}` },
      event_type: 'generate-sentinel-report',
      client_payload: {
        sessionToken,
        reportCallback,
        versionQualifier,
        platformInstallData,
        name: process.env.GITHUB_REPO
      },
    }
  );

  return { reportsExpected: 1, sessionToken }
})

const start = async () => {
  const { PORT = 3000, HOST = '0.0.0.0' } = process.env

  try {
    await fast.listen({ port: PORT, host: HOST })
    fast.log.info(`server listening on ${fast.server.address().port}`)
  } catch (error) {
    fast.log.error(error)
  }
}

start()