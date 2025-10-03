const UserManager = require("./UserManager");
const { isValidObjectId, isValidUUID, PaymentGateError } = require("common");
const { hexaLogger } = require("common");
const { ElasticIndexer } = require("serviceCommon");
const { getRedisData } = require("common");
const { UserUpdatedPublisher } = require("../../api-events/publishers");

const getIntegrationClient = require("../../integrations");

const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");

const { dbScriptUpdateUser } = require("dbLayer");

class UpdateUserManager extends UserManager {
  constructor(request, controllerType) {
    super(request, {
      name: "updateUser",
      controllerType: controllerType,
      pagination: false,
      crudType: "update",
      loginRequired: true,
    });

    this.dataName = "user";
  }

  parametersToJson(jsonObj) {
    super.parametersToJson(jsonObj);
    jsonObj.userId = this.userId;
    jsonObj.fullname = this.fullname;
    jsonObj.avatar = this.avatar;
  }

  async checkBasicAuth() {
    if (this.checkAbsolute()) return true;
  }

  readRestParameters(request) {
    this.userId = request.params?.userId;
    this.fullname = request.body?.fullname;
    this.avatar = request.body?.avatar;
    this.requestData = request.body;
    this.queryData = request.query ?? {};
    const url = request.url;
    this.urlPath = url.slice(1).split("/").join(".");
  }

  readMcpParameters(request) {
    this.userId = request.mcpParams.userId;
    this.fullname = request.mcpParams.fullname;
    this.avatar = request.mcpParams.avatar;
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

  // data clause methods

  async buildDataClause() {
    const { hashString } = require("common");

    const dataClause = {
      fullname: this.fullname,
      avatar: this.avatar,
    };

    let isEmpty = true;
    for (const key of Object.keys(dataClause)) {
      if (dataClause[key] != null) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      throw new BadRequestError("errMsg_UpdateDataClauseCanNotBeEmpty");
    }

    return dataClause;
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
    const user = await dbScriptUpdateUser(this);
    return user;
  }

  async addToOutput() {}

  async raiseEvent() {
    UserUpdatedPublisher.Publish(this.output, this.session).catch((err) => {
      console.log("Publisher Error in Rest Controller:", err);
    });
  }

  // Work Flow

  async afterCheckBasicAuth() {
    try {
      if (this.userId == this.auth?.superAdminId)
        this.isSuperAdmin = await this.protectSuperAdmin();
    } catch (err) {
      console.log("protectSuperAdmin Action Error:", err.message);
      throw err;
    }
  }

  // Action Store

  /***********************************************************************
   ** Ensures that the SuperAdmin account cannot be updated by any user
   ** except the SuperAdmin themselves. This validation prevents privilege
   ** escalation by blocking updates to the SuperAdmin userId unless the
   ** session user is the SuperAdmin.
   ***********************************************************************/

  async protectSuperAdmin() {
    const isValid = this.session.userId == this.auth?.superAdminId;

    if (!isValid) {
      throw new BadRequestError("SuperAdminCanBeUpdatedBySuperAdmin");
    }
    return isValid;
  }
}

module.exports = UpdateUserManager;
