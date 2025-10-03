const { RegisterUserManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class RegisterUserRestController extends AuthRestController {
  constructor(req, res) {
    super("registerUser", "registeruser", req, res);
    this.dataName = "user";
    this.crudType = "create";
    this.status = 201;
    this.httpMethod = "POST";
  }

  createApiManager() {
    return new RegisterUserManager(this._req, "rest");
  }
}

const registerUser = async (req, res, next) => {
  const controller = new RegisterUserRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = registerUser;
