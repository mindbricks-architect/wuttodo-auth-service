const AuthServiceRestController = require("./AuthServiceRestController");

module.exports = (name, routeName, req, res) => {
  const restController = new AuthServiceRestController(
    name,
    routeName,
    req,
    res,
  );
  return restController;
};
