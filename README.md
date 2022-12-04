# autorelease

Automatically creates a release based on time and the presence of commits since the latest release.

## Configuring this action

To configure this action create a file in your `.github/workflows` directory:

```yaml
name: autorelease
on:
  schedule:
    # check at 11am every day
    - cron: "0 11 * * *"
jobs:
  autorelease:
    name: autorelease
    runs-on: ubuntu-latest
    steps:
      - name: autorelease
        uses: markelliot/autorelease@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # maximum number of days since last release
          max-days: 7
```

Note

- This action works when the versioning scheme matches the pattern `^\d+\.\d+\.\d+$`.
- A new release will only be created if there exists at least one prior release and there have been commits since the last release.
