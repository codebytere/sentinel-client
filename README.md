# Sentinel Client

This is a client for the [Sentinel Service](https://github.com/codebytere/sentinel) used to run Electron
apps against new versions of Electron in order to see early warning signs for breakages.

## To Use

To add Sentinel reporting to your app, you will need to configure
a GitHub Action to run your app's tests against updated versions of Electron and send a test report to the service.

The GitHub Action to add to your app's repository can be found in
[`generate_sentinel_report.yml`](https://github.com/codebytere/sentinel-client/blob/master/generate_sentinel_report.yml).
