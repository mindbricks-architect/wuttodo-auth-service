const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const { createSessionManager } = require("sessionLayer");
const createServiceController = require("./create-service-controller");

const initWithRestController = async (name, routeName, req, res) => {
  const restController = createServiceController(name, routeName, req, res);
  await restController.init();
};
const addSessionRoutes = () => {
  router.get("/currentuser", async (req, res) => {
    try {
      await initWithRestController("currentuser", "currentuser", req, res);
      if (req.session) {
        req.session.accessToken = req.auth.accessToken;
        res.status(200).send(req.session);
      } else {
        res.status(401).send("No login found");
      }
    } catch (err) {
      res.status(err.statusCode ?? 500).send(err.message);
    }
  });

  router.get("/publickey", (req, res, next) => {
    const fs = require("fs");
    const keyFolderName = process.env.KEYS_FOLDER ?? "keys";
    const keyId = req.query.keyId ?? global.currentKeyId;
    const keyPath = path.join(
      __dirname,
      "../../../" + keyFolderName + "/rsa.key.pub." + keyId,
    );
    console.log("loking for public key:", keyPath);

    const keyData = fs.existsSync(keyPath)
      ? fs.readFileSync(keyPath, "utf8")
      : null;
    if (!keyData) {
      return res.status(404).send("Public key not found");
    }
    res.status(200).json({ keyId: keyId, keyData });
  });

  router.get("/permissions", async (req, res) => {
    try {
      await initWithRestController("permissions", "permissions", req, res);
      if (req.auth) {
        console.log("asking for permissions of user:", req.session.userId);
        const pAll = await req.auth.getCurrentUserPermissions();
        res.status(200).send(pAll);
      } else {
        res.status(401).send("No login found");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  router.get("/rolepermissions", async (req, res) => {
    await initWithRestController(
      "rolepermissions",
      "rolepermissions",
      req,
      res,
    );
    try {
      if (req.auth) {
        console.log("asking for permissions of role:", req.session.roleId);
        const pAll = await req.auth.getCurrentRolePermissions();
        res.status(200).send(pAll);
      } else {
        res.status(401).send("No login found");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  router.get("/permissions/:permissionName", async (req, res) => {
    try {
      await initWithRestController("onepermission", "onepermission", req, res);
      const pName = req.params.permissionName;
      if (req.auth) {
        console.log("asking for permission filter of:", pName);
        const pFilter = await req.auth.getPermissionFilter(pName);
        res.status(200).send(pFilter);
      } else {
        res.status(401).send("No login found");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  router.get("/linksession", async (req, res) => {
    try {
      await initWithRestController("linksession", "linksession", req, res);
      const accessToken = req.query.token;

      const cookieName = process.env.COOKIE_NAME;
      res
        .cookie(cookieName, accessToken, {
          httpOnly: true,
          domain: process.env.COOKIE_URL,
        })
        .status(200)
        .send({
          cookieName,
          accessToken,
          domain: process.env.COOKIE_URL,
          currentuser: process.env.SERVICE_URL + "/currentuser",
        });
    } catch (err) {
      res.status(401).send(err.message);
    }
  });
};

const addLoginRoutes = () => {
  router.get("/login", (req, res) => {
    const filePath = path.join(__dirname, "login.html");
    let html = fs.readFileSync(filePath, "utf8");
    res.status(200).send(html);
  });

  router.post("/login", async (req, res, next) => {
    console.log("loginUserController", req.body);
    try {
      const restController = createServiceController(
        "login",
        "login",
        req,
        res,
      );
      await restController.init();

      const username = req.body.username;
      const password = req.body.password;
      const sessionManager = restController.sessionManager;

      if (restController.isMultiTenant)
        await sessionManager.readTenantIdFromRequest(req);
      await sessionManager.setLoginToRequest(req, { username, password }, null);

      if (sessionManager.accessToken) {
        restController.sessionToken = restController._req.sessionToken;
        restController.setTokenInResponse();
      }

      res.status(200).send(sessionManager.session);
    } catch (err) {
      console.error("Error in loginUserController:", err);
      res.status(500).send({
        errorCode: err.errorCode || "LoginFailed",
        errorMessage: err.message || "Login failed",
        status: err.status || 500,
        grpcStatus: err.grpcStatus || 500,
      });
    }
  });

  router.get("/relogin", async (req, res) => {
    req.userAuthUpdate = true;

    const restController = createServiceController(
      "relogin",
      "relogin",
      req,
      res,
    );
    await restController.init();

    const sessionManager = restController.sessionManager;
    if (sessionManager.accessToken) {
      restController.sessionToken = restController._req.sessionToken;
      restController.setTokenInResponse();
    }

    if (req.session) {
      res.status(200).send(req.session);
    } else {
      res.status(401).send("Can not relogin");
    }
  });

  router.post("/logout", async (req, res) => {
    // const loginSession = createSessionManager();
    // loginSession.logoutUserController(req, res, next);

    try {
      const restController = createServiceController(
        "logout",
        "logout",
        req,
        res,
      );
      await restController.init();

      const sessionManager = restController.sessionManager;

      console.log("logoutUserController", req.session?.userId);
      try {
        if (req.session) {
          console.log("deleting session from redis", req.session.sessionId);
          await sessionManager.deleteSessionFromEntityCache(
            req.session.sessionId,
          );
        }
      } catch (err) {
        console.log("Error while deleting session from redis", err.message);
      }

      // set cookie to be deleted
      restController.clearCookie();
    } catch (err) {
      console.log("Error while logging out", err.message);
    }
    res.status(200).send({
      status: "OK",
    });
  });
};

const getVerificationServicesRouter = () => {
  const verificationServicesRouter = require("../../verification-services");
  return verificationServicesRouter;
};

const getSessionRouter = () => {
  addSessionRoutes();
  return router;
};

const getLoginRouter = () => {
  addSessionRoutes();
  addLoginRoutes();
  return router;
};

module.exports = {
  getSessionRouter,
  getLoginRouter,
  getVerificationServicesRouter,
};
