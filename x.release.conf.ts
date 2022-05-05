import { defineConfig, InternalReleaseTask } from '@0x-jerry/x-release';

export default defineConfig({
  sequence: [
    'npm:changelog',
    'run:git add CHANGELOG.md',
    InternalReleaseTask.updatePkg,
    InternalReleaseTask.commit,
    InternalReleaseTask.tag,
    InternalReleaseTask.push,
  ],
});
