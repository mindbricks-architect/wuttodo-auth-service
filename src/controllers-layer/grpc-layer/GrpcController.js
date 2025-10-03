const { hexaLogger } = require("common");
const { status } = require("@grpc/grpc-js");
const grpc = require("@grpc/grpc-js");
const { Struct } = require("google-protobuf/google/protobuf/struct_pb");

const { createHexCode } = require("common");
const { createSessionManager } = require("sessionLayer");

const GrpcErrorMap = {
  ValidationError: status.INVALID_ARGUMENT,
  NotFoundError: status.NOT_FOUND,
  AlreadyExistsError: status.ALREADY_EXISTS,
  AuthenticationError: status.UNAUTHENTICATED,
  PermissionError: status.PERMISSION_DENIED,
};

class GrpcController {
  constructor(name, routeName, call, callback) {
    this.name = name;
    this.routeName = routeName;
    this.apiManager = null;
    this.response = {};
    this.businessOutput = null;
    this.crudType = "get";
    this.dataName = "grpcData";

    this._call = call;
    this._callback = callback;
    this.metadata = call.metadata || new grpc.Metadata();
    this.ownRequestId = createHexCode();

    this.request = {
      requestId: this.metadata?.get("requestId")[0] || this.ownRequestId,
      inputData: this._call.request,
      metadata: this.metadata,
      authorization: this.metadata.get("authorization")[0] || null,
    };
    this.startTime = Date.now();
    this.responseType = "single";
    this.responseFormat = "dataItem";
  }

  async init() {
    if (this.isMultiTenant) this.readTenant();
    this.sessionToken = this.readSessionToken();
    this.request.sessionToken = this.sessionToken;
    if (this.isMultiTenant) {
      this.request[this.tenantName + "Codename"] =
        this[this.tenantName + "Codename"];
      this.request[this.tenantId] = this[this.tenantId];
    }

    const sessionManeger = await createSessionManager(this.request);
    await sessionManeger.verifySessionToken(this.request);

    if (this.isLoginApi) {
      if (
        this.request.session &&
        (this.request.userAuthUpdate || this.request.session.userAuthUpdate)
      ) {
        await sessionManeger.relogin(this.request);
      }
    }
  }

  readSessionToken() {
    const authorization = this.metadata.get("authorization")[0] || null;
    if (authorization) {
      const authParts = authorization.split(" ");
      if (authParts.length === 2) {
        if (authParts[0] === "Bearer" || authParts[0] === "bearer") {
          const bearerToken = authParts[1];
          if (bearerToken && bearerToken !== "null") {
            return bearerToken;
          }
        }
      }
    }

    return null;
  }

  readTenant() {
    // read tenantId or tenantCodename from the request
    const tenantId = this.metadata.get(this.tenantId)[0] || null;
    this[this.tenantId] = tenantId;
    const tenantCodename =
      this.metadata.get(this.tenantName + "Codename")[0] || null;
    this[this.tenantName + "Codename"] = tenantCodename;
    this.request[this.tenantId] = tenantId;
    this.request[this.tenantName + "Codename"] = tenantCodename;
  }

  async createApiManager() {}

  async _logManagerCreateError(err) {
    hexaLogger.insertError(
      "GrpcRequestManagerCreateError",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      err,
      this.request.requestId,
    );
  }

  async _logRequest() {
    hexaLogger.insertInfo(
      "GrpcRequestReceived",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      this.request,
      this.request.requestId,
    );
  }

  async _logResponse() {
    hexaLogger.insertInfo(
      "GrpcRequestResponded",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      this.response,
      this.request.requestId,
    );
  }

  async _logError(err) {
    hexaLogger.insertError(
      "ErrorInGrpcRequest",
      { function: this.name, err: err.message },
      `${this.routeName}.js->${this.name}`,
      err,
      this.request.requestId,
    );
  }

  _createMetadata() {
    const metadata = new grpc.Metadata();
    metadata.set("requestId", this.request.requestId);
    metadata.set("processingTime", (Date.now() - this.startTime).toString());
    metadata.set("endpoint", this._call.call.handler.path);
    return metadata;
  }

  _formatResponse(result) {
    if (!result) {
      throw new Error(`Invalid result in ${this.name}`);
    }

    if (this.responseFormat === "dataItem") return result?.[this.dataName];
    else {
      const structResponse = JSON.stringify(result);
      return { response: structResponse };
    }
  }

  async processRequest() {
    await this._logRequest();

    try {
      await this.init();
      this.apiManager = await this.createApiManager();
      this.response = await this.apiManager.execute();
      const formattedResponse = this._formatResponse(this.response);
      console.log(`Response from ${this.name} controller:`, formattedResponse);

      await this._logResponse();
      this._callback(null, formattedResponse, this._createMetadata());
      await this.apiManager.runAfterResponse();
    } catch (err) {
      await this._logError(err);
      console.error(`Error in ${this.name} controller:`, err);
      throw err;
    }
  }
}

module.exports = GrpcController;
