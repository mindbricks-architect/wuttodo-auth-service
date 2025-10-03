const mainFunctions = require("./main");

module.exports = {
  // main Database
  createUser: mainFunctions.createUser,
  getIdListOfUserByField: mainFunctions.getIdListOfUserByField,
  getUserById: mainFunctions.getUserById,
  getUserAggById: mainFunctions.getUserAggById,
  getUserListByQuery: mainFunctions.getUserListByQuery,
  getUserStatsByQuery: mainFunctions.getUserStatsByQuery,
  getUserByQuery: mainFunctions.getUserByQuery,
  updateUserById: mainFunctions.updateUserById,
  updateUserByIdList: mainFunctions.updateUserByIdList,
  updateUserByQuery: mainFunctions.updateUserByQuery,
  deleteUserById: mainFunctions.deleteUserById,
  deleteUserByQuery: mainFunctions.deleteUserByQuery,
  getUserByEmail: mainFunctions.getUserByEmail,
  dbScriptGetUser: mainFunctions.dbScriptGetUser,
  dbScriptUpdateUser: mainFunctions.dbScriptUpdateUser,
  dbScriptRegisterUser: mainFunctions.dbScriptRegisterUser,
  dbScriptDeleteUser: mainFunctions.dbScriptDeleteUser,
  dbScriptListUsers: mainFunctions.dbScriptListUsers,
  dbScriptUpdateUserrole: mainFunctions.dbScriptUpdateUserrole,
  dbScriptUpdateUserpassword: mainFunctions.dbScriptUpdateUserpassword,
  dbScriptGetBriefuser: mainFunctions.dbScriptGetBriefuser,
};
