const userFunctions = require("./user");

module.exports = {
  // main Database
  createUser: userFunctions.createUser,
  getIdListOfUserByField: userFunctions.getIdListOfUserByField,
  getUserById: userFunctions.getUserById,
  getUserAggById: userFunctions.getUserAggById,
  getUserListByQuery: userFunctions.getUserListByQuery,
  getUserStatsByQuery: userFunctions.getUserStatsByQuery,
  getUserByQuery: userFunctions.getUserByQuery,
  updateUserById: userFunctions.updateUserById,
  updateUserByIdList: userFunctions.updateUserByIdList,
  updateUserByQuery: userFunctions.updateUserByQuery,
  deleteUserById: userFunctions.deleteUserById,
  deleteUserByQuery: userFunctions.deleteUserByQuery,
  getUserByEmail: userFunctions.getUserByEmail,
  dbScriptGetUser: userFunctions.dbScriptGetUser,
  dbScriptUpdateUser: userFunctions.dbScriptUpdateUser,
  dbScriptRegisterUser: userFunctions.dbScriptRegisterUser,
  dbScriptDeleteUser: userFunctions.dbScriptDeleteUser,
  dbScriptListUsers: userFunctions.dbScriptListUsers,
  dbScriptUpdateUserrole: userFunctions.dbScriptUpdateUserrole,
  dbScriptUpdateUserpassword: userFunctions.dbScriptUpdateUserpassword,
  dbScriptGetBriefuser: userFunctions.dbScriptGetBriefuser,
};
