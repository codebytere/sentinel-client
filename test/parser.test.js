const { expect } = require('chai');
const { parseReport } = require('../src/utils/test-parser');
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
      timeStart: '2020-07-17 21:01:19',
      timeStop: '2020-07-17 21:02:05',
      totalPassed: 619,
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
      totalPassed: 140,
      totalSkipped: 0,
      totalWarnings: 0,
      totalFailed: 0
    };

    expect(parsed).to.deep.equal(expected);
  });
});
