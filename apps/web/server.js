'use strict';

// ============================================================================
// VUZKI consolidated single-process web server
//
// Serves the ENTIRE product from ONE Node process and ONE HTTP server:
//
//   httpServer
//   |-- Socket.IO            (/socket.io/*)  WebRTC signaling, chat, presence
//   |-- Express API          (/api/v1/*, /health, /ready, /uploads)
//   |-- Next.js (apps/web)   (/ , /features/*, /pricing, /safety, /blog,
//   |                         /auth/*, /app/*, /admin/*)
//
// Startup order matters:
//   1. http.createServer(dispatch) registers the forwarding handler FIRST.
//   2. createRealtimeServer(httpServer) attaches Socket.IO. engine.io captures
//      the request listeners present at attach time and forwards any request
//      that is NOT /socket.io to them (so Express/Next still receive traffic).
//   3. Next.js is prepared and its handler is called for all non-API routes.
//
// The worker loops (deletions / retention sweeps / stale-call finalization)
// run inside this same process via startWorkerLoops().
//
// Requirements: run `npm run build:consolidated` first so @vuzki/api has been
// compiled to dist/. Bind: 0.0.0.0:$PORT (Render injects PORT).
// ============================================================================

const http = require('http');
const path = require('path');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const DEV = process.env.NODE_ENV !== 'production';

// Keep Next.js pinned to the app that is built here (no standalone output).
const NEXT_DIR = __dirname;

// One public port, one HTTP server. Render injects PORT.
const PORT = parseInt(process.env.PORT || process.env.WEB_PORT || '3000', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

// ---------------------------------------------------------------------------
// Runtime dependencies (built by `npm run build:consolidated`).
// NOTE: importing @vuzki/api by its package entry is intentionally avoided
// (its main is dist/server.js which boots the API on its own); we import the
// individual compiled modules we need instead.
// ---------------------------------------------------------------------------
function requireApi(modulePath) {
  const resolved = require.resolve(`@vuzki/api/dist/${modulePath}.js`);
  return require(resolved);
}

function assertApiBuilt() {
  try {
    require.resolve('@vuzki/api/dist/app.js');
    require.resolve('@vuzki/api/dist/realtime/index.js');
    require.resolve('@vuzki/api/dist/worker-core.js');
  } catch (err) {
    console.error(
      '[consolidated-server] @vuzki/api is not compiled. Run "npm run build:consolidated" before starting.'
    );
    throw err;
  }
}

const next = require('next');

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------
const isApiPath = (pathname) =>
  pathname === '/health' ||
  pathname === '/ready' ||
  pathname === '/uploads' ||
  pathname.startsWith('/uploads/') ||
  pathname === '/api' ||
  pathname.startsWith('/api/');

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function bootstrap() {
  assertApiBuilt();

  const { createApp } = require('@vuzki/api/dist/app.js');
  const { createRealtimeServer } = require('@vuzki/api/dist/realtime/index.js');
  const { startWorkerLoops } = require('@vuzki/api/dist/worker-core.js');
  const { logger } = require('@vuzki/api/dist/middleware/logger.js');

  const expressApp = createApp();

  const nextApp = next({ dev: DEV, dir: NEXT_DIR, hostname: HOST, port: PORT });
  const nextHandler = nextApp.getRequestHandler();

  // -------------------------------------------------------------------------
  // ONE HTTP server. The dispatch handler is registered before Socket.IO is
  // attached (engine.io snapshots the existing request listeners).
  // -------------------------------------------------------------------------
  const httpServer = http.createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (isApiPath(pathname)) {
      expressApp(req, res);
    } else {
      nextHandler(req, res);
    }
  });

  // Socket.IO (WebRTC signaling, chat, presence, Talk Now matching). Handles
  // /socket.io* polls and WebSocket upgrades on the same HTTP server.
  const io = createRealtimeServer(httpServer);
  expressApp.set('io', io);

  await nextApp.prepare();

  // Worker loops (deletions, retention sweep, stale-call finalization).
  const workerLoops = startWorkerLoops();

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('consolidated_shutdown_initiated', { signal });

    const forceExit = setTimeout(() => {
      logger.error('consolidated_forced_exit_after_timeout', { timeoutMs: 5000 });
      process.exit(1);
    }, 5000);
    forceExit.unref();

    try {
      workerLoops.stop();
      io.close();
      await new Promise((resolve) => httpServer.close(() => resolve()));
      logger.info('consolidated_shutdown_complete');
      process.exit(0);
    } catch (err) {
      logger.error('consolidated_shutdown_error', { err });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  httpServer.listen(PORT, HOST, () => {
    logger.info('consolidated_server_started', {
      host: HOST,
      port: PORT,
      env: process.env.NODE_ENV,
      build: process.env.BUILD_ID || 'dev',
      nextDir: NEXT_DIR,
      api: '/api/v1',
      socketio: '/socket.io',
      worker: 'in-process',
      uploads: '/uploads',
    });
  });
}

bootstrap().catch((err) => {
  console.error('[consolidated-server] failed to start', err);
  process.exit(1);
});