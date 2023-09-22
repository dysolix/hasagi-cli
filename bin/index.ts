#!/usr/bin/env node

import yargs from "yargs"
import { HasagiClient } from "@hasagi/core"
import fs from "fs/promises";
import _path from "path";
import { getExtendedHelp, getSwagger, getTypeScript } from "@hasagi/schema";

export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const options = await yargs().scriptName("hasagi")
    .command("request <method> <path>", "send a http request to the LCU", yargs =>
        yargs
            .positional("method", { description: "the http method" })
            .positional("path", { description: "the request path" })
            .option("body", { string: true, alias: "b" })
            .option("query", { string: true, alias: "q" })
            .option("out", { string: true, alias: "o" })
            )
    .command("listen", "listen to LCU websocket events", builder => 
        builder
            .option("path", { alias: "p", conflicts: "name", string: true })
            .option("name", { alias: "n", conflicts: "path", string: true })
            .option("type", { alias: "t", string: true, array: true, choices: ["Create", "Update", "Delete"] })
            .option("out", { string: true, alias: "o" })
            )
    .command("schema", "", yargs =>
        yargs
            .option("typescript", { alias: "t", string: true })
            .option("tsnamespace", { string: true })
            .option("swagger", { alias: "s", string: true })
            .option("raw", { alias: "r", string: true })
            )
    .demandCommand()
    .help("help")
    .parseAsync(process.argv.slice(2));

const cmd = options._[0];

if (cmd === "request") {
    const client = new HasagiClient();
    client.on("connection-attempt-failed", () => console.log("Waiting for League of Legends client..."))
    await client.connect();

    const method = (options.method as string).toUpperCase() as any;
    const path = (options.path as string).toLowerCase();

    const out = (options.out === undefined ? undefined : options.out !== "" ? options.out : "./") as string | undefined
    const isDirectory = out !== undefined ? await fs.stat(out as string).then(stat => stat.isDirectory(), () => false) : false;

    console.log("Waiting for League client...");
    console.log(`Sending '${method}' request to 'https://127.0.0.1:${client.getPort()}${path}'...`)
    const result = await client.request({ method, url: path as any, returnFullAxiosResponse: true });

    if(out) {
        await fs.writeFile(isDirectory ? _path.join(out, `${method}-${path.substring(1).replaceAll("/", "_")}-${Date.now()}.json`) : out, JSON.stringify({
            statusCode: result.status,
            data: result.data
        }, null, 4))
    }

    console.log(`Status code: ${result.status}`)
    console.log(`Response content: ${JSON.stringify(result.data, null, 4)}`)
} else if (cmd === "listen") {
    const client = new HasagiClient();
    client.on("connection-attempt-failed", () => console.log("Waiting for League of Legends client..."))
    await client.connect();

    const name = options.name as string;
    const path = options.path as string;
    const types = options.type as any;

    const out = (options.out === undefined ? undefined : options.out !== "" ? options.out : "./") as string | undefined
    const isDirectory = out !== undefined ? await fs.stat(out as string).then(stat => stat.isDirectory(), () => false) : false;

    client.addLCUEventListener({
        name,
        path,
        types,
        callback: async (event) => {
            if(out) {
                await fs.appendFile(isDirectory ? _path.join(out, "lcu-websocket-events.txt") : out, JSON.stringify(event, null, 4) + "\n");
            }

            console.log(`Received event: ${JSON.stringify(event, null, 4)}`);
        },
    });

    while(true) { await delay(100) }
} else if (cmd === "schema") {
    const raw = options.raw as string | undefined;
    const swagger = options.swagger as string | undefined;
    const typescript = options.typescript as string | undefined;
    const tsnamespace = options.tsnamespace as string | undefined;

    if(raw !== undefined || swagger !== undefined || typescript !== undefined) {
        const { consoleSchema, extendedSchema, fullSchema } = await getExtendedHelp(true);
        if(raw !== undefined) {
            const out = raw !== "" ? raw : "./";
            await fs.mkdir(out, { recursive: true })
            await fs.writeFile(_path.join(out, "console-schema.json"), JSON.stringify(consoleSchema, null, 4));
            await fs.writeFile(_path.join(out, "full-schema.json"), JSON.stringify(fullSchema, null, 4));
            await fs.writeFile(_path.join(out, "extended-schema.json"), JSON.stringify(extendedSchema, null, 4));
        }

        const swaggerObj = swagger !== undefined || typescript !== undefined ? await getSwagger(extendedSchema) : undefined;

        if(swagger !== undefined) {
            const out = swagger !== "" ? swagger : "./";
            await fs.mkdir(out, { recursive: true })
            await fs.writeFile(_path.join(out, "swagger.json"), JSON.stringify(swaggerObj!, null, 4));
        }

        if(typescript !== undefined) {
            const { lcuEndpoints, lcuEvents, lcuTypes } = await getTypeScript(swaggerObj!, extendedSchema, tsnamespace);
            const out = typescript !== "" ? typescript : "./";
            await fs.mkdir(out, { recursive: true })
            await fs.writeFile(_path.join(out, "lcu-types.d.ts"), lcuTypes);
            await fs.writeFile(_path.join(out, "lcu-endpoints.d.ts"), lcuEndpoints);
            await fs.writeFile(_path.join(out, "lcu-events.d.ts"), lcuEvents);
        }
    }
}

process.exit();