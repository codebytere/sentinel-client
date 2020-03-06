const core = require('@actions/core')
const github = require('@actions/github')
const fetch = require('node-fetch')
const { inspect } = require('util')

async function run() {
  try {
    const clientPayload = github.context.payload

    core.debug(`clientPayload: ${inspect(clientPayload)}`)
    const { platformData, reportCallback, sessionToken, name } = clientPayload

    const rawData = await fs.readFile('report.json', 'utf8')
    const report = JSON.parse(rawData)
    core.debug(`report: ${inspect(report)}`);

    const sysData = platformData.platform.split('-')
    const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    const getRandomInt = (max) => Math.floor(Math.random() * Math.floor(max))
    const statuses = ['Passed', 'Failed', 'Skipped']

    const testData = {
      name: `${platformData.platform}-${Date.now()}`,
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