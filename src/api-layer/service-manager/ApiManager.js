const { createHexCode } = require("common");
const { ForbiddenError, NotAuthenticatedError, ErrorCodes } = require("common");
const { hashString, hashCompare } = require("common");

class ApiManager {
  constructor(request, options) {
    this.request = request;
    this.name = options.name;
    this.controllerType = options.controllerType;
    this.requestId = request.requestId ?? createHexCode();
    this.appVersion = request.appVersion;
    this.caching = request.caching;
    this.cacheTTL = request.cacheTTL;
    this.getJoins = request.getJoins ? request.getJoins === "true" : true;
    this.excludeCqrs = request.excludeCqrs
      ? request.excludeCqrs === "true"
      : false;
    this.variables = {};
    this.redirectUrl = request.headers?.["x-redirect-url"];
    this.hasPagination = options.pagination;
    this.defaultPageRowCount = options.defaultPageRowCount;
    this.downloadName = request.downloadName ?? request.query?.downloadName;
    this.controllerType = options.controllerType;
    this.doCheckout = options.doCheckout;
    this.crudType = options.crudType;
    this.session = request.session;
    if (this.session) this.session.requestId = this.requestId;
    this.auth = request.auth;
    this.ROLES = this.auth?.ROLES ?? {};
    this.bodyParams = request.inputData ?? request.body;
    this.loginRequired = options.loginRequired;
    this.absoluteAuth = null;
  }

  async readParameters(request) {
    if (this.hasPagination) this.readPagination(request);

    switch (this.controllerType) {
      case "rest":
        this.readRestParameters(request);
        break;
      case "kafka":
        this.readKafkaParameters(request);
        break;
      case "grpc":
        this.readGrpcParameters(request);
        break;
      case "mcp":
        this.readMcpParameters(request);
        break;
      case "socket":
        this.readSocketParameters(request);
        break;
      case "cron":
        this.readCronParameters(request);
        break;
    }
  }

  readRestParameters(request) {}
  readKafkaParameters(request) {}
  readGrpcParameters(request) {}
  readMcpParameters(request) {}
  readSocketParameters(request) {}
  readCronParameters(request) {}
  async readRedisParameters() {}
  async transformParameters() {}
  readTenantId(request) {}

  readPagination(request) {
    this.pagination =
      request.pageNumber == 0
        ? null
        : {
            pageNumber: request.pageNumber ?? 1,
            pageRowCount: request.pageRowCount ?? this.defaultPageRowCount,
          };

    if (this.pagination) {
      if (isNaN(this.pagination.pageNumber)) {
        this.pagination.pageNumber = 1;
      }
      if (isNaN(this.pagination.pageRowCount)) {
        this.pagination.pageRowCount = 1;
      }

      this.pagination.pageNumber = parseInt(this.pagination.pageNumber);
      this.pagination.pageRowCount = parseInt(this.pagination.pageRowCount);
      if (this.pagination.pageNumber < 1) {
        this.pagination.pageNumber = 1;
      }
      if (this.pagination.pageRowCount < 1) {
        this.pagination.pageRowCount = 1;
      }
    }
  }

