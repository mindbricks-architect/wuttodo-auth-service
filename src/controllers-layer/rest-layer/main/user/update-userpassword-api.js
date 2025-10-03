const { UpdateUserPasswordManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class UpdateUserPasswordRestController extends AuthRestController {
  constructor(req, res) {
    super("updateUserPassword", "updateuserpassword", req, res);
    this.dataName = "user";
    this.crudType = "update";
    this.status = 200;
    this.httpMethod = "PATCH";
  }

  createApiManager() {
    return new UpdateUserPasswordManager(this._req, "rest");
  }
}

const updateUserPassword = async (req, res, next) => {
  const controller = new UpdateUserPasswordRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = updateUserPassword;
