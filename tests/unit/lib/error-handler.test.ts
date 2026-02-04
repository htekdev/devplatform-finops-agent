import { describe, it, expect } from "vitest";
import { toToolError, wrapToolHandler } from "../../../src/lib/error-handler.js";

describe("Error Handler", () => {
  it("should convert 401 errors to AUTH_INVALID", () => {
    const error = Object.assign(new Error("Unauthorized"), { status: 401 });
    const toolError = toToolError(error, "test operation");
    
    expect(toolError.code).toBe("AUTH_INVALID");
    expect(toolError.retryable).toBe(false);
    expect(toolError.suggestedAction).toBe("ABORT");
  });

  it("should convert 404 errors to NOT_FOUND", () => {
    const error = Object.assign(new Error("Not found"), { status: 404 });
    const toolError = toToolError(error, "test operation");
    
    expect(toolError.code).toBe("NOT_FOUND");
    expect(toolError.retryable).toBe(false);
    expect(toolError.suggestedAction).toBe("SKIP");
  });

  it("should wrap successful operations", async () => {
    const result = await wrapToolHandler(async () => "success", "test");
    
    expect(result.success).toBe(true);
    expect(result.data).toBe("success");
    expect(result.error).toBeUndefined();
  });

  it("should wrap failed operations", async () => {
    const result = await wrapToolHandler(
      async () => { throw new Error("failure"); },
      "test"
    );
    
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("INTERNAL_ERROR");
  });
});
