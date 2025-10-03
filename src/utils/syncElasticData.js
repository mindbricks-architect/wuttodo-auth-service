const { getUserById, getIdListOfUserByField } = require("dbLayer");
const path = require("path");
const fs = require("fs");
const { ElasticIndexer } = require("serviceCommon");

const indexUserData = async () => {
  const userIndexer = new ElasticIndexer("user", { isSilent: true });
  console.log("Starting to update indexes for User");

  const idList = (await getIdListOfUserByField("isActive", true)) ?? [];
  const chunkSize = 500;
  let total = 0;
  for (let i = 0; i < idList.length; i += chunkSize) {
    const chunk = idList.slice(i, i + chunkSize);
    const dataList = await getUserById(chunk);
    if (dataList.length) {
      await userIndexer.indexBulkData(dataList);
      await userIndexer.deleteRedisCache();
    }
    total += dataList.length;
  }

  return total;
};

const syncElasticIndexData = async () => {
  const startTime = new Date();
  console.log("syncElasticIndexData started", startTime);

  try {
    const dataCount = await indexUserData();
    console.log("User agregated data is indexed, total users:", dataCount);
  } catch (err) {
    console.log("Elastic Index Error When Syncing User data", err.toString());
  }

  const elapsedTime = new Date() - startTime;
  console.log("initElasticIndexData ended -> elapsedTime:", elapsedTime);
};

module.exports = syncElasticIndexData;
