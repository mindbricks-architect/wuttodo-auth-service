const UserManager = require("./UserManager");
const { isValidObjectId, isValidUUID, PaymentGateError } = require("common");
const { hexaLogger } = require("common");
const { ElasticIndexer } = require("serviceCommon");
const { getRedisData } = require("common");
const { UserroleUpdatedPublisher } = require("../../api-events/publishers");

const getIntegrationClient = require("../../integrations");

const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");

const { dbScriptUpdateUserrole } = require("dbLayer");

class UpdateUserRoleManager extends UserManager {
  constructor(request, controllerType) {
    super(request, {
      name: "updateUserRole",
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
    jsonObj.roleId = this.roleId;
  }

  async checkBasicAuth() {
    if (this.checkAbsolute()) return true;

    const hasRole =
      this.userHasRole(this.ROLES.superAdmin) ||
      this.userHasRole(this.ROLES.admin);
    if (!hasRole) {
      throw new ForbiddenError("errMsg_UserRoleRequired:[superAdmin , admin]");
    }
  }

  readRestParameters(request) {
    this.userId = request.params?.userId;
    this.roleId = request.body?.roleId;
    this.requestData = request.body;
    this.queryData = request.query ?? {};
    const url = request.url;
    this.urlPath = url.slice(1).split("/").join(".");
  }

  readMcpParameters(request) {
    this.userId = request.mcpParams.userId;
    this.roleId = request.mcpParams.roleId;
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
      // roleId parameter is closed to update by client request
      // include it in data clause unless you are sure
      roleId: this.roleId,
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
  }

  checkParameters() {
    if (this.userId == null) {
      throw new BadRequestError("errMsg_userIdisRequired");
    }

    if (this.roleId == null) {
      throw new BadRequestError("errMsg_roleIdisRequired");
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
    if (this.userHasRole(this.ROLES.superAdmin)) {
      this.absoluteAuth = true;
      return true;
    }
    this.absoluteAuth = false;
    return false;
  }

  async doBusiness() {
    const userrole = await dbScriptUpdateUserrole(this);
    return userrole;
  }

  async addToOutput() {}

  async raiseEvent() {
    UserroleUpdatedPublisher.Publish(this.output, this.session).catch((err) => {
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

  async afterFetchInstance() {
    try {
      if (this.user.roleId == "tenantAdmin" || this.user.roleId == "admin")
        this.isAdmin = await this.protectOtherAdmins();
    } catch (err) {
      console.log("protectOtherAdmins Action Error:", err.message);
      throw err;
    }
  }

  // Action Store

  /***********************************************************************
   ** Prevents update of the SuperAdmin role. This safeguard ensures that
   ** the SuperAdmin role cannot be changed under any circumstances.
   ***********************************************************************/

  async protectSuperAdmin() {
    const isError = this.userId == this.auth?.superAdminId;

    if (isError) {
      throw new BadRequestError("SuperAdminRoleCantBeChanged");
    }
    return isError;
  }

  /***********************************************************************
   ** Prevents update of the admin role by the admin themselves.
   ***********************************************************************/

  async protectAdmin() {
    if (this.checkAbsolute()) return false;

    const isError =
      this.session.roleId == "admin" || this.session.roleId == "tenantAdmin";

    if (isError) {
      throw new ForbiddenError("AdminCanNotUpdateHisOwnRole");
    }
    return isError;
  }

  /***********************************************************************
   ** Prevents update of the other admin roles by an admin.
   ***********************************************************************/

  async protectOtherAdmins() {
    if (this.checkAbsolute()) return true;

    const isValid = this.session.roleId == "superAdmin";

    if (!isValid) {
      throw new ForbiddenError("AdminCanNotUpdateOtherAdminRole");
    }
    return isValid;
  }
}

module.exports = UpdateUserRoleManager;
