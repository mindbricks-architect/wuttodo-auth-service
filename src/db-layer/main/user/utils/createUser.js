const { HttpServerError, BadRequestError } = require("common");

const { ElasticIndexer } = require("serviceCommon");

const { User } = require("models");
const { hexaLogger, newUUID } = require("common");

const indexDataToElastic = async (data) => {
  const elasticIndexer = new ElasticIndexer("user");
  await elasticIndexer.indexData(data);
};

const validateData = (data) => {
  const requiredFields = [
    "email",
    "password",
    "fullname",
    "roleId",
    "emailVerified",
  ];

  requiredFields.forEach((field) => {
    if (data[field] === null || data[field] === undefined) {
      throw new BadRequestError(
        `Field "${field}" is required and cannot be null or undefined.`,
      );
    }
  });

  if (!data.id) {
    data.id = newUUID();
  }
};

const createUser = async (data) => {
  try {
    validateData(data);

    const newuser = await User.create(data);
    const _data = newuser.getData();
    await indexDataToElastic(_data);
    return _data;
  } catch (err) {
    throw new HttpServerError("errMsg_dbErrorWhenCreatingUser", err);
  }
};

module.exports = createUser;
