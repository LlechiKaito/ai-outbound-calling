import { HTTP_STATUS } from "@/constants/http.js";

interface ErrorDefinition {
  readonly message: string;
  readonly code: string;
  readonly status: number;
}

export const ERROR_DEFINITIONS = {
  VALIDATION_FAILED: {
    message: "Validation failed",
    code: "VALIDATION_FAILED",
    status: HTTP_STATUS.BAD_REQUEST,
  },
  UNAUTHORIZED: {
    message: "Authentication required",
    code: "UNAUTHORIZED",
    status: HTTP_STATUS.UNAUTHORIZED,
  },
  FORBIDDEN: {
    message: "Insufficient permissions",
    code: "FORBIDDEN",
    status: HTTP_STATUS.FORBIDDEN,
  },
  NOT_FOUND: {
    message: "Resource not found",
    code: "NOT_FOUND",
    status: HTTP_STATUS.NOT_FOUND,
  },
  CONFLICT: {
    message: "Resource conflict",
    code: "CONFLICT",
    status: HTTP_STATUS.CONFLICT,
  },
  INTERNAL_ERROR: {
    message: "Internal server error",
    code: "INTERNAL_ERROR",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  CONFIG_MISSING: {
    message: "Required configuration is missing",
    code: "CONFIG_MISSING",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  TWILIO_SIGNATURE_MISSING: {
    message: "Missing Twilio signature",
    code: "TWILIO_SIGNATURE_MISSING",
    status: HTTP_STATUS.FORBIDDEN,
  },
  TWILIO_SIGNATURE_INVALID: {
    message: "Invalid Twilio signature",
    code: "TWILIO_SIGNATURE_INVALID",
    status: HTTP_STATUS.FORBIDDEN,
  },
} as const satisfies Record<string, ErrorDefinition>;
