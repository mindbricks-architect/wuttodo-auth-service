module.exports = {
  AuthServiceManager: require("./service-manager/AuthServiceManager"),
  // main Database Crud Object Routes Manager Layer Classes
  // User Db Object
  GetUserManager: require("./main/user/get-user-api"),
  UpdateUserManager: require("./main/user/update-user-api"),
  RegisterUserManager: require("./main/user/register-user-api"),
  DeleteUserManager: require("./main/user/delete-user-api"),
  ListUsersManager: require("./main/user/list-users-api"),
  UpdateUserRoleManager: require("./main/user/update-userrole-api"),
  UpdateUserPasswordManager: require("./main/user/update-userpassword-api"),
  GetBriefUserManager: require("./main/user/get-briefuser-api"),
  integrationRouter: require("./integrations/testRouter"),
};
