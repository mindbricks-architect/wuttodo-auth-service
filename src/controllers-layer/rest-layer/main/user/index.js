const express = require("express");

// User Db Object Rest Api Router
const userRouter = express.Router();

// add User controllers

// getUser controller
userRouter.get("/v1/users/:userId", require("./get-user-api"));
// updateUser controller
userRouter.patch("/v1/users/:userId", require("./update-user-api"));
// registerUser controller
userRouter.post("/v1/registeruser", require("./register-user-api"));
// deleteUser controller
userRouter.delete("/v1/users/:userId", require("./delete-user-api"));
// listUsers controller
userRouter.get("/v1/users", require("./list-users-api"));
// updateUserRole controller
userRouter.patch("/v1/userrole/:userId", require("./update-userrole-api"));
// updateUserPassword controller
userRouter.patch(
  "/v1/userpassword/:userId",
  require("./update-userpassword-api"),
);
// getBriefUser controller
userRouter.get("/v1/briefuser/:userId", require("./get-briefuser-api"));

module.exports = userRouter;
