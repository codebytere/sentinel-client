const { expect } = require('chai');
const { parseReport, Status } = require('../src/utils/test-parser');
const path = require('path');

describe('Test report parsing', () => {
  it('can parse a mocha report', async () => {
    const mochaReportPath = path.resolve(
      __dirname,
      'fixtures',
      'mocha.report.json'
    );
    const parsed = await parseReport(mochaReportPath);

    const expected = {
      status: 'Passed',
      timeStart: '2020-07-28 06:16:11',
      timeStop: '2020-07-28 06:16:11',
      totalTests: 21,
      totalPassed: 21,
      totalSkipped: 0,
      totalWarnings: 0,
      totalFailed: 0
    };

    expect(parsed).to.deep.equal(expected);
  });

  it('can parse a multiple mocha report', async () => {
    const mochaReportPath = path.resolve(
      __dirname,
      'fixtures',
      'mocha.array.report.json'
    );
    const parsed = await parseReport(mochaReportPath);

    const expected = {
      status: 'Passed',
      timeStart: '2020-07-28 06:16:11',
      timeStop: '2020-07-28 06:16:11',
      totalTests: 42,
      totalPassed: 42,
      totalSkipped: 0,
      totalWarnings: 0,
      totalFailed: 0
    };

    expect(parsed).to.deep.equal(expected);
  });

  it('can parse a jest report', async () => {
    const mochaReportPath = path.resolve(
      __dirname,
      'fixtures',
      'jest.report.json'
    );
    const parsed = await parseReport(mochaReportPath);

    const expected = {
      status: 'Passed',
      timeStart: '2020-07-17 20:51:41',
      timeStop: '2020-07-17 20:51:59',
      totalTests: 140,
      totalPassed: 140,
      totalSkipped: 0,
      totalWarnings: 0,
      totalFailed: 0
    };

    expect(parsed).to.deep.equal(expected);
  });

  it('can parse a tap report', async () => {
    const tapReportPath = path.resolve(
      __dirname,
      'fixtures',
      'tap.report.json'
    );

    const parsed = await parseReport(tapReportPath);

    expect(parsed.totalTests).to.equal(24);
    expect(parsed.status).to.equal(Status.PASSED);
    expect(parsed.totalPassed).to.equal(24);
    expect(parsed.totalFailed).to.equal(0);
    expect(parsed.totalWarnings).to.equal(0);
    expect(parsed.totalSkipped).to.equal(0);
  });
});
