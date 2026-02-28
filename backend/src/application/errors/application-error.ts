import { HTTP_STATUS } from "@/constants/http.js";

export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "ApplicationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, code: string = "VALIDATION_ERROR") {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string, code: string = "UNAUTHORIZED") {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string, code: string = "FORBIDDEN") {
    super(message, HTTP_STATUS.FORBIDDEN, code);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, code: string = "NOT_FOUND") {
    super(message, HTTP_STATUS.NOT_FOUND, code);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, code: string = "CONFLICT") {
    super(message, HTTP_STATUS.CONFLICT, code);
    this.name = "ConflictError";
  }
}
