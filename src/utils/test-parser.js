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

  core.debug(`report.json ${reportExists(report) ? 'exists' : "doesn't exist"}`);

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
    totalPassed: 0,
    totalSkipped: 0,
    totalWarnings: 0,
    totalFailed: 0
  };

  const reports = Array.isArray(data) ? data : [data];

  for (const report of reports) {
    if (reportExists(report)) {
      const stats = report.stats;

      if (stats.tests > 0) {
        const passed = stats.tests === stats.passes;
        result.status = passed ? Status.PASSED : Status.FAILED;
      }

      result.timeStart = formatDate(stats.start);
      result.timeStop = formatDate(stats.end);

      result.totalPassed += stats.passes;
      result.totalFailed += stats.failures;
    }
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

  let timeStart = formatDate(Date.now());
  let timeStop = formatDate(Date.now());
  if (reportExists(report)) {
    timeStart = formatDate(report.startTime);
    const lastTest = report.testResults[report.testResults.length - 1];
    if (lastTest.endTime) timeStop = formatDate(lastTest.endTime);
  }

  core.debug(`Successfully parsed Jest test report file.`);

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

module.exports = { parseReport };
