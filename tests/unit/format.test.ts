import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { LCUError, RequestError } from "@hasagi/core";
import { resolveListenEventName, serializeRequestResult } from "../../bin/format.js";

// axios ships separate ESM and CJS builds, each with its own AxiosError class (a dual-package
// hazard). @hasagi/core is CJS and requires the CJS axios, so its `instanceof AxiosError` checks
// only recognize CJS-built errors. A plain `import ... from "axios"` here would give vitest the ESM
// AxiosError and silently fail those checks — so we require axios the same (CJS) way core does,
// guaranteeing one shared AxiosError identity and letting the real error constructors run.
const { AxiosError } = createRequire(import.meta.url)("axios") as typeof import("axios");

function lcuError(status: number, data: { errorCode: string; message: string; implementationDetails: unknown }): LCUError {
  return new LCUError(new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", {} as any, {}, {
    status,
    data,
    statusText: "",
    headers: {} as any,
    config: {} as any,
  }));
}

function requestError(code: string): RequestError {
  return new RequestError(new AxiosError(`connect ${code}`, code, {} as any, {}));
}

describe("serializeRequestResult", () => {
  it("serializes an LCUError into its enumerable fields (not '{}')", () => {
    const result = serializeRequestResult(lcuError(404, { errorCode: "RPC_ERROR", message: "not found", implementationDetails: { foo: 1 } }));

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
    const result = serializeRequestResult(requestError("ECONNREFUSED"));

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
