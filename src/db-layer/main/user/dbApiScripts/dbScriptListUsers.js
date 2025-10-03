// This script is written as api-specific
// This script is called from the ListUsersManager

const { User } = require("models");
const { HttpServerError, HttpError } = require("common");

const { Op } = require("sequelize");

const { UserQueryCache } = require("./query-cache-classes");

function normalizeSequalizeOps(seqObj) {
  if (typeof seqObj !== "object") return seqObj;
  if (!seqObj) return null;
  const keys = Object.keys(seqObj);
  const symbolKeys = Object.getOwnPropertySymbols(seqObj);
  const newObj = {};
  for (const key of keys) {
    seqObj[key] = normalizeSequalizeOps(seqObj[key]);
  }

  for (const key of symbolKeys) {
    let index = 0;
    let newKey = "";
    if (key == Op.eq) newKey = "$op.eq";
    if (key == Op.in) newKey = "$op.in";
    if (key == Op.and) newKey = "$op.and";
    if (key == Op.or) newKey = "$op.or";
    if (key == Op.notIn) newKey = "$op.notIn";
    if (key == Op.not) newKey = "$op.not";
    if (key == Op.ne) newKey = "$op.ne";
    if (newKey) {
      seqObj[newKey] = seqObj[key];
      delete seqObj[key];
    } else {
      newKey = key;
    }
    if (Array.isArray(seqObj[newKey])) {
      seqObj[newKey] = seqObj[newKey].map((item) =>
        normalizeSequalizeOps(item),
      );
    } else {
      seqObj[newKey] = normalizeSequalizeOps(seqObj[newKey]);
    }
  }
  return seqObj;
}

const dbScriptListUsers = async (apiManager) => {
  const whereClause = apiManager.whereClause;
  try {
    const queryCacher = new UserQueryCache(apiManager, whereClause);
    const cacheData = await queryCacher.readQueryResult();
    apiManager.cacheKey = queryCacher.queryKey;

    if (cacheData) {
      apiManager.dbData = cacheData;
      apiManager.dbData._source = "cache";
      apiManager.dbData_cacheKey = queryCacher.queryKey;
      apiManager.users = cacheData.items;
      return apiManager.dbData;
    }

    let options = { where: whereClause };
    const sortBy = apiManager.getSortBy();
    options.order = sortBy ?? [["id", "ASC"]];

    if (apiManager.pagination) {
      options.limit = apiManager.pagination.pageRowCount;
      options.offset =
        apiManager.pagination.pageRowCount *
        (apiManager.pagination.pageNumber - 1);
    }

    const selectList = apiManager.getSelectList() ?? [];
    if (selectList.length) {
      options.attributes = selectList;
    }

    let userList = await User.findAll(options);

    const dbData = { items: [] };
    apiManager.users = [];
    if (!userList || userList.length == 0) return dbData;

    dbData.items = Array.isArray(userList) ? userList : [userList];
    dbData.items = dbData.items.map((item) => item.getData());

    dbData.totalRowCount = dbData.items.length;
    dbData.pageCount = 1;

    if (apiManager.pagination) {
      let attributes = [
        [sequelize.literal('COUNT(DISTINCT("user".id))'), "_COUNT"],
      ];
      let user_count = await User.findAll({
        where: whereClause,
        raw: true,
        attributes,
      });
      user_count = user_count && user_count.length ? user_count[0]._COUNT : 0;
      user_count = isNaN(user_count) ? user_count : parseInt(user_count);
      userList = {
        rows: userList,
        count: user_count,
      };
      dbData.totalRowCount = user_count;
      dbData.pageCount = Math.ceil(
        dbData.totalRowCount / apiManager.pagination.pageRowCount,
      );
    }

    apiManager.users = dbData.items;

    queryCacher.writeQueryResult(dbData, apiManager.cacheTTL ?? 500);
    dbData._cacheKey = queryCacher.queryKey;
    dbData._source = "db";

    return dbData;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.log(err);
    throw new HttpServerError("errMsg_dbErrorWhenExecuting_dbScriptListUsers", {
      whereClause: normalizeSequalizeOps(whereClause),
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
    });
  }
};

module.exports = dbScriptListUsers;
