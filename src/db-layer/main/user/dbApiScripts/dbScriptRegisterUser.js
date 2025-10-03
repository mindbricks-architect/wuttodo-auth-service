// This script is written as api-specific
// This script is called from the RegisterUserManager

const { User } = require("models");
const { UserEntityCache } = require("./entity-cache-classes.js");

const { UserQueryCacheInvalidator } = require("./query-cache-classes");
const { HttpServerError, HttpError, BadRequestError } = require("common");

const { ElasticIndexer } = require("serviceCommon");

const { ServicePublisher } = require("serviceCommon");
const { Op } = require("sequelize");

async function raiseDbEvent(apiManager) {
  const dbEvent = apiManager.getDbEventTopic("create");

  try {
    const _publisher = new ServicePublisher(
      dbEvent,
      apiManager.user,
      apiManager.session,
      apiManager.requestId,
    );
    _publisher.publish();
  } catch (err) {
    console.log("DbEvent cant be published", dbEvent, err);
  }
}

async function updateIfExists(dataClause) {
  const dbDoc = await User.findByPk(dataClause.id);
  if (dbDoc) {
    delete dataClause.id;
    dataClause.isActive = true;
    await dbDoc.update(dataClause);
    return dbDoc;
  }
  return null;
}

async function checkForUniqueIndex(dataClause) {
  const whereClause = {
    email: dataClause.email,

    isActive: true,
  };
  const dbDoc = await User.findOne({ where: whereClause });
  if (dbDoc) {
    indexName = "email-index";
    throw new BadRequestError("errMsg_DuplicateUniqueIndexError:" + indexName);
  }

  return dbDoc;
}

const dbScriptRegisterUser = async (apiManager) => {
  const dataClause = apiManager.getDataClause();

  try {
    let updated = false;
    let dbData = null;

    // check for upsert
    if (dataClause.id) {
      updated = await updateIfExists(dataClause);
      dbData = updated ? updated.getData() : null;
    }

    if (!updated) {
      //check for unique index
      updated = await checkForUniqueIndex(dataClause);
      dbData = updated ? updated.getData() : null;
    }

    if (!updated) {
      const dbDoc = await User.create(dataClause);
      dbData = dbDoc ? dbDoc.getData() : null;
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
    queryCacheInvalidator.invalidateCache(dbData);

    await raiseDbEvent(apiManager, dataClause);

    return dbData;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.log(err);
    throw new HttpServerError(
      "errMsg_dbErrorWhenExecuting_dbScriptRegisterUser",
      {
        whereClause: null,
        dataClause: dataClause,
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
      },
    );
  }
};

module.exports = dbScriptRegisterUser;
