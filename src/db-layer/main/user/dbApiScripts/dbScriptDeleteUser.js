// This script is written as api-specific
// This script is called from the DeleteUserManager

const { User } = require("models");
const { UserEntityCache } = require("./entity-cache-classes.js");

const { UserQueryCacheInvalidator } = require("./query-cache-classes");
const { HttpServerError, HttpError, NotFoundError } = require("common");

const { ElasticIndexer } = require("serviceCommon");

const { ServicePublisher } = require("serviceCommon");

const { Op } = require("sequelize");

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

async function raiseDbEvent(apiManager) {
  const dbEvent = apiManager.getDbEventTopic("delete");

  try {
    const _publisher = new ServicePublisher(
      dbEvent,
      apiManager.user,
      apiManager.session,
      apiManager.requestId,
    );
    await _publisher.publish();
  } catch (err) {
    console.log("DbEvent cant be published", dbEvent, err);
  }
}

const dbScriptDeleteUser = async (apiManager) => {
  const whereClause = apiManager.whereClause;

  try {
    let rowsCount = null;
    let dbDoc = null;
    [rowsCount, [dbDoc]] = await User.update(
      { isActive: false },
      {
        where: whereClause,
        returning: true,
      },
    );
    const dbData = dbDoc ? dbDoc.getData() : null;

    if (!dbData) {
      throw new NotFoundError("errMsg_RecordNotFoundToDelete");
    }

    apiManageruser = dbData;

    const entityCacher = new UserEntityCache();
    entityCacher.defaultId = dbData.id;
    entityCacher.delEntityFromCache(dbData.id);

    const elasticIndexer = new ElasticIndexer(
      "user",
      apiManager.session,
      apiManager.requestId,
    );
    await elasticIndexer.deleteData(dbData.id);

    // invalidate the query caches that are related with this object's old state
    const queryCacheInvalidator = new UserQueryCacheInvalidator();
    const oldDbData = apiManager.getInstance();
    queryCacheInvalidator.invalidateCache(oldDbData);

    await raiseDbEvent(apiManager);

    return dbData;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.log(err);
    throw new HttpServerError(
      "errMsg_dbErrorWhenExecuting_dbScriptDeleteUser",
      {
        whereClause: normalizeSequalizeOps(whereClause),
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
      },
    );
  }
};

module.exports = dbScriptDeleteUser;
