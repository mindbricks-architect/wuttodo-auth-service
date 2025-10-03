const AuthServiceMcpController = require("./AuthServiceMcpController");

module.exports = (name, routeName, params) => {
  const mcpController = new AuthServiceMcpController(name, routeName, params);
  return mcpController;
};
