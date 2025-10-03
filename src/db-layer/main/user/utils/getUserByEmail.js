const {
  HttpServerError,
  BadRequestError,
  NotAuthenticatedError,
  ForbiddenError,
  NotFoundError,
} = require("common");
const { hexaLogger } = require("common");
const { User } = require("models");
const { Op } = require("sequelize");

const getUserByEmail = async (email) => {
  try {
    const user = await User.findOne({
      where: {
        email: email,
        isActive: true,
      },
    });

    if (!user) {
      return null;
    }
    return user.getData();
  } catch (err) {
    throw new HttpServerError("errMsg_dbErrorWhenRequestingUserByEmail", err);
  }
};

module.exports = getUserByEmail;
