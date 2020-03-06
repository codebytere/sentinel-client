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

    const { platformInstallData, reportCallback, sessionToken, name } = clientPayload

    const reportPath = path.resolve('report', 'report.json')
    const rawData = await fs.readFile(reportPath, 'utf8')
    const report = JSON.parse(rawData)

    const sysData = platformInstallData.platform.split('-')
    const lastTest = report.testResults[report.testResults.length - 1]

    const testData = {
      name: `${name}-${platformInstallData.platform}-${Date.now()}`,
      status: report.status ? 'Passed' : 'Failed',
      os: sysData[0],
      arch: sysData[1],
      sourceLink: 'https://github.com/electron/fiddle',
      timeStart: new Date(report.timeStart),
      timeStop: new Date(lastTest.endTime),
      totalPassed: report.numPassedTests,
      totalSkipped: report.numTodoTests,
      totalWarnings: 0,
      totalFailed: report.numFailedTests,
      workspaceGzipLink: 'N/A',
      logfileLink: 'N/A',
      ciLink: 'N/A',
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