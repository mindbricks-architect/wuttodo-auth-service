const { GetUserManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class GetUserRestController extends AuthRestController {
  constructor(req, res) {
    super("getUser", "getuser", req, res);
    this.dataName = "user";
    this.crudType = "get";
    this.status = 200;
    this.httpMethod = "GET";
  }

  createApiManager() {
    return new GetUserManager(this._req, "rest");
  }
}

const getUser = async (req, res, next) => {
  const controller = new GetUserRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = getUser;
