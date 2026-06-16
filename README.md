# @hasagi/cli

A command-line interface for the League of Legends client API (LCU). Send requests, listen to
WebSocket events, read credentials, and generate the LCU schema / TypeScript types — all against a
running League client, with credentials discovered automatically.

## Installation

```bash
npm install -g @hasagi/cli
```

This exposes the `hasagi` command. (Or run without installing via `npx @hasagi/cli <command>`.)

## Commands

### `request <method> <path>`

Send an HTTP request to the LCU.

```bash
hasagi request get /lol-summoner/v1/current-summoner
hasagi request post /lol-lobby/v2/lobby --body '{ "queueId": 430 }'
hasagi request get /lol-summoner/v1/summoners --query '{ "name": "Faker" }'
```

| Option | Alias | Description |
| --- | --- | --- |
| `--body` | `-b` | JSON request body |
| `--query` | `-q` | JSON query parameters |
| `--out` | `-o` | Write the response to a file (or a directory to auto-name it) |

### `listen`

Subscribe to LCU WebSocket events and print them. With neither `--name` nor `--path`, subscribes to
the `OnJsonApiEvent` catch-all.

```bash
hasagi listen
hasagi listen --path /lol-gameflow/v1/gameflow-phase --type Update
hasagi listen --name OnJsonApiEvent_lol-champ-select_v1_session --out ./events
```

| Option | Alias | Description |
| --- | --- | --- |
| `--path` | `-p` | Filter by URI path (conflicts with `--name`) |
| `--name` | `-n` | Subscribe to a specific event name (conflicts with `--path`) |
| `--type` | `-t` | Filter by event type(s): `Create`, `Update`, `Delete` |
| `--out` | `-o` | Append events to a file (or a directory for the default file name) |

### `credentials`

Print the LCU base URL and `Authorization` header for the running client.

```bash
hasagi credentials
```

### `schema`

Generate the LCU schema and/or TypeScript types from the running client (powered by
[`@hasagi/schema`](https://www.npmjs.com/package/@hasagi/schema)).

```bash
# Emit the generated TypeScript types into ./src/types
hasagi schema --typescript ./src/types

# Emit the OpenAPI (swagger) document
hasagi schema --swagger ./
```

| Option | Alias | Description |
| --- | --- | --- |
| `--typescript` | `-t` | Output directory for the generated `.d.ts` files |
| `--tsnamespace` | | Wrap the generated types in a namespace |
| `--swagger` | `-s` | Output directory for `swagger.json` |
| `--raw` | `-r` | Output directory for the raw/extended schema JSON |
| `--index` / `--no-index` | | Emit (default) or skip an `index.d.ts` barrel re-export |

## Disclaimer

Hasagi is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or
anyone officially involved in producing or managing Riot Games properties. Riot Games and all
associated properties are trademarks or registered trademarks of Riot Games, Inc.
