/**
 * Custom Middleware: Structured Request / Response Logger
 * - Intercepts incoming requests and logs method, path, and correlated req.id
 * - Listens to 'finish' event to measure elapsed time (duration in ms) and status code
 * - Provides log interception support for automated test assertions
 */

const logHistory = [];

function requestLoggerMiddleware(options = {}) {
  const silent = options.silent || false;

  return function (req, res, next) {
    const startTime = process.hrtime.bigint();
    const requestId = req.id || "unknown";
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const timestamp = new Date().toISOString();

    const incomingLog = {
      event: "REQUEST_RECEIVED",
      requestId,
      timestamp,
      method,
      url,
      ip,
    };
    logHistory.push(incomingLog);

    if (!silent && process.env.NODE_ENV !== "test_quiet") {
      console.log(`[REQ] [${requestId}] ${method} ${url} from ${ip}`);
    }

    res.on("finish", () => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number((endTime - startTime) / 1000000n);
      const statusCode = res.statusCode;

      const completionLog = {
        event: "REQUEST_COMPLETED",
        requestId,
        timestamp: new Date().toISOString(),
        method,
        url,
        statusCode,
        durationMs,
      };
      logHistory.push(completionLog);

      if (!silent && process.env.NODE_ENV !== "test_quiet") {
        const level = statusCode >= 500 ? "ERR" : statusCode >= 400 ? "WARN" : "RES";
        console.log(
          `[${level}] [${requestId}] ${method} ${url} -> ${statusCode} in ${durationMs}ms`
        );
      }
    });

    next();
  };
}

module.exports = {
  requestLoggerMiddleware,
  logHistory,
};
