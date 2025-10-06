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

    const current_user = data.id ? await User.findByPk(data.id) : null;
    let newuser = null;

    if (current_user) {
      delete data.id;
      data.isActive = true;
      await current_user.update(data);
      newuser = current_user;
    }

    if (!newuser) {
      newuser = await User.create(data);
    }

    const _data = newuser.getData();
    await indexDataToElastic(_data);
    return _data;
  } catch (err) {
    throw new HttpServerError("errMsg_dbErrorWhenCreatingUser", err);
  }
};

module.exports = createUser;
