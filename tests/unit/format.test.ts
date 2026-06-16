import { describe, it, expect } from "vitest";
import { LCUError, RequestError } from "@hasagi/core";
import { resolveListenEventName, serializeRequestResult } from "../../bin/format.js";

// Build genuine LCUError/RequestError instances without driving the (axios-gated) constructors, so
// the test exercises serializeRequestResult's `instanceof` branching independent of axios internals.
function lcuError(fields: { statusCode: number; errorCode: string | null; message: string; implementationDetails: unknown }): LCUError {
  return Object.assign(Object.create(LCUError.prototype), fields);
}

function requestError(fields: { errorCode: string | undefined; message: string }): RequestError {
  return Object.assign(Object.create(RequestError.prototype), fields);
}

describe("serializeRequestResult", () => {
  it("serializes an LCUError into its enumerable fields (not '{}')", () => {
    const result = serializeRequestResult(lcuError({ statusCode: 404, errorCode: "RPC_ERROR", message: "not found", implementationDetails: { foo: 1 } }));

    expect(result).toMatchObject({
      error: "LCUError",
      statusCode: 404,
      errorCode: "RPC_ERROR",
      implementationDetails: { foo: 1 },
    });
    // Guard against the original bug where JSON.stringify(error) wrote "{}".
    const json = JSON.stringify(result);
    expect(json).not.toBe("{}");
    expect(json).toContain("statusCode");
    expect(json).toContain("404");
  });

  it("serializes a RequestError into error/errorCode/message", () => {
    const result = serializeRequestResult(requestError({ errorCode: "ECONNREFUSED", message: "Can't reach League of Legends client (ECONNREFUSED)." }));

    expect(result).toMatchObject({ error: "RequestError", errorCode: "ECONNREFUSED" });
    expect((result as { message: string }).message).toBeTruthy();
    expect(JSON.stringify(result)).not.toBe("{}");
  });

  it("passes a successful result through unchanged", () => {
    const success = { statusCode: 200, body: { ok: true } };

    expect(serializeRequestResult(success)).toEqual(success);
  });
});

describe("resolveListenEventName", () => {
  it("defaults to OnJsonApiEvent when neither name nor path is given", () => {
    expect(resolveListenEventName(undefined, undefined)).toBe("OnJsonApiEvent");
  });

  it("leaves the name unset when only a path filter is given", () => {
    expect(resolveListenEventName(undefined, "/lol-summoner/v1/current-summoner")).toBeUndefined();
  });

  it("uses an explicit name, even alongside a path", () => {
    expect(resolveListenEventName("OnJsonApiEvent_lol-gameflow_v1_session", undefined)).toBe("OnJsonApiEvent_lol-gameflow_v1_session");
    expect(resolveListenEventName("SomeName", "/a/b")).toBe("SomeName");
  });
});
