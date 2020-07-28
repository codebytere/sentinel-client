const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

const { inspect } = require('util');
const path = require('path');

const { fetchLogFile } = require('./utils/logfile-util');
const { testAgent } = require('./utils/testagent-util');
const { parseReport } = require('./utils/test-parser');

const { GITHUB_TOKEN, GITHUB_RUN_ID, GITHUB_REPOSITORY } = process.env;

async function run() {
  try {
    const {
      platformInstallData,
      reportCallback,
      sessionToken,
      name
    } = github.context.payload.client_payload;

    // Authenticate Octokit.
    const octokit = new github.GitHub(GITHUB_TOKEN);

    const reportPath = path.resolve('report', 'report.json');
    core.debug(`Report Path is: ${reportPath}`);

    const parsedReport = await parseReport(reportPath);

    const sysData = platformInstallData.platform.split('-');
    const runName = `${name}-${platformInstallData.platform}-${Date.now()}`;

    const logfileLink = await fetchLogFile(octokit, runName);
    const ciLink = `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
    const sourceLink = `https://github.com/${GITHUB_REPOSITORY}`;

    const testData = {
      name: runName,
      os: sysData[0],
      arch: sysData[1],
      sourceLink,
      logfileLink,
      ciLink,
      testAgent: testAgent(),
      ...parsedReport
    };

    core.info(
      `Sending Test Run Data to Sentinel for ${platformInstallData.platform}`
    );
    const result = await fetch(reportCallback, {
      method: 'POST',
      headers: {
        Authorization: sessionToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
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
