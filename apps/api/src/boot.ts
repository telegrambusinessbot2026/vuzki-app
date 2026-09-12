// Temporary startup diagnostic (approved): emits api_boot_begin and installs
// process-level error handlers BEFORE any app/config module is evaluated.
// Only error name/message/stack is logged - never environment variables.

const isoNow = () => new Date().toISOString();

// Step 1 - very early marker: proves the process started and reached the main
// module, before ./config (and anything that imports it) is evaluated.
process.stdout.write(
  JSON.stringify({ time: isoNow(), level: 'info', msg: 'api_boot_begin', service: 'vuzki-api' }) + '\n'
);

// Step 2 - very early process handlers. A config-load failure (e.g. the
// production fail-fast in config/index.ts) throws at module load, which arrives
// here as uncaughtException. Log name/message/stack only, then exit(1) to
// preserve the previous fail-fast behavior.
function describeError(reason: unknown) {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  return { name: err.name, message: err.message, stack: err.stack ?? '' };
}

process.on('uncaughtException', (err) => {
  process.stderr.write(
    JSON.stringify({
      time: isoNow(),
      level: 'fatal',
      msg: 'boot_uncaught_exception',
      service: 'vuzki-api',
      err: describeError(err),
    }) + '\n'
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  process.stderr.write(
    JSON.stringify({
      time: isoNow(),
      level: 'error',
      msg: 'boot_unhandled_rejection',
      service: 'vuzki-api',
      err: describeError(reason),
    }) + '\n'
  );
  process.exit(1);
});