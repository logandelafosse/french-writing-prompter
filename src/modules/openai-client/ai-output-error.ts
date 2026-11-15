export type AiOutputErrorCode = "invalid_json" | "schema_mismatch";

export class AiOutputError extends Error {
  readonly code: AiOutputErrorCode;
  override readonly cause: unknown;

  constructor(code: AiOutputErrorCode, message: string, cause: unknown) {
    super(message);
    this.name = "AiOutputError";
    this.code = code;
    this.cause = cause;
  }
}
