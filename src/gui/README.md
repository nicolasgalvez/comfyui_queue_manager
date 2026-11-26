# Queue Manager GUI

The GUI is a React app built with Vite. It runs inside ComfyUI and can be developed with npm or Bun.

See the [development guide](../../DEVELOPMENT.md) for setup, building, automatic reload and checks.

## Browser regression tests

```sh
npm ci
npx playwright install chromium
npm test
```

`npm test` builds the frontend, serves it on a temporary localhost port and
intercepts every backend request, so nothing contacts ComfyUI. The delete
confirmation test checks Cancel and Confirm for individual, running, gallery,
bulk, and filtered deletions.

The failed-job test also checks that error details persist after a reload. The
backend side of that is covered by `tests/test_execution_errors.py`, run with
the other Python tests (`python -m pytest -q tests/` from the repository root).

## Lint changed files

`npm run lint` checks JavaScript files changed since the merge base with
`origin/main`, including staged, unstaged, and untracked files. Deleted files
and files outside this frontend are excluded. Fetch `origin/main` first.
Use `npm run lint -- <ref>` to choose another comparison base.
