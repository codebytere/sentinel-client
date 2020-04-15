const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

const { inspect } = require('util');
const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');

function testAgent() {
  return {
    arch: os.arch(),
    platform: os.platform(),
    cpus: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      speed: os.cpus()[0].speed,
    },
    freeMem: os.freemem(),
    release: os.release(),
    totalMem: os.totalmem(),
    type: os.type(),
    endianness: os.endianness(),
  };
}

async function run() {
  try {
    const clientPayload = github.context.payload.client_payload;

    const { platformInstallData, reportCallback, sessionToken, name } = clientPayload;

    const reportPath = path.resolve('report', 'report.json');
    const rawData = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(rawData);

    const sysData = platformInstallData.platform.split('-');
    const lastTest = report.testResults[report.testResults.length - 1];

    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    };

    const testData = {
      name: `${name}-${platformInstallData.platform}-${Date.now()}`,
      status: report.numPassedTests === report.numTotalTests ? 'Passed' : 'Failed',
      os: sysData[0],
      arch: sysData[1],
      sourceLink: 'https://example.com',
      timeStart: formatDate(report.startTime),
      timeStop: formatDate(lastTest.endTime),
      totalPassed: report.numPassedTests,
      totalSkipped: report.numTodoTests,
      totalWarnings: 0,
      totalFailed: report.numFailedTests,
      logfileLink: 'https://example.com',
      ciLink: 'https://example.com',
      testAgent: testAgent(),
    };

    core.info(`Sending Test Run Data to Sentinel for ${platformInstallData.platform}`);
    const result = await fetch(reportCallback, {
      method: 'POST',
      headers: {
        Authorization: sessionToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const text = await result.text();
    core.debug(inspect(text));

    if (result.status === 200) {
      core.info('Test Run Data sent successfully');
    } else {
      core.setFailed('Failed to send Test Run Data to Sentinel: ', inspect(text));
    }
  } catch (error) {
    core.debug(inspect(error));
    core.setFailed('Failed to send Test Run Data to Sentinel: ', error.message);
  }
}

run();
