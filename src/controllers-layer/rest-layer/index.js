const mainRouters = require("./main");
const sessionRouter = require("./session-router");
module.exports = {
  ...mainRouters,
  AuthServiceRestController: require("./AuthServiceRestController"),
  ...sessionRouter,
};
