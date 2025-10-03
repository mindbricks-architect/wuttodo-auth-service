const { ServicePublisher } = require("serviceCommon");

// User Event Publisher Classes

// Publisher class for getUser api
const { UserRetrivedTopic } = require("./topics");
class UserRetrivedPublisher extends ServicePublisher {
  constructor(user, session, requestId) {
    super(UserRetrivedTopic, user, session, requestId);
  }

  static async Publish(user, session, requestId) {
    const _publisher = new UserRetrivedPublisher(user, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for updateUser api
const { UserUpdatedTopic } = require("./topics");
class UserUpdatedPublisher extends ServicePublisher {
  constructor(user, session, requestId) {
    super(UserUpdatedTopic, user, session, requestId);
  }

  static async Publish(user, session, requestId) {
    const _publisher = new UserUpdatedPublisher(user, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for registerUser api
const { UserRegisteredTopic } = require("./topics");
class UserRegisteredPublisher extends ServicePublisher {
  constructor(user, session, requestId) {
    super(UserRegisteredTopic, user, session, requestId);
  }

  static async Publish(user, session, requestId) {
    const _publisher = new UserRegisteredPublisher(user, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for deleteUser api
const { UserDeletedTopic } = require("./topics");
class UserDeletedPublisher extends ServicePublisher {
  constructor(user, session, requestId) {
    super(UserDeletedTopic, user, session, requestId);
  }

  static async Publish(user, session, requestId) {
    const _publisher = new UserDeletedPublisher(user, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for listUsers api
const { UsersListedTopic } = require("./topics");
class UsersListedPublisher extends ServicePublisher {
  constructor(users, session, requestId) {
    super(UsersListedTopic, users, session, requestId);
  }

  static async Publish(users, session, requestId) {
    const _publisher = new UsersListedPublisher(users, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for updateUserRole api
const { UserroleUpdatedTopic } = require("./topics");
class UserroleUpdatedPublisher extends ServicePublisher {
  constructor(userrole, session, requestId) {
    super(UserroleUpdatedTopic, userrole, session, requestId);
  }

  static async Publish(userrole, session, requestId) {
    const _publisher = new UserroleUpdatedPublisher(
      userrole,
      session,
      requestId,
    );
    await _publisher.publish();
  }
}

// Publisher class for updateUserPassword api
const { UserpasswordUpdatedTopic } = require("./topics");
class UserpasswordUpdatedPublisher extends ServicePublisher {
  constructor(userpassword, session, requestId) {
    super(UserpasswordUpdatedTopic, userpassword, session, requestId);
  }

  static async Publish(userpassword, session, requestId) {
    const _publisher = new UserpasswordUpdatedPublisher(
      userpassword,
      session,
      requestId,
    );
    await _publisher.publish();
  }
}

// Publisher class for getBriefUser api
const { BriefuserRetrivedTopic } = require("./topics");
class BriefuserRetrivedPublisher extends ServicePublisher {
  constructor(briefuser, session, requestId) {
    super(BriefuserRetrivedTopic, briefuser, session, requestId);
  }

  static async Publish(briefuser, session, requestId) {
    const _publisher = new BriefuserRetrivedPublisher(
      briefuser,
      session,
      requestId,
    );
    await _publisher.publish();
  }
}

module.exports = {
  UserRetrivedPublisher,
  UserUpdatedPublisher,
  UserRegisteredPublisher,
  UserDeletedPublisher,
  UsersListedPublisher,
  UserroleUpdatedPublisher,
  UserpasswordUpdatedPublisher,
  BriefuserRetrivedPublisher,
};
