import logger from "../logger.js";

export function parseCli(argv) {
  const args = argv.slice(2);

  const opts = {
    help: false,
    host: undefined,
    port: undefined,
    noKeycheck: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (a === "--help" || a === "-h") {
      opts.help = true;
      logger.info("cli:help:requested");
      continue;
    }

    if (a === "--host") {
      opts.host = args[i + 1];
      logger.info("cli:option:set", {
        option: "host",
        value: opts.host,
      });
      i++;
      continue;
    }

    if (a === "--port") {
      const v = Number(args[i + 1]);
      if (!Number.isFinite(v) || v <= 0) {
        logger.error("cli:option:invalid", {
          option: "port",
          value: args[i + 1],
        });
        throw new Error("Invalid value for --port");
      }
      opts.port = v;
      logger.info("cli:option:set", {
        option: "port",
        value: opts.port,
      });
      i++;
      continue;
    }

    if (a === "--no-keycheck") {
      opts.noKeycheck = true;
      logger.warn("cli:keycheck:disabled", {
        warning:
          "KEYCHECK DISABLED - SOME FUNCTIONS MAY NOT WORK OR PROGRAM MAY NOT WORK AT ALL",
      });
      continue;
    }

    logger.error("cli:option:unknown", { option: a });
    throw new Error(`Unknown CLI option: ${a}`);
  }

  logger.info("cli:parsed", opts);
  return opts;
}

export function printHelp() {
  logger.info("cli:help:print");

  const info = `
Usage:
    npm run dev -- -- [options]
    npm start -- [options]

Options:
    -h, --help         Show help
    --host <host>      Override HOST
    --port <port>      Override PORT
    --no-keycheck      Disable access key check (dev only)

Configure (env):
    export RECEPTIONIST_KEY=<your key>
    export SAFETY_KEY=<your key>
    export OBSERVER_KEY=<your key>
`;
  console.log(info);
}
