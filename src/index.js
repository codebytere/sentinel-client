const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

const { inspect } = require('util');
const { promises: asyncfs, existsSync } = require('fs');
const path = require('path');

const { fetchLogFile } = require('./utils/logfile-util');
const { testAgent } = require('./utils/testagent-util');

const { GITHUB_TOKEN, GITHUB_RUN_ID, GITHUB_REPOSITORY } = process.env;

const Status = {
  PASSED: 'Passed',
  FAILED: 'Failed',
};

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
    core.debug(`Report Path is: ${reportPath}`);

    let report = {};
    if (existsSync(reportPath)) {
      const rawData = await asyncfs.readFile(reportPath, 'utf8');
      report = JSON.parse(rawData);
    }

    const reportExists = Object.keys(report).length !== 0;
    core.debug(`report.json ${reportExists ? 'exists' : "doesn't exist"}`);

    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    };

    const sysData = platformInstallData.platform.split('-');
    const runName = `${name}-${platformInstallData.platform}-${Date.now()}`;

    const logfileLink = await fetchLogFile(octokit, runName);
    const ciLink = `https://github.com/${GITHUB_REPOSITORY}/runs/${GITHUB_RUN_ID}`;
    const sourceLink = `https://github.com/${GITHUB_REPOSITORY}`;

    let status = Status.FAILED;
    if (reportExists && report.numTotalTests > 0) {
      const passed = report.numTotalTests === report.numPassedTests;
      status = passed ? Status.PASSED : Status.FAILED;
    }

    let timeStart = formatDate(Date.now());
    let timeStop = formatDate(Date.now());
    if (reportExists) {
      timeStart = formatDate(report.startTime);
      const lastTest = report.testResults[report.testResults.length - 1];
      timeStop = formatDate(lastTest.endTime);
    }

    const testData = {
      name: runName,
      status,
      os: sysData[0],
      arch: sysData[1],
      sourceLink,
      timeStart,
      timeStop,
      totalPassed: reportExists ? report.numPassedTests : 0,
      totalSkipped: reportExists ? report.numTodoTests : 0,
      totalWarnings: 0,
      totalFailed: reportExists ? report.numFailedTests : 0,
      logfileLink,
      ciLink,
      testAgent: testAgent(),
    };

    core.info(
      `Sending Test Run Data to Sentinel for ${platformInstallData.platform}`
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
        inspect(text)
      );
    }
  } catch (error) {
    core.debug(inspect(error));
    core.setFailed('Failed to send Test Run Data to Sentinel: ', error.message);
  }
}

run();
