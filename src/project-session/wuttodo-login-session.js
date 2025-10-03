const { User } = require("models");
const { createHexCode } = require("common");
const { hexaLogger } = require("common");
const { hashCompare, hashString } = require("common");
const path = require("path");
const fs = require("fs");

const {
  HttpServerError,
  ForbiddenError,
  NotAuthenticatedError,
  ErrorCodes,
} = require("common");

const { getRedisData, setRedisData } = require("common");

const { Op } = require("sequelize");

const { getUserByQuery, createUser, updateUserById } = require("dbLayer");

const WuttodoSession = require("./wuttodo-session");

class WuttodoLoginSession extends WuttodoSession {
  async #getUserFromDb(userField, userValue) {
    const where = {
      [Op.and]: [
        { [userField]: { [Op.eq]: userValue } },

        { isActive: { [Op.eq]: true } },
      ],
    };
    console.log("where", where);
    const user = await getUserByQuery(where);

    //check if the user is a root user and owner of this tenant

    return user;
  }

  async #getUserWithUsernamePassword(email, password) {
    console.log("check user with email", email);
    const user = await this.#getUserFromDb("email", email);

    if (!user) {
      throw new NotAuthenticatedError(
        "errMsg_UserNotFound",
        ErrorCodes.UserNotFound,
      );
    }

    const userPassword = user.password;

    if (!(hashCompare(password, userPassword) == true)) {
      throw new ForbiddenError(
        "errMsg_PasswordDoesntMatch",
        ErrorCodes.WrongPassword,
      );
    }

    return user;
  }

  async #getUserWithSsoSubject(userField, ssoSubject) {
    const user = await this.#getUserFromDb(userField, ssoSubject);
    if (!user) {
      throw new NotAuthenticatedError(
        "errMsg_UserNotFound",
        ErrorCodes.UserNotFound,
      );
    }
    return user;
  }

  async loginUser(byPassword, bySubject) {
    const session = {};
    let user = null;
    if (byPassword) {
      user = await this.#getUserWithUsernamePassword(
        byPassword.username ?? byPassword.email,
        byPassword.password,
      );
    } else if (bySubject) {
      user = await this.#getUserWithSsoSubject(
        bySubject.userField,
        bySubject.subjectClaim,
      );
    }

    if (!user) return null;

    if (bySubject && bySubject.userField == "email") {
      // since email comes from social login, it can be considered as verified
      user.emailVerified = true;
    }

    if (user.emailVerified !== true) {
      throw new ForbiddenError(
        "errMsg_EmailNotVerified",
        ErrorCodes.EmailVerificationNeeded,
      );
    }

    if (user.id === this.superAdminId) user.isAbsolute = true;
    session.isAbsolute = user.isAbsolute;

    session.id = byPassword
      ? createHexCode()
      : (bySubject?.sessionId ?? createHexCode());
    session.sessionId = session.id;
    session.hexaId = createHexCode();

    for (const key of Object.keys(user)) {
      if (key !== "id") session[key] = user[key];
    }
    if (!session.fullname && session.name) {
      session.fullname = `${session.name} ${session.surname}`;
    }

    session.userId = user.id;
    session._USERID = user.id;

    return session;
  }

  async relogin(req) {
    console.log("wuttodo session found but a relogin is requested");
    try {
      const userField = "id";
      const subjectClaim = this.session.userId;
      await this.setLoginToRequest(req, null, { userField, subjectClaim });
      await this.setServiceSession(req);
      req.sessionToken = this.accessToken;
    } catch (err) {
      console.log(err);
      throw new HttpServerError(
        "errMsg_CantReLoginAfterUserAuthConfigUpdate",
        err,
      );
    }
  }

  async setLoginToRequest(req, byPassword, bySubject) {
    if (
      byPassword &&
      (!byPassword.password || (!byPassword.username && !byPassword.email))
    ) {
      throw new NotAuthenticatedError(
        "errMsg_UserCanNotLoginWithoutCredentials",
        ErrorCodes.UserLoginWithoutCredentials,
      );
    }
    const session = await this.loginUser(byPassword, bySubject);

    session._USERID = session.userId;

    session.checkTokenMark = "wuttodo-inapp-token";
    session._USERID = session.userId;
    session.userBucketToken = await this.createBucketToken(session);
    await this.setSessionToEntityCache(session);

    req.session = session;
    const token = await this.createTokenFromSession(session, false);
    if (!token) {
      throw new HttpServerError("errMsg_LoginTokenCanNotBeCreated", {
        detail: "JWTLib couldnt create token",
      });
    }
    session.accessToken = token;
    this.session = req.session;
    this.sessionId = req.sessionId;
    req.auth = this;
    this.accessToken = token;
    this.tokenLocation = "cookie";
    req.sessionToken = this.accessToken;

    const cookieName = `wuttodo-access-token`;

    this.tokenName = cookieName;
  }

  async loginBySocialAccount(accountInfo, req, res, next) {
    console.log("loginBySocialAccount", accountInfo);
    const userField = accountInfo.userField;
    const subjectClaim = accountInfo[userField];

    if (!userField || !subjectClaim) {
      return next(
        new NotAuthenticatedError(
          "errMsg_UserCanNotLoginWithoutCredentials",
          ErrorCodes.UserLoginWithoutCredentials,
        ),
      );
    }

    // check if user exists in db
    const user = await this.#getUserFromDb(userField, subjectClaim);

    if (!user && accountInfo.allowRegister) {
      await setRedisData(
        accountInfo.socialCode,
        JSON.stringify(accountInfo),
        60 * 3,
      ); // store for 3 minutes
      res.status(200).send({
        type: "RegisterNeededForSocialLogin",
        message: "User not found, but registration is allowed.",
        socialCode: accountInfo.socialCode,
        accountInfo: accountInfo,
      });
      return;
    }

    try {
      await this.setLoginToRequest(req, null, { userField, subjectClaim });
      res.set(this.tokenName, this.accessToken);
      console.log("Session is created", this.session);
      res
        .cookie(this.tokenName, this.accessToken, {
          httpOnly: true,
          domain: process.env.COOKIE_URL,
        })
        .status(200)
        .send(this.session);
    } catch (err) {
      next(err);
    }
  }

  async init() {
    await this.initSuperAdmin();
    await this.initUserManager();
  }

  async initSuperAdmin() {
    try {
      const absUserData = {
        id: this.superAdminId,
        fullname: "Root User",
        email: "admin@aadmin.com",
        emailVerified: true,

        password: hashString("superadmin"),

        roleId: "superAdmin",
      };

      const { createUser, getUserById } = require("dbLayer");
      const absUser = await getUserById(absUserData.id);
      if (!absUser) {
        await createUser(absUserData);
      } else {
        delete absUserData.id;
        await updateUserById(this.superAdminId, absUserData);
      }
    } catch (err) {
      hexaLogger.insertError("Error while creating super admin user", err);
    }
  }

  async initUserManager() {
    try {
      const userManagerId = this.superAdminId.replaceAll("f", "b");
      const absUserData = {
        id: userManagerId,
        fullname: "User Manager",
        email: "user.manager@mindbrix.com",
        emailVerified: true,

        password: hashString("superadmin"),

        roleId: "userManager",
      };

      const { createUser, getUserById } = require("dbLayer");
      const absUser = await getUserById(absUserData.id);
      if (!absUser) {
        await createUser(absUserData);
      } else {
        delete absUserData.id;
        await updateUserById(userManagerId, absUserData);
      }
    } catch (err) {
      hexaLogger.insertError("Error while creating user manager user", err);
    }
  }

  async invalidateUserAuthInSession(userId) {
    const userKey = "hexasessionid:" + userId;
    const userAuthUpdateKey = "hexauserauthupdate:" + userId;
    const sessionId = await getRedisData(userKey);
    if (sessionId) {
      await setRedisData(userAuthUpdateKey, "true");
    }
  }
}

// Export the class
module.exports = WuttodoLoginSession;
