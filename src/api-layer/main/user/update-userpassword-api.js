const UserManager = require("./UserManager");
const { isValidObjectId, isValidUUID, PaymentGateError } = require("common");
const { hexaLogger } = require("common");
const { ElasticIndexer } = require("serviceCommon");
const { getRedisData } = require("common");
const { UserpasswordUpdatedPublisher } = require("../../api-events/publishers");

const getIntegrationClient = require("../../integrations");

const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");

const { dbScriptUpdateUserpassword } = require("dbLayer");

class UpdateUserPasswordManager extends UserManager {
  constructor(request, controllerType) {
    super(request, {
      name: "updateUserPassword",
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
    jsonObj.oldPassword = this.oldPassword;
    jsonObj.newPassword = this.newPassword;
  }

  async checkBasicAuth() {
    if (this.checkAbsolute()) return true;
  }

  readRestParameters(request) {
    this.userId = request.params?.userId;
    this.oldPassword = request.body?.oldPassword;
    this.newPassword = request.body?.newPassword;
    this.requestData = request.body;
    this.queryData = request.query ?? {};
    const url = request.url;
    this.urlPath = url.slice(1).split("/").join(".");
  }

  readMcpParameters(request) {
    this.userId = request.mcpParams.userId;
    this.oldPassword = request.mcpParams.oldPassword;
    this.newPassword = request.mcpParams.newPassword;
    this.requestData = request.mcpParams;
  }

  async transformParameters() {
    try {
      this.newPassword = this.newPassword
        ? this.hashString(this.newPassword)
        : null;
    } catch (err) {
      hexaLogger.insertError(
        `Error transforming parameter newPassword: ${err.message}`,
      );
      throw new BadRequestError(
        "errMsg_ErrorTransformingParameter",
        "SCRIPT_ERROR",
        {
          parameter: "newPassword",
          script: "this.newPassword ? this.hashString(this.newPassword) : null",
          error: err.message,
        },
      );
    }
  }

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
      // password parameter is closed to update by client request
      // include it in data clause unless you are sure
      password: this.newPassword,
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

    if (this.oldPassword == null) {
      throw new BadRequestError("errMsg_oldPasswordisRequired");
    }

    if (this.newPassword == null) {
      throw new BadRequestError("errMsg_newPasswordisRequired");
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
    const userpassword = await dbScriptUpdateUserpassword(this);
    return userpassword;
  }

  async addToOutput() {}

  async raiseEvent() {
    UserpasswordUpdatedPublisher.Publish(this.output, this.session).catch(
      (err) => {
        console.log("Publisher Error in Rest Controller:", err);
      },
    );
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

  async afterCheckInstance() {
    try {
      this.isOldPasswordMatches = await this.checkOldPassword();
    } catch (err) {
      console.log("checkOldPassword Action Error:", err.message);
      throw err;
    }
  }

  // Action Store

  /***********************************************************************
   ** Check if the current password mathces the old password. It is done
   ** after the instance is fetched.
   ***********************************************************************/

  async checkOldPassword() {
    if (this.checkAbsolute()) return true;

    const isValid = this.hashCompare(this.oldPassword, this.user.password);

    if (!isValid) {
      throw new ForbiddenError("TheOldPasswordDoesNotMatch");
    }
    return isValid;
  }

  /***********************************************************************
   ** Ensures that the SuperAdmin account cannot be updated by any user
   ** except the SuperAdmin themselves. This validation prevents privilege
   ** escalation by blocking updates to the SuperAdmin userId unless the
   ** session user is the SuperAdmin.
   ***********************************************************************/

  async protectSuperAdmin() {
    const isValid =
      this.userId != this.auth?.superAdminId ||
      this.session.userId == this.auth?.superAdminId;

    if (!isValid) {
      throw new BadRequestError("SuperAdminCanBeUpdatedBySuperAdmin");
    }
    return isValid;
  }
}

module.exports = UpdateUserPasswordManager;
