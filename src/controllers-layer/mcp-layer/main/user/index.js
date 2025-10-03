module.exports = (headers) => {
  // User Db Object Rest Api Router
  const userMcpRouter = [];

  // getUser controller
  userMcpRouter.push(require("./get-user-api")(headers));
  // updateUser controller
  userMcpRouter.push(require("./update-user-api")(headers));
  // registerUser controller
  userMcpRouter.push(require("./register-user-api")(headers));
  // deleteUser controller
  userMcpRouter.push(require("./delete-user-api")(headers));
  // listUsers controller
  userMcpRouter.push(require("./list-users-api")(headers));
  // updateUserRole controller
  userMcpRouter.push(require("./update-userrole-api")(headers));
  // updateUserPassword controller
  userMcpRouter.push(require("./update-userpassword-api")(headers));
  // getBriefUser controller
  userMcpRouter.push(require("./get-briefuser-api")(headers));

  return userMcpRouter;
};
