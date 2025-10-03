const jwt = require("jsonwebtoken");

const PublicObjectEvents = {};

const ProtectedObjectEvents = {};

const PrivateObjectEvents = {
  user: [
    "wuttodo-auth-service-user-retrived",
    "wuttodo-auth-service-user-updated",
    "wuttodo-auth-service-user-registered",
    "wuttodo-auth-service-user-deleted",
    "wuttodo-auth-service-users-listed",
    "wuttodo-auth-service-userrole-updated",
    "wuttodo-auth-service-userpassword-updated",
    "wuttodo-auth-service-briefuser-retrived",
  ],
};

const createAdminToken = async (session) => {
  // add all topics if superAdmin,saasAdmin,admin
  // add tenantLevel topics if tenantAdmin
  // add tenantId condition tenantAdmin
  // add tenantId condition if superAdmin and saasAdmin if subscription request in tenantLevel

  const topics = [];

  for (const key of Object.keys(PublicObjectEvents)) {
    topics.push(...PublicObjectEvents[key]);
  }
  for (const key of Object.keys(ProtectedObjectEvents)) {
    topics.push(...ProtectedObjectEvents[key]);
  }
  for (const key of Object.keys(PrivateObjectEvents)) {
    topics.push(...PrivateObjectEvents[key]);
  }

  const payload = {
    rights: [
      {
        topics: topics,
      },
    ],
  };

  const jwtKey = process.env.PROJECT_TOKEN_KEY ?? "realtime.token.key";
  return jwt.sign(payload, jwtKey);
};

const createUserToken = async (session) => {
  const topics = [];

  for (const key of Object.keys(PublicObjectEvents)) {
    topics.push(...PublicObjectEvents[key]);
  }

  for (const key of Object.keys(ProtectedObjectEvents)) {
    topics.push(...ProtectedObjectEvents[key]);
  }

  const payload = {
    rights: [
      {
        topics: topics,
      },
    ],
  };

  const privateTopics = [];
  for (const key of Object.keys(PrivateObjectEvents)) {
    privateTopics.push(...PrivateObjectEvents[key]);
  }

  payload.rights.push({
    topics: privateTopics,
    logic: {
      type: "eq",
      key: "_ownerId",
      value: session.userId,
    },
  });

  const jwtKey = process.env.PROJECT_TOKEN_KEY ?? "realtime.token.key";
  return jwt.sign(payload, jwtKey);
};

const createEventToken = async (session) => {
  if (!session) return null;
  const userRole = session.roleId;
  const adminRoles = ["superAdmin", "admin"];
  if (adminRoles.includes(userRole)) {
    return await createAdminToken(session);
  }
  return await createUserToken(session);
};

module.exports = createEventToken;
