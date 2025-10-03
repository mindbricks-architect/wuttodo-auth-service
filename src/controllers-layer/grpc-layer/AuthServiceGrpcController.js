const GrpcController = require("./GrpcController");

class AuthServiceGrpcController extends GrpcController {
  constructor(name, routeName, call, callback) {
    super(name, routeName, call, callback);
    this.projectCodename = "wuttodo";
    this.isMultiTenant = false;
    this.tenantName = "";
    this.tenantId = "";
    this.tenantCodename = null;
    this.isLoginApi = true;
  }

  createApiManager() {
    return null;
  }
}

module.exports = AuthServiceGrpcController;
