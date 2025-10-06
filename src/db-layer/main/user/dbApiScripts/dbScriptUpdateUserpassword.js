// This script is written as api-specific
// This script is called from the UpdateUserPasswordManager

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

async function getEventPayload(apiManager, dataClause) {
  const oldData = apiManager.getInstance();
  const newData = apiManager.user;
  return {
    old_user: oldData,
    user: newData,
    oldDataValues: getOldDataValues(dataClause, oldData),
    newDataValues: getNewDataValues(dataClause, newData),
  };
}

function getOldDataValues(dataClause, oldDbData) {
  const values = {};
  for (const propName of Object.keys(dataClause ?? {})) {
    values[propName] = oldDbData ? oldDbData[propName] : undefined;
  }
  return values;
}

function getNewDataValues(dataClause, newDbData) {
  const values = {};
  for (const propName of Object.keys(this.dataClause ?? {})) {
    values[propName] = newDbData ? newDbData[propName] : undefined;
  }
  return values;
}

async function raiseDbEvent(apiManager, dataClause) {
  const dbEvent = apiManager.getDbEventTopic("update");

  try {
    const _publisher = new ServicePublisher(
      dbEvent,
      await getEventPayload(apiManager, dataClause),
      apiManager.session,
      apiManager.requestId,
    );
    await _publisher.publish();
  } catch (err) {
    console.log("DbEvent cant be published", dbEvent, err);
  }
}

const dbScriptUpdateUserpassword = async (apiManager) => {
  const whereClause = apiManager.whereClause;
  const dataClause = apiManager.getDataClause();

  try {
    for (const key of Object.keys(dataClause)) {
      if (dataClause[key] === undefined) {
        delete dataClause[key];
      }
    }

    let rowsCount = null;
    let dbDoc = null;
    [rowsCount, [dbDoc]] = await User.update(dataClause, {
      where: whereClause,
      returning: true,
    });
    const dbData = dbDoc ? dbDoc.getData() : null;

    if (!dbData) {
      throw new NotFoundError("errMsg_RecordNotFound");
    }

    apiManager.user = dbData;

    const entityCacher = new UserEntityCache();
    entityCacher.defaultId = dbData.id;
    await entityCacher.saveEntityToCache(dbData);

    const elasticIndexer = new ElasticIndexer(
      "user",
      apiManager.session,
      apiManager.requestId,
    );
    await elasticIndexer.indexData(dbData);

    // invalidate the query caches that are related with this object's old and new state
    const queryCacheInvalidator = new UserQueryCacheInvalidator();
    const oldDbData = apiManager.getInstance();
    queryCacheInvalidator.invalidateCache(dbData);
    queryCacheInvalidator.invalidateCache(oldDbData);

    await raiseDbEvent(apiManager, dataClause);

    return dbData;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.log(err);
    throw new HttpServerError(
      "errMsg_dbErrorWhenExecuting_dbScriptUpdateUserpassword",
      {
        whereClause: normalizeSequalizeOps(whereClause),
        dataClause: dataClause,
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
        checkoutResult: apiManager.checkoutResult,
      },
    );
  }
};

module.exports = dbScriptUpdateUserpassword;
