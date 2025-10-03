const { EntityCache } = require("common");

class UserEntityCache extends EntityCache {
  constructor() {
    super("user", ["email"]);
  }

  async getUserById(userId) {
    const result = await this.getEntityFromCache(userId);
    return result;
  }

  async getUsers(input) {
    const query = {};

    const result = await this.selectEntityFromCache(query);
    return result;
  }
}

module.exports = {
  UserEntityCache,
};