  #readFromObject(readParam, object) {
    if (readParam.includes(".")) {
      const readParams = readParam.split(".");
      let currentObject = object;
      for (const param of readParams) {
        if (!currentObject) return null;
        currentObject = currentObject[param];
      }
      return currentObject;
    }
    return object[readParam];
  }

  readFromContext(readParam) {
    return (
      this.#readFromObject(readParam, this) ??
      this.#readFromObject(readParam, this.variables)
    );
  }

  readFromSession(readParam) {
    return this.session ? this.#readFromObject(readParam, this.session) : null;
  }

  async checkValidLogin() {
    if (!this.loginRequired) {
      return;
    }

    if (!this.session || !this.session.sessionId) {
      throw new NotAuthenticatedError(
        `errMsg_${this.name}RequiresLogin`,
        ErrorCodes.LoginRequired,
      );
    }

    if (this.mobileVerificationNeeded && !this.session.mobileVerified) {
      throw new ForbiddenError(
        `errMsg_${this.name}RequiresMobileVerification`,
        ErrorCodes.MobileVerificationNeeded,
      );
    }

    if (this.emailVerificationNeeded && !this.session.emailVerified) {
      throw new ForbiddenError(
        `errMsg_${this.name}RequiresEmailVerification`,
        ErrorCodes.EmailVerificationNeeded,
      );
    }

    if (this.session.sessionNeedsEmail2FA) {
      throw new ForbiddenError(
        `errMsg_${this.name}RequiresEmail2FA`,
        ErrorCodes.EmailTwoFactorNeeded,
      );
    }

    if (this.session.sessionNeedsMobile2FA) {
      throw new ForbiddenError(
        `errMsg_${this.name}RequiresMobile2FA`,
        ErrorCodes.MobileTwoFactorNeeded,
      );
    }
  }

  async checkParameters() {}
  async handleCheckout() {}
  async fetchInstance() {}
  async checkInstance() {}
  async addToOutput() {}
  async raiseEvent() {}

  async buildWhereClause() {}
  async buildDataClause() {}
  async getSelectList() {
    return [];
  }

  getWhereClause() {
    return this.whereClause;
  }

  getDataClause() {
    return this.dataClause;
  }

  setOwnership() {
    this.isOwner = false;
  }

  checkAbsolute() {
    return false;
  }

  toJSON() {
    const jsonObj = {
      id: this.id,
      requestId: this.requestId,
      appVersion: this.appVersion,
      caching: this.caching,
      cacheTTL: this.cacheTTL,
      getJoins: this.getJoins,
      excludeCqrs: this.excludeCqrs,
      redirectUrl: this.redirectUrl,
      controllerType: this.controllerType,
      pagination: this.pagination,
      paymentCallbackParams: this.paymentCallbackParams,
      paymentUserParams: this.paymentUserParams,
      urlPath: this.urlPath,
      urlWcPath: this.urlWcPath,
      pathName: this.pathName,
      filters: this.filters,
      requestData: this.requestData,
      session: this.session,
      bodyParams: this.bodyParams,
      ROLES: this.ROLES,
    };
    this.parametersToJson(jsonObj);
    return jsonObj;
  }

  parametersToJson(jsonObj) {
    // implement in subclasses
  }

  async checkBasicAuth() {
    return true;
  }

  async afterCheckValidLogin() {}
  async afterReadParameters() {}
  async afterTransformParameters() {}
  async afterCheckParameters() {}
  async afterCheckBasicAuth() {}
  async afterBuildWhereClause() {}
  async afterFetchInstance() {}
  async afterCheckInstance() {}
  async afterbuildDataClause() {}
  async afterMainGetOperation() {}
  async afterMainListOperation() {}
  async afterMainCreateOperation() {}
  async afterMainDeleteOperation() {}
  async afterMainUpdateOperation() {}
  async afterBuildOutput() {}
  async afterSendResponse() {}
  async afterApiEvent() {}

  getInstance() {
    return this._instance;
  }

  async execute() {
    this.startTime = Date.now();
    await this.checkValidLogin();
    await this.afterCheckValidLogin();

    await this.readParameters(this.request);
    await this.readRedisParameters();
    await this.afterReadParameters();

    await this.transformParameters();
    await this.afterTransformParameters();

    await this.checkParameters();
    await this.afterCheckParameters();

    // check basic roles and permissions
    await this.checkBasicAuth();
    await this.afterCheckBasicAuth();

    if (this.crudType != "create") {
      this.whereClause = await this.buildWhereClause();
      await this.afterBuildWhereClause();
    }

    if (["update", "delete"].includes(this.crudType)) {
      await this.fetchInstance();
      this.setOwnership();
      await this.afterFetchInstance();

      // check insatnce for activeCheck and ownerShip check options
      await this.checkInstance();
      await this.afterCheckInstance();
    }

    if (["update", "create"].includes(this.crudType)) {
      this.dataClause = await this.buildDataClause();
      await this.afterbuildDataClause();
    }

    await this.mainOperation();

    if (this.crudType == "create") {
      this.isOwner = true;
    }

    if (this.crudType == "get") {
      this.setOwnership();
      // check insatnce for activeCheck and ownerShip check options
      await this.checkInstance();
      await this.afterCheckInstance();
    }

    await this.runAfterMainOperation();

    await this.buildOutput();
    await this.afterBuildOutput();

    return this.output;
  }

  async runAfterResponse() {
    await this.afterSendResponse();
    this.raiseEvent();
    await this.afterApiEvent();
  }

  async mainOperation() {
    this[this.dataName] = await this.doBusiness();
    this.dbResult = this[this.dataName];
    if (this.crudType == "list") {
      this[this.dataName] = await this.dbResult.items;
    }
  }

  async runAfterMainOperation() {
    const method = {
      get: "afterMainGetOperation",
      list: "afterMainListOperation",
      create: "afterMainCreateOperation",
      delete: "afterMainDeleteOperation",
      update: "afterMainUpdateOperation",
    }[this.crudType];
    if (this[method]) await this[method]();
  }

  async doBusiness() {}
  async addToResponse() {}
  async checkSessionInvalidates() {}

  async doCheckPermission(permissionName, objectId) {
    if (!this.auth) return false;
    return await this.auth.checkPermission(permissionName, objectId);
  }

  userHasRole(roleName) {
    if (!this.auth) return false;
    return this.auth.userHasRole(roleName);
  }

  async buildOutput() {
    const timeTaken = Date.now() - this.startTime;

    const source = this.dbResult._source;
    const cacheKey = this.dbResult._cacheKey;
    delete this.dbResult._source;
    delete this.dbResult._cacheKey;

    this.output = {
      status: "OK",
      statusCode: this.statusCode,
      elapsedMs: timeTaken,
      source: source,
      cacheKey: cacheKey,
      userId: this.session?._USERID,
      sessionId: this.session?.sessionId,
      requestId: this.requestId,
      dataName: this.dataName,
      method: this.httpMethod,
      action: this.crudType,
      appVersion: this.appVersion,
      rowCount: this.crudType == "list" ? this.dbResult.items.length : 1,
      [this.dataName]:
        this.crudType == "list" ? this.dbResult.items : this.dbResult,
      paging: this.crudType == "list" ? this.dbResult.paging : undefined,
      filters: this.crudType == "list" ? this.dbResult.filters : undefined,
      uiPermissions:
        this.crudType == "list" ? this.dbResult.uiPermissions : undefined,
      [`old_${this.dataName}`]:
        this.crudType == "update" ? this[`old_${this.dataName}`] : undefined,
      oldDataValues: this.crudType == "update" ? this.oldDataValues : undefined,
      newDataValues: this.crudType == "update" ? this.newDataValues : undefined,
      checkoutResult: this.checkoutResult ? this.checkoutResult : undefined,
    };

    await this.addToOutput();
  }

  checkoutUpdated(status) {}

  // utility functions to access from scripts
  hashString(strValue) {
    return hashString(strValue);
  }

  hashCompare(hash1, hash2) {
    return hashCompare(hash1, hash2);
  }

  getDbEventTopic(crudType) {
    const event = {
      create: "created",
      update: "updated",
      delete: "deleted",
    };

    return `${this.serviceCodename}-dbevent-${this.dataName}-${event[crudType]}`;
  }

  idList(itemArray, itemId) {
    if (!itemArray) itemArray = this[this.dataName];
    if (!itemId) itemId = "id";
    const arr = itemArray
      ? Array.isArray(itemArray)
        ? itemArray
        : [itemArray]
      : [];
    return arr.map((item) => item[itemId]);
  }
}

module.exports = ApiManager;
