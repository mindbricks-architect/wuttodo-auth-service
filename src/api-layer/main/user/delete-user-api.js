const UserManager = require("./UserManager");
const { isValidObjectId, isValidUUID, PaymentGateError } = require("common");
const { hexaLogger } = require("common");
const { ElasticIndexer } = require("serviceCommon");
const { getRedisData } = require("common");
const { UserDeletedPublisher } = require("../../api-events/publishers");

const getIntegrationClient = require("../../integrations");

const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");

const { dbScriptDeleteUser } = require("dbLayer");

class DeleteUserManager extends UserManager {
  constructor(request, controllerType) {
    super(request, {
      name: "deleteUser",
      controllerType: controllerType,
      pagination: false,
      crudType: "delete",
      loginRequired: true,
    });

    this.dataName = "user";
  }

  parametersToJson(jsonObj) {
    super.parametersToJson(jsonObj);
    jsonObj.userId = this.userId;
  }

  async checkBasicAuth() {
    if (this.checkAbsolute()) return true;
  }

  readRestParameters(request) {
    this.userId = request.params?.userId;
    this.requestData = request.body;
    this.queryData = request.query ?? {};
    const url = request.url;
    this.urlPath = url.slice(1).split("/").join(".");
  }

  readMcpParameters(request) {
    this.userId = request.mcpParams.userId;
    this.requestData = request.mcpParams;
  }

  async transformParameters() {}

  // where clause methods

  async getRouteQuery() {
    return { $and: [{ id: this.userId }, { isActive: true }] };

    // handle permission filter later
  }

  async buildWhereClause() {
    const { convertUserQueryToSequelizeQuery } = require("common");

    const routeQuery = await this.getRouteQuery();

    return convertUserQueryToSequelizeQuery(routeQuery);
  }

  async fetchInstance() {
    const { getUserByQuery } = require("dbLayer");
    this.user = await getUserByQuery(this.whereClause);
    if (!this.user) {
      throw new NotFoundError("errMsg_RecordNotFound");
    }
    this._instance = this.user;
  }

  async checkInstance() {
    if (!this.user) {
      throw new NotFoundError("errMsg_RecordNotFound");
    }

    if (!this.checkAbsolute() && !this.isOwner) {
      throw new ForbiddenError("errMsg_UserShouldBeTheOnwerOfTheObject");
    }
  }

  checkParameters() {
    if (this.userId == null) {
      throw new BadRequestError("errMsg_userIdisRequired");
    }

    // ID
    if (
      this.userId &&
      !isValidObjectId(this.userId) &&
      !isValidUUID(this.userId)
    ) {
      throw new BadRequestError("errMsg_userIdisNotAValidID");
    }
  }

  setOwnership() {
    this.isOwner = false;
    if (!this.session || !this.session.userId) return;

    this.isOwner = this.user?.id === this.session.userId;
  }

  checkAbsolute() {
    if (this.absoluteAuth !== null) return this.absoluteAuth;

    // Check if user has an absolute role to ignore all authorization validations and return
    if (
      this.userHasRole(this.ROLES.superAdmin) ||
      this.userHasRole(this.ROLES.admin)
    ) {
      this.absoluteAuth = true;
      return true;
    }
    this.absoluteAuth = false;
    return false;
  }

  async doBusiness() {
    const user = await dbScriptDeleteUser(this);
    return user;
  }

  async addToOutput() {}

  async raiseEvent() {
    UserDeletedPublisher.Publish(this.output, this.session).catch((err) => {
      console.log("Publisher Error in Rest Controller:", err);
    });
  }

  // Work Flow

  async afterCheckBasicAuth() {
    try {
      this.isSuperAdmin = await this.protectSuperAdmin();
    } catch (err) {
      console.log("protectSuperAdmin Action Error:", err.message);
      throw err;
    }
  }

  // Action Store

  /***********************************************************************
   ** Prevents deletion of the SuperAdmin account. This safeguard ensures
   ** that the SuperAdmin userId cannot be removed under any circumstances.
   ***********************************************************************/

  async protectSuperAdmin() {
    const isError = this.userId == this.auth?.superAdminId;

    if (isError) {
      throw new BadRequestError("SuperAdminCantBeDeleted");
    }
    return isError;
  }
}

module.exports = DeleteUserManager;
