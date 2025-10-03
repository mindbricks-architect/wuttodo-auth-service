const { HttpServerError, NotFoundError } = require("common");
const { hexaLogger } = require("common");

const { User } = require("models");
const { Op } = require("sequelize");

const getUserAggById = async (userId) => {
  try {
    const forWhereClause = false;
    const includes = [];

    const user = Array.isArray(userId)
      ? await User.findAll({
          where: {
            id: { [Op.in]: userId },
            isActive: true,
          },
          include: includes,
        })
      : await User.findOne({
          where: {
            id: userId,
            isActive: true,
          },
          include: includes,
        });

    if (!user) {
      return null;
    }

    const userData =
      Array.isArray(userId) && userId.length > 0
        ? user.map((item) => item.getData())
        : user.getData();
    await User.getCqrsJoins(userData);
    return userData;
  } catch (err) {
    throw new HttpServerError("errMsg_dbErrorWhenRequestingUserAggById", err);
  }
};

module.exports = getUserAggById;
