import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";

// milliseconds/second * seconds/minute * minutes/hour * hours/day = mlliseconds/day
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

// compatible with releases of the form <major>.<minor>.<patch>
const RELEASE_STYLE = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/;

export async function work(
  octokit: InstanceType<typeof GitHub>,
  maxDays: number,
  dryRun: boolean,
) {
  const context = github.context;

  const latestRelease = await octokit.rest.repos.getLatestRelease({
    ...context.repo,
  });
  if (latestRelease.data === undefined) {
    core.warning(
      "Unable to perform an autorelease if there are no prior releases.",
    );
    return;
  }
  const releaseAge = Math.floor(
    (Date.now() - Date.parse(latestRelease.data.created_at)) /
      MILLISECONDS_PER_DAY,
  );
  core.info(
    `Found latest release ${latestRelease.data.tag_name} from ${releaseAge} days ago`,
  );

  const releaseComponents = latestRelease.data.tag_name.match(RELEASE_STYLE);
  if (releaseComponents === null) {
    core.warning(
      `Unable to perform an autorelease because last release does not match required tag pattern <major>.<minor>.<patch> (${latestRelease.data.tag_name})`,
    );
    return;
  }

  // check that there have been changes since last release
  const commitsSinceLastRelease = await octokit.rest.repos.listCommits({
    ...context.repo,
    since: latestRelease.data.created_at,
  });
  if (
    commitsSinceLastRelease.data === undefined ||
    commitsSinceLastRelease.data.length < 2 // if non-empty
  ) {
    core.warning("No commits since last release");
    return;
  }
  core.info(
    `Found ${
      commitsSinceLastRelease.data.length - 1
    } commit(s) since latest release:\n` +
      commitsSinceLastRelease.data
        .slice(0, -1)
        .map(
          (commit) =>
            " " +
            commit.commit.committer?.date +
            " " +
            commit.sha +
            " " +
            commit.commit.message.split("\n")[0],
        )
        .join("\n"),
  );

  if (releaseAge < maxDays) {
    core.warning(
      "Skipping release because it has not been long enough between releases",
    );
    return;
  }

  const newTag = `${releaseComponents[1]}.${
    parseInt(releaseComponents[2]) + 1
  }.0`;
  core.info(`Creating a new release ${newTag}`);
  if (!dryRun) {
    await octokit.rest.repos.createRelease({
      ...context.repo,
      tag_name: newTag,
      name: newTag,
      generate_release_notes: true,
    });
  }
}

// map action parameters to useful work
async function run(): Promise<void> {
  try {
    const authToken = core.getInput("github-token");
    const maxDays = parseInt(core.getInput("max-days"));
    const octokit = github.getOctokit(authToken);
    work(octokit, maxDays, false);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
