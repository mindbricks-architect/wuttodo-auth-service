const { UpdateUserManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class UpdateUserRestController extends AuthRestController {
  constructor(req, res) {
    super("updateUser", "updateuser", req, res);
    this.dataName = "user";
    this.crudType = "update";
    this.status = 200;
    this.httpMethod = "PATCH";
  }

  createApiManager() {
    return new UpdateUserManager(this._req, "rest");
  }
}

const updateUser = async (req, res, next) => {
  const controller = new UpdateUserRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = updateUser;
