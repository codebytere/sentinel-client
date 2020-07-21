const { promises: asyncfs, existsSync } = require('fs');
const core = require('@actions/core');

const formatDate = (date) => {
  return new Date(date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
};

const Status = {
  PASSED: 'Passed',
  FAILED: 'Failed'
};

const reportExists = (report) => Object.keys(report).length !== 0;

async function parseReport(reportPath) {
  let report = {};
  if (existsSync(reportPath)) {
    const rawData = await asyncfs.readFile(reportPath, 'utf8');
    report = JSON.parse(rawData);
  }

  core.debug(`report.json ${reportExists ? 'exists' : "doesn't exist"}`);

  let status = Status.FAILED;
  if (reportExists && report.numTotalTests > 0) {
    const passed = report.numTotalTests === report.numPassedTests;
    status = passed ? Status.PASSED : Status.FAILED;
  }

  let timeStart = formatDate(Date.now());
  let timeStop = formatDate(Date.now());
  if (reportExists(report)) {
    timeStart = formatDate(report.startTime);
    const lastTest = report.testResults[report.testResults.length - 1];
    if (lastTest.endTime) timeStop = formatDate(lastTest.endTime);
  }

  core.debug(`Successfully parsed test report file.`);

  return {
    status,
    timeStart,
    timeStop,
    totalPassed: reportExists(report) ? report.numPassedTests : 0,
    totalSkipped: reportExists(report) ? report.numTodoTests : 0,
    totalWarnings: 0,
    totalFailed: reportExists(report) ? report.numFailedTests : 0
  };
}

module.exports = {
  parseReport
};