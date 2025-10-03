const { HttpServerError, BadRequestError } = require("common");

const { User } = require("models");
const { Op } = require("sequelize");
const { hexaLogger } = require("common");

const getUserListByQuery = async (query) => {
  try {
    if (!query || typeof query !== "object") {
      throw new BadRequestError(
        "Invalid query provided. Query must be an object.",
      );
    }

    const user = await User.findAll({
      where: { ...query, isActive: true },
    });

    //should i add not found error or only return empty array?
    if (!user || user.length === 0) return [];

    //      if (!user || user.length === 0) {
    //      throw new NotFoundError(
    //      `User with the specified criteria not found`
    //  );
    //}

    return user.map((item) => item.getData());
  } catch (err) {
    throw new HttpServerError(
      "errMsg_dbErrorWhenRequestingUserListByQuery",
      err,
    );
  }
};

module.exports = getUserListByQuery;
