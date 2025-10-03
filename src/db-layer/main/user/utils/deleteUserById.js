//ask about this no other option other than softdelete
const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");
const { User } = require("models");
const { ElasticIndexer } = require("serviceCommon");

const deleteUserById = async (id) => {
  try {
    if (typeof id === "object") {
      id = id.id;
    }
    if (!id)
      throw new BadRequestError("ID is required in utility delete function");

    const existingDoc = await User.findOne({ where: { id, isActive: true } });
    if (!existingDoc) {
      throw new NotFoundError(`Record with ID ${id} not found.`);
    }
    const dataClause = { isActive: false };
    await existingDoc.update(dataClause);

    const elasticIndexer = new ElasticIndexer("user");
    await elasticIndexer.deleteData(existingDoc.id);

    return existingDoc.getData();
  } catch (err) {
    throw new HttpServerError(
      "An unexpected error occurred during the delete operation.",
      err,
    );
  }
};

module.exports = deleteUserById;
