const { hexaLogger, HexaLogTypes } = require("../common/hexa-logger");

const GRPCStatus = require("@grpc/grpc-js").status;

const ErrorCodes = {
  UnknownError: "UnknownError",
  ValidationError: "ValidationError",
  ParameterError: "ParameterError",
  LoginRequired: "LoginRequired",
  ForbiddenAccess: "ForbiddenAccess",
  EmailVerificationNeeded: "EmailVerificationNeeded",
  MobileVerificationNeeded: "MobileVerificationNeeded",
  EmailTwoFactorNeeded: "EmailTwoFactorNeeded",
  MobileTwoFactorNeeded: "MobileTwoFactorNeeded",
  WrongPassword: "WrongPassword",
  UserNotFound: "UserNotFound",
  UserDeleted: "UserDeleted",
  UserTenantNotFound: "UserTenantNotFound",
  UserTenantMismatch: "UserTenantMismatch",
  UserTenantParameterMissing: "UserTenantParameterMissing",
  UserLoginWithoutCredentials: "UserLoginWithoutCredentials",
  LoginTokenError: "LoginTokenError",
  CodeSpamError: "CodeSpamError",
  StepNotFound: "StepNotFound",
  CodeExpired: "CodeExpired",
  CodeMismatch: "CodeMismatch",
  EmailAlreadyVerified: "EmailAlreadyVerified",
  MobileAlreadyVerified: "MobileAlreadyVerified",
  SessionNotFound: "SessionNotFound",
};

class AppError extends Error {
  constructor(messsage, errorCode, detail) {
    super(messsage);
    this.errorCode = errorCode;
    this.detail = detail;
  }
  serializeError() {
    const date = new Date();
    return {
      result: "ERR",
      status: this.status ?? 500,
      message: this.message,
      errCode: this.errorCode,
      detail: this.detail,
      date: date.toISOString(),
    };
  }
}

class PaymentGateError extends AppError {
  constructor(paymentGateName, messsage, errorCode, detail) {
    super(messsage, errorCode, detail);
    this.paymentGateName = paymentGateName;
  }

  serializeError() {
    const errObject = super.serializeError();
    errObject.message = this.paymentGateName + " error: " + errObject.message;
    return errObject;
  }
}

class HttpError extends AppError {
  constructor(status, messsage, errorCode, detail) {
    super(messsage, errorCode ?? status, detail);
    this.status = status;
  }
  serializeError() {
    const errObject = super.serializeError();
    errObject.status = this.status;
    return errObject;
  }
}

class NotFoundError extends HttpError {
  constructor(message, errorCode, detail) {
    super(404, message, errorCode, detail);
    this.grpcStatus = GRPCStatus.NOT_FOUND;
  }
}

class NotAuthenticatedError extends HttpError {
  constructor(message, errorCode, detail) {
    super(401, message, errorCode, detail);
    this.grpcStatus = GRPCStatus.UNAUTHENTICATED;
  }
}

class ForbiddenError extends HttpError {
  constructor(message, errorCode, detail) {
    super(403, message, errorCode, detail);
    this.grpcStatus = GRPCStatus.PERMISSION_DENIED;
  }
}

class BadRequestError extends HttpError {
  constructor(message, errorCode, detail) {
    super(400, message, errorCode, detail);
    this.grpcStatus = GRPCStatus.INVALID_ARGUMENT;
  }
}

class HttpServerError extends HttpError {
  constructor(message, detail) {
    super(500, message, 0, detail);
    this.grpcStatus = GRPCStatus.INTERNAL;
  }
}

const errorHandler = (err, req, res, next) => {
  let status = 500;
  let errCode = 500;
  let location = null;

  let response = null;

  if (err instanceof AppError) {
    status = err.status;
    response = err.serializeError();
  } else {
    const date = new Date();
    response = {
      result: "ERR",
      status: status,
      message: err.message,
      errCode: errCode,
      date: date.toISOString(),
    };
  }

  res.status(status).send(response);
  try {
    response.location = location;

    const logObject = {
      httpStatus: status,
      HTTPErrorResponse: response,
      HTTPError: {
        message: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause,
      },
    };

    if (err.detail instanceof Error) {
      logObject.MainError = {
        message: err.detail.message,
        stack: err.detail.stack,
        name: err.detail.name,
        cause: err.detail.cause,
      };
    } else if (err.detail) {
      logObject.detail = err.detail;
    }
    hexaLogger.insertError(
      "HttpError",
      { status: status },
      "error.js->errorHandler",
      logObject,
      req.requestId,
    );
  } catch (err) {
    console.log("Error in error handler: ", err);
  }
};

module.exports = {
  errorHandler,
  HttpError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  HttpServerError,
  PaymentGateError,
  ErrorCodes,
};
