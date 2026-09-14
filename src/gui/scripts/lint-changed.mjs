import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const base = process.argv[2] ?? 'origin/main';
const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
const mergeBase = git('merge-base', base, 'HEAD').trim();
const files = [...new Set([
  ...git('diff', '--name-only', '--relative', '--diff-filter=ACMR', '-z', mergeBase, '--', '.').split('\0'),
  ...git('ls-files', '--others', '--exclude-standard', '-z', '--', '.').split('\0'),
])].filter(file => /\.(?:[cm]?js|jsx)$/.test(file));

if (files.length === 0) {
  console.log(`No changed JavaScript files relative to ${base}.`);
} else {
  console.log(`Linting ${files.length} changed files relative to ${base}:\n${files.join('\n')}`);
  const eslint = new ESLint({ cwd });
  const results = await eslint.lintFiles(files);
  const formatter = await eslint.loadFormatter('stylish');
  console.log(formatter.format(results));
  process.exitCode = results.some(result => result.errorCount > 0) ? 1 : 0;
}
