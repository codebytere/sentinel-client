const core = require('@actions/core')
const github = require('@actions/github')
const fetch = require('node-fetch')

const { inspect } = require('util')
const { promises: fs } = require('fs')
const path = require('path')
const os = require('os')

function testAgent() {
  return {
    arch: os.arch(),
    platform: os.platform(),
    cpus: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      speed: os.cpus()[0].speed
    },
    freeMem: os.freemem(),
    release: os.release(),
    totalMem: os.totalmem(),
    type: os.type(),
    endianness: os.endianness()
  }
}

async function run() {
  try {
    const clientPayload = github.context.payload.client_payload

    core.debug(`clientPayload: ${inspect(clientPayload)}`)
    const { platformInstallData, reportCallback, sessionToken, name } = clientPayload

    const reportPath = path.resolve('report', 'report.json')
    const rawData = await fs.readFile(reportPath, 'utf8')
    const report = JSON.parse(rawData)
    core.debug(`report: ${inspect(report)}`);

    const sysData = platformInstallData.platform.split('-')
    const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    const getRandomInt = (max) => Math.floor(Math.random() * Math.floor(max))
    const statuses = ['Passed', 'Failed', 'Skipped']

    const testData = {
      name: `${platformInstallData.platform}-${Date.now()}`,
      status: statuses[Math.floor(Math.random() * 3)],
      os: sysData[0],
      arch: sysData[1],
      sourceLink: `https://www.${name}.com`,
      timeStart: date,
      timeStop: date,
      totalPassed: getRandomInt(25),
      totalSkipped: getRandomInt(25),
      totalWarnings: getRandomInt(25),
      totalFailed: getRandomInt(25),
      workspaceGzipLink: `https://www.${name}.com`,
      logfileLink: `https://www.${name}.com`,
      ciLink: `https://www.${name}.com`,
      testAgent: testAgent()
    }

    core.info(`Sending Test Run Data to: ${reportCallback}`)
    await fetch(reportCallback, {
      method: 'POST',
      headers: {
        'sessionId': sessionToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    core.info('Test Run Data sent successfully')
  } catch (error) {
    core.debug(inspect(error))
    core.setFailed(error.message)
  }
}

run()