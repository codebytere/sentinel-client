const aws = require('aws-sdk');
const github = require('@actions/github');
const fetch = require('node-fetch');

async function fetchLogFile(octokit, fileName) {
  const {
    GITHUB_RUN_ID,
    GITHUB_TOKEN,
    S3_BUCKET_NAME,
    S3_BUCKET_ACCESS_ID,
    S3_BUCKET_ACCESS_KEY,
  } = process.env;

  // Fetch commit sha corresponding to nightly tag.
  const { owner, repo } = github.context.repo;
  const S3_URL_BASE = `https://s3.amazonaws.com/${S3_BUCKET_NAME}`;

  // Initialize S3 client.
  const s3 = new aws.S3({
    accessKeyId: S3_BUCKET_ACCESS_ID,
    secretAccessKey: S3_BUCKET_ACCESS_KEY,
  });

  // Fetch jobs for this workflow run.
  const {
    data: { jobs },
  } = await octokit.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: GITHUB_RUN_ID,
  });

  // Fetch URL for logs corresponding to CI job.
  const { url } = await octokit.actions.listWorkflowJobLogs({
    owner,
    repo,
    job_id: jobs[0].id,
  });

  // Fetch the logs themselves.
  const logData = await fetch(url, {
    headers: {
      Authorization: `bearer ${GITHUB_TOKEN}`,
    },
  }).then((resp) => resp.text());

  // Upload logs file to S3 bucket.
  await new Promise((resolve, reject) =>
    s3.putObject(
      {
        Bucket: S3_BUCKET_NAME,
        Key: `logs/${fileName}`,
        Body: logData,
        ACL: 'public-read',
      },
      (err, data) => {
        if (err) return reject(err);
        resolve();
      },
    ),
  );

  return `${S3_URL_BASE}/logs/${fileName}`;
}

module.exports = { fetchLogFile };
