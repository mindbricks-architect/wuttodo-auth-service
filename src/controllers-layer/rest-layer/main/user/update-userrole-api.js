const { UpdateUserRoleManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class UpdateUserRoleRestController extends AuthRestController {
  constructor(req, res) {
    super("updateUserRole", "updateuserrole", req, res);
    this.dataName = "user";
    this.crudType = "update";
    this.status = 200;
    this.httpMethod = "PATCH";
  }

  createApiManager() {
    return new UpdateUserRoleManager(this._req, "rest");
  }
}

const updateUserRole = async (req, res, next) => {
  const controller = new UpdateUserRoleRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = updateUserRole;
