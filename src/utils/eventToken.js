const PublicObjectEvents = {};

const ProtectedObjectEvents = {};

const PrivateObjectEvents = {
  user: [
    "user-retrived",
    "user-updated",
    "user-registered",
    "user-deleted",
    "users-listed",
    "userrole-updated",
    "userpassword-updated",
    "briefuser-retrived",
  ],
};

const createAdminToken = async (session) => {
  // add all topics if superAdmin,saasAdmin,admin
  // add tenantLevel topics if tenantAdmin
  // add project-code condition
  // add tenantId condition tenantAdmin
  // add tenantId condition if superAdmin and saasAdmin if subscription request in tenantLevel

  const topics = [];
  for (const key of ObjectKeys(PublicObjectEvents)) {
    topics.push(...PublicObjectEvents[key]);
  }
  for (const key of ObjectKeys(ProtectedObjectEvents)) {
    topics.push(...ProtectedObjectEvents[key]);
  }
  for (const key of ObjectKeys(PrivateObjectEvents)) {
    topics.push(...PrivateObjectEvents[key]);
  }
};

const createUserToken = async (session) => {
  // add all public and protected topics
  // add only tenantLevel topics if multi tenant
  // add project-code condition
  // add tenantId condition if multi tenant
  // add all private topics
  // add userId ownerId condition for private topics
};

const createEventToken = async (session) => {
  if (!session) return null;
  const userRole = req.session.roleId;
  const adminRoles = ["superAdmin", "admin"];
  if (adminRoles.include[userRole]) {
    return await createAdminToken(session);
  }
  return await createUserToken(session);
};

module.export = createEventToken;
