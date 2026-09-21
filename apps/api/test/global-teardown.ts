import type { spawn } from 'node:child_process';

type GlobalWithDb = typeof globalThis & {
  __SGEE_TEST_DB__?: ReturnType<typeof spawn>;
};

export default function globalTeardown() {
  (globalThis as GlobalWithDb).__SGEE_TEST_DB__?.kill();
}
