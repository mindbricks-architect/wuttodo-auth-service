const { GetBriefUserManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class GetBriefUserRestController extends AuthRestController {
  constructor(req, res) {
    super("getBriefUser", "getbriefuser", req, res);
    this.dataName = "user";
    this.crudType = "get";
    this.status = 200;
    this.httpMethod = "GET";
  }

  createApiManager() {
    return new GetBriefUserManager(this._req, "rest");
  }
}

const getBriefUser = async (req, res, next) => {
  const controller = new GetBriefUserRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = getBriefUser;
