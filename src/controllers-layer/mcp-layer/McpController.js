const { hexaLogger } = require("common");
const { createSessionManager } = require("sessionLayer");
const { createHexCode } = require("common");

class McpController {
  constructor(name, routeName, mcpParams) {
    this.name = name;
    this.routeName = routeName;
    this.apiManager = null;
    this.response = {};
    this.businessOutput = null;
    this.crudType = "get";
    this.status = 200;
    this.dataName = "mcpData";
    this.ownRequestId = createHexCode();
    this.requestId = this.ownRequestId;
    this.request = {
      requestId: this.ownRequestId,
      mcpParams: mcpParams,
      metadata: this.metadata,
      accessToken: mcpParams.accessToken,
      Authorization:
        mcpParams.headers["authorization"] ||
        mcpParams.headers["Authorization"],
    };
    this.projectCodename = null;
    this.isMultiTenant = false;
    this.tenantName = "tenant";
    this.tenantId = "tenantId";
    this.sessionManager = null;
  }

  async createApiManager() {}

  async init() {
    if (this.isMultiTenant) this.readTenant();
    this.sessionToken = this.readSessionToken();
    this.request.sessionToken = this.sessionToken;
    if (this.isMultiTenant) {
      this.request[this.tenantName + "Codename"] =
        this[this.tenantName + "Codename"];
      this.request.tenantCodename = this[this.tenantName + "Codename"];
    }

    this.sessionManager = await createSessionManager(this.request);

    await this.sessionManager.verifySessionToken(this.request);
    return this.request;
  }

  readTenant() {
    const tenantCodename = `${this.tenantName}Codename`;

    // read tenant codename from mcpParams
    this[tenantCodename] = this.request.mcpParams[tenantCodename];
    if (!this[tenantCodename]) {
      console.log(`Tenant codename not found in mcp params: ${tenantCodename}`);
    } else {
      console.log(
        `Tenant codename found in  mcp params: ${tenantCodename}`,
        this[tenantCodename],
      );
    }

    // if not set, use the default root tenant
    if (!this[tenantCodename]) {
      this[tenantCodename] = "root";
      console.log("No tenant codename found, using default 'root'");
    }
    this.tenantCodename = this[tenantCodename];
  }

  readSessionToken() {
    if (this.request.accessToken) {
      console.log("Access Token extracted from Mcp parameters");
      return this.request.accessToken;
    }

    let sessionToken = null;
    if (this.request.Authorization) {
      if (this.request.Authorization.startsWith("Bearer ")) {
        console.log("Bearer Token extracted from Mcp Authorization");
        sessionToken = this.request.Authorization.slice(7);
      }
    }

    return sessionToken;
  }

  async redirect() {
    return false;
  }

  async doDownload() {
    //return await this.apiManager.doDownload(this._res);
    return null;
  }

  async _logRequest() {
    hexaLogger.insertInfo(
      "McpRequestReceived",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      {
        params: this.request.mcpParams,
      },
      this.requestId,
    );
    console.group();
    console.log("------------------------------------------------------------");
    console.log("McpRequestReceived", this.name, new Date().toISOString());
    console.groupEnd();
  }

  async _logResponse() {
    hexaLogger.insertInfo(
      "McpRequestResponded",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      this.response,
      this.requestId,
    );
    console.group();
    console.log("McpRequestResponded", this.name, new Date().toISOString());
    console.log("------------------------------------------------------------");
    console.groupEnd();
  }

  async _logError(err) {
    hexaLogger.insertError(
      "ErrorInMcpRequest",
      { function: this.name, err: err.message },
      `${this.routeName}.js->${this.name}`,
      err,
      this.requestId,
    );
    console.group();
    console.error(
      "\x1b[31m",
      "------------------------------------------------------------",
    );
    console.error("ErrorInMcpRequest", this.name, new Date().toISOString());
    console.error("ErrorMessage:", err.message);
    console.error(
      "------------------------------------------------------------",
      "\x1b[0m",
    );
    console.groupEnd();
  }

  async processRequest() {
    await this._logRequest();

    try {
      await this.init();
      this.apiManager = await this.createApiManager(this.request);
      this.startTime = Date.now();
      this.response = await this.apiManager.execute();
      await this._logResponse();
      await this.apiManager.runAfterResponse();
      return (await this.doDownload()) || this.response;
    } catch (err) {
      await this._logError(err);
      throw err;
    }
  }
}

module.exports = McpController;
