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

const isTapReport = (report) =>
  report.hasOwnProperty('stats') && report.hasOwnProperty('asserts');

const isMochaReport = (report) =>
  report.hasOwnProperty('stats') && report.hasOwnProperty('tests');

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
    if (isTapReport(report[0])) {
      return parseTapReport(report);
    } else if (isMochaReport(report[0])) {
      return parseMochaReport(report);
    } else {
      return parseJestReport(report);
    }
  }

  if (isTapReport(report)) {
    return parseTapReport(report);
  } else if (isMochaReport(report)) {
    return parseMochaReport(report);
  }

  return parseJestReport(report);
}

async function parseTapReport(data) {
  core.debug('Parsing Tap report');

  const { stats } = data;

  const result = {
    status: Status.PASSED,
    timeStart: formatDate(Date.now()),
    timeStop: formatDate(Date.now()),
    totalTests: stats.asserts,
    totalPassed: stats.passes,
    totalSkipped: 0,
    totalWarnings: 0,
    totalFailed: stats.failures
  };

  if (stats.failures > 0) {
    result.status = Status.FAILED;
  }

  core.debug(`Successfully parsed Tap test report file.`);

  return result;
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

async function parseJestReport(data) {
  core.debug('Parsing Jest report');

  let status = Status.FAILED;
  if (data.numTotalTests > 0) {
    const passed = data.numTotalTests === data.numPassedTests;
    status = passed ? Status.PASSED : Status.FAILED;
  }

  let timeStart = formatDate(data.startTime);
  let timeStop = formatDate(Date.now());

  const lastTest = data.testResults[data.testResults.length - 1];
  if (lastTest.endTime) {
    timeStop = formatDate(lastTest.endTime);
  }

  core.debug(`Successfully parsed Jest test report file.`);

  return {
    status,
    timeStart,
    timeStop,
    totalTests: data.numTotalTests,
    totalPassed: data.numPassedTests,
    totalSkipped: data.numTodoTests,
    totalWarnings: 0,
    totalFailed: data.numFailedTests
  };
}

module.exports = { parseReport, Status };
