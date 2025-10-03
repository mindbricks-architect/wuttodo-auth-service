const { ListUsersManager } = require("apiLayer");

const AuthRestController = require("../../AuthServiceRestController");

class ListUsersRestController extends AuthRestController {
  constructor(req, res) {
    super("listUsers", "listusers", req, res);
    this.dataName = "users";
    this.crudType = "list";
    this.status = 200;
    this.httpMethod = "GET";
  }

  createApiManager() {
    return new ListUsersManager(this._req, "rest");
  }
}

const listUsers = async (req, res, next) => {
  const controller = new ListUsersRestController(req, res);
  try {
    await controller.processRequest();
  } catch (err) {
    return next(err);
  }
};

module.exports = listUsers;
