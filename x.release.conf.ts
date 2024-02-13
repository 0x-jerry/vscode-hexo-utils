import { defineConfig, InternalReleaseTask } from '@0x-jerry/x-release';

export default defineConfig({
  sequence: [
    InternalReleaseTask.updatePkg,
    InternalReleaseTask.commit,
    InternalReleaseTask.tag,
    InternalReleaseTask.push,
  ],
});
