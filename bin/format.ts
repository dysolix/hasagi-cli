import { LCUError, RequestError } from "@hasagi/core";

export type SerializedRequestError =
  | { error: "LCUError"; statusCode: number; errorCode: string | null; message: string; implementationDetails: unknown }
  | { error: "RequestError"; errorCode: string | undefined; message: string };

/**
 * Serializes a `request` command result for writing to disk. `LCUError`/`RequestError` instances
 * aren't JSON-enumerable (`JSON.stringify(error)` yields `"{}"`), so their fields are mapped
 * explicitly; any other (successful) result passes through unchanged.
 */
export function serializeRequestResult<T>(result: T | LCUError | RequestError): T | SerializedRequestError {
  if (result instanceof LCUError)
    return { error: "LCUError", statusCode: result.statusCode, errorCode: result.errorCode, message: result.message, implementationDetails: result.implementationDetails };

  if (result instanceof RequestError)
    return { error: "RequestError", errorCode: result.errorCode, message: result.message };

  return result;
}

/**
 * Resolves the LCU event name the `listen` command should subscribe to. With neither a name nor a
 * path, core subscribes to nothing, so default to the `OnJsonApiEvent` catch-all so a bare
 * `hasagi listen` still receives events. An explicit name always wins; a path-only filter keeps the
 * name unset (core defaults it to `OnJsonApiEvent` itself).
 */
export function resolveListenEventName(name: string | undefined, path: string | undefined): string | undefined {
  return name ?? (path ? undefined : "OnJsonApiEvent");
}
