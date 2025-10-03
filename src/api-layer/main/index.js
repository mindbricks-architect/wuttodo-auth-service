module.exports = {
  // main Database Crud Object Routes Manager Layer Classes
  // User Db Object
  GetUserManager: require("./user/get-user-api"),
  UpdateUserManager: require("./user/update-user-api"),
  RegisterUserManager: require("./user/register-user-api"),
  DeleteUserManager: require("./user/delete-user-api"),
  ListUsersManager: require("./user/list-users-api"),
  UpdateUserRoleManager: require("./user/update-userrole-api"),
  UpdateUserPasswordManager: require("./user/update-userpassword-api"),
  GetBriefUserManager: require("./user/get-briefuser-api"),
};
