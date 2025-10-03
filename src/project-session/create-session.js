module.exports = {
  createSession: () => {
    const SessionManager = require("./wuttodo-login-session");
    return new SessionManager();
  },
};
