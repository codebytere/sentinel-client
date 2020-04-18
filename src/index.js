const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

const { inspect } = require('util');
const { promises: fs } = require('fs');
const path = require('path');

const { fetchLogFile } = require('./utils/logfile-util');
const { testAgent } = require('./utils/testagent-util');

const { GITHUB_TOKEN } = process.env;

async function run() {
  try {
    const {
      platformInstallData,
      reportCallback,
      sessionToken,
      name,
    } = github.context.payload.client_payload;

    // Authenticate Octokit.
    const octokit = new github.GitHub(GITHUB_TOKEN);

    const reportPath = path.resolve('report', 'report.json');
    const rawData = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(rawData);

    const sysData = platformInstallData.platform.split('-');
    const lastTest = report.testResults[report.testResults.length - 1];
    const runName = `${name}-${platformInstallData.platform}-${Date.now()}`;

    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    };

    const logfileLink = await fetchLogFile(octokit, runName);
    const ciLink = `https://github.com/${github.context.repository}/runs/${github.context.run_id}`;

    const testData = {
      name: runName,
      status:
        report.numPassedTests === report.numTotalTests ? 'Passed' : 'Failed',
      os: sysData[0],
      arch: sysData[1],
      sourceLink: 'https://example.com',
      timeStart: formatDate(report.startTime),
      timeStop: formatDate(lastTest.endTime),
      totalPassed: report.numPassedTests,
      totalSkipped: report.numTodoTests,
      totalWarnings: 0,
      totalFailed: report.numFailedTests,
      logfileLink,
      ciLink,
      testAgent: testAgent(),
    };

    core.info(
      `Sending Test Run Data to Sentinel for ${platformInstallData.platform}`,
    );
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
      core.setFailed(
        'Failed to send Test Run Data to Sentinel: ',
        inspect(text),
      );
    }
  } catch (error) {
    core.debug(inspect(error));
    core.setFailed('Failed to send Test Run Data to Sentinel: ', error.message);
  }
}

run();
