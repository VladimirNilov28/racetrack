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
            continue;
        }

        if (a === "--host") {
            opts.host = args[i + 1];
            i++;
            continue;
        }

        if (a === "--port") {
            const v = Number(args[i + 1]);
            if (!Number.isFinite(v) || v <= 0) {
                throw new Error("Invalid value for --port");
            }
            opts.port = v;
            i++;
            continue;
        }

        if (a === "--no-keycheck") {
            opts.noKeycheck = true;
            console.log("\x1b[33mWARNING: KEYCHECK DISABLED - SOME FUNCTIONS MAY NOT WORK OR PROGRAM MAY NOT WORK AT ALL\x1b[0m");
            continue;
        }

        throw new Error(`Unknown CLI option: ${a}`);
    }

    return opts;
}

export function printHelp() {
    const info = `
Usage:
    npm run dev -- [options]
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
