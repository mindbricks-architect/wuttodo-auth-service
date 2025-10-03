const McpController = require("./McpController");

class AuthServiceMcpController extends McpController {
  constructor(name, routeName, req, res) {
    super(name, routeName, req, res);
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

module.exports = AuthServiceMcpController;
