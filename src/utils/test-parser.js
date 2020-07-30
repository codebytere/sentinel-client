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
  core.debug(`Parsing Report at ${reportPath}`);

  const empty = {
    status: Status.FAILED,
    timeStart: formatDate(Date.now()),
    timeStop: formatDate(Date.now()),
    totalTests: 0,
    totalPassed: 0,
    totalSkipped: 0,
    totalWarnings: 0,
    totalFailed: 0
  };

  let report = {};
  if (existsSync(reportPath)) {
    const rawData = await asyncfs.readFile(reportPath, 'utf8');
    report = JSON.parse(rawData);
  } else {
    core.debug('report.json does not exist');
    return empty;
  }

  if (!reportExists(report)) {
    core.debug('report.json has no data');
    return empty;
  }

  if (Array.isArray(report)) {
    core.debug('Report file contains multiple reports');
    return report[0].stats ? parseMochaReport(report) : parseJestReport(report);
  }

  return report.stats ? parseMochaReport(report) : parseJestReport(report);
}

async function parseMochaReport(data) {
  core.debug('Parsing Mocha report');

  const result = {
    status: Status.PASSED,
    timeStart: formatDate(Date.now()),
    timeStop: formatDate(Date.now()),
    totalTests: 0,
    totalPassed: 0,
    totalSkipped: 0,
    totalWarnings: 0,
    totalFailed: 0
  };

  const reports = Array.isArray(data) ? data : [data];

  for (const report of reports) {
    const stats = report.stats;

    if (stats.failures > 0) {
      result.status = Status.FAILED;
    }

    result.timeStart = formatDate(stats.start);
    result.timeStop = formatDate(stats.end);

    result.totalTests += stats.tests;
    result.totalPassed += stats.passes;
    result.totalFailed += stats.failures;
  }

  core.debug(`Successfully parsed Mocha test report file.`);

  return result;
}

async function parseJestReport(report) {
  core.debug('Parsing Jest report');

  let status = Status.FAILED;
  if (reportExists && report.numTotalTests > 0) {
    const passed = report.numTotalTests === report.numPassedTests;
    status = passed ? Status.PASSED : Status.FAILED;
  }

  let timeStart = formatDate(report.startTime);
  let timeStop = formatDate(Date.now());

  const lastTest = report.testResults[report.testResults.length - 1];
  if (lastTest.endTime) {
    timeStop = formatDate(lastTest.endTime);
  }

  core.debug(`Successfully parsed Jest test report file.`);

  return {
    status,
    timeStart,
    timeStop,
    totalTests: report.numTotalTests,
    totalPassed: report.numPassedTests,
    totalSkipped: report.numTodoTests,
    totalWarnings: 0,
    totalFailed: report.numFailedTests
  };
}

module.exports = { parseReport };
