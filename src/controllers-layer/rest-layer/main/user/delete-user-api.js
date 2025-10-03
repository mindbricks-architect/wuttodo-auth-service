const { DeleteUserManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class DeleteUserRestController extends AuthRestController {
  constructor(req, res) {
    super("deleteUser", "deleteuser", req, res);
    this.dataName = "user";
    this.crudType = "delete";
    this.status = 200;
    this.httpMethod = "DELETE";
  }

  createApiManager() {
    return new DeleteUserManager(this._req, "rest");
  }
}

const deleteUser = async (req, res, next) => {
  const controller = new DeleteUserRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = deleteUser;
