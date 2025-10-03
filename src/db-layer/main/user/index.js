const utils = require("./utils");
const dbApiScripts = require("./dbApiScripts");

module.exports = {
  createUser: utils.createUser,
  getIdListOfUserByField: utils.getIdListOfUserByField,
  getUserById: utils.getUserById,
  getUserAggById: utils.getUserAggById,
  getUserListByQuery: utils.getUserListByQuery,
  getUserStatsByQuery: utils.getUserStatsByQuery,
  getUserByQuery: utils.getUserByQuery,
  updateUserById: utils.updateUserById,
  updateUserByIdList: utils.updateUserByIdList,
  updateUserByQuery: utils.updateUserByQuery,
  deleteUserById: utils.deleteUserById,
  deleteUserByQuery: utils.deleteUserByQuery,
  getUserByEmail: utils.getUserByEmail,
  dbScriptGetUser: dbApiScripts.dbScriptGetUser,
  dbScriptUpdateUser: dbApiScripts.dbScriptUpdateUser,
  dbScriptRegisterUser: dbApiScripts.dbScriptRegisterUser,
  dbScriptDeleteUser: dbApiScripts.dbScriptDeleteUser,
  dbScriptListUsers: dbApiScripts.dbScriptListUsers,
  dbScriptUpdateUserrole: dbApiScripts.dbScriptUpdateUserrole,
  dbScriptUpdateUserpassword: dbApiScripts.dbScriptUpdateUserpassword,
  dbScriptGetBriefuser: dbApiScripts.dbScriptGetBriefuser,
};
