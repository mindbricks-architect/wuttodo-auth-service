const express = require("express");

const fs = require("fs");
const path = require("path");
const z = require("zod");

const createServiceController = require("./create-service-controller");

const initWithMcpController = async (name, routeName, mcpParams) => {
  const mcpController = createServiceController(name, routeName, mcpParams);
  return await mcpController.init();
};

/*
  // sample mcpCOntroller Object
  mcpRouter.push(
    {
      name: "currentuser",
      description: "get the session data of the current user that logged in and has the current token in the request",
      parameters: {},
      controller:  async (mcpParams) => {
        await initWithMcpController("currentuser", "currentuser",mcpParams );
        mcpParams.headers =  headers;
        try {

        } catch (err) {
          return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${err.message}`,
            },
          ],
          };
          
        }
      }
    }
  )

*/

const addSessionRoutes = (mcpRouter, headers, tenantName) => {
  const parameters = {};
  if (tenantName) {
    parameters[tenantName + "Codename"] = z
      .string(255)
      .optional()
      .describe(
        "Write the unique codename of the " +
          tenantName +
          " so that your request will be autheticated and handled in your tenant scope.Keep empty to access saas level.",
      );
  }
  parameters.accessToken = z
    .string()
    .optional()
    .describe(
      "The access token which is returned from a login request or given by user. This access token will override if there is any bearer or OAuth token in the mcp client. If not given the request will be made with the system (bearer or OAuth) token. For public routes you dont need to deifne any access token.",
    );
  mcpRouter.push({
    name: "currentuser",
    description:
      "get the session data of the current user that logged in and has the current token in the request",
    parameters,
    controller: async (mcpParams) => {
      mcpParams.headers = headers;

      const request = await initWithMcpController(
        "currentuser",
        "currentuser",
        mcpParams,
      );

      try {
        if (request.session) {
          request.session.accessToken = request.auth.accessToken;
        } else {
          new Error("No token found.Login requried");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(request.session),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${err.message}`,
            },
          ],
        };
      }
    },
  });

  /*
  router.get("/currentuser", async (req, res) => {
    await initWithMcpController("currentuser", "currentuser", req, res);
    if (req.session) {
      req.session.accessToken = req.auth.accessToken;
      res.status(200).send(req.session);
    } else {
      res.status(401).send("No login found");
    }
  });

  router.get("/publickey", (req, res, next) => {
    const fs = require("fs");
    keyFolderName = process.env.KEYS_FOLDER ?? "keys";
    const keyId = req.query.keyId ?? global.currentKeyId;
    const keyPath = path.join(
      __dirname,
      "../../../" + keyFolderName + "/rsa.key.pub." + keyId
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
    await initWithRestController("permissions", "permissions", req, res);
    try {
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
      res
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
    await initWithRestController("onepermission", "onepermission", req, res);
    try {
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
    await initWithRestController("linksession", "linksession", req, res);
    try {
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

  */
};

const addLoginRoutes = (mcpRouter, headers, tenantName) => {
  const parameters = {};

  if (tenantName) {
    parameters[tenantName + "Codename"] = z
      .string(255)
      .optional()
      .describe(
        "Write the unique codename of the " +
          tenantName +
          " so that your login request will be autheticated and handled in your tenant scope. Keep empty to login saas level.",
      );
  }

  parameters.username = z
    .string(255)
    .email()
    .describe("The email of the registered user to login.");
  parameters.password = z
    .string(255)
    .describe("The password of the registered user to login.");

  mcpRouter.push({
    name: "login",
    description:
      "login with username and password. Get the access token from  the response and use it for your future requests for the given user. The access token given in the tool parameters will override the any bearer token or cookie.",
    parameters,
    controller: async (mcpParams) => {
      mcpParams.headers = headers;

      try {
        const mcpController = createServiceController(
          "login",
          "login",
          mcpParams,
        );
        await mcpController.init();

        const username = mcpParams.username;
        const password = mcpParams.password;
        const sessionManager = mcpController.sessionManager;

        if (mcpController.isMultiTenant)
          await sessionManager.readTenantIdFromRequest(mcpController.request);
        await sessionManager.setLoginToRequest(
          mcpController.request,
          { username, password },
          null,
        );

        sessionManager.session.accessToken = sessionManager.accessToken;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sessionManager.session),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${err.message}`,
            },
          ],
        };
      }
    },
  });

  /*
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
        res
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
      res.status(500).send("Login failed: " + err.message);
    }
  });

  router.get("/relogin", async (req, res) => {
    req.userAuthUpdate = true;

    const restController = createServiceController(
      "relogin",
      "relogin",
      req,
      res
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
    const restController = createServiceController(
      "logout",
      "logout",
      req,
      res
    );
    await restController.init();

    const sessionManager = restController.sessionManager;

    console.log("logoutUserController", req.session?.userId);
    try {
      try {
        if (req.session) {
          console.log("deleting session from redis", req.session.sessionId);
          await sessionManager.deleteSessionFromEntityCache(
            req.session.sessionId
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
    res.status(200).send("LOGOUT OK");
  });
  */
};

const getVerificationServicesRouter = () => {
  //const verificationServicesRouter = require("../../verification-services");
  //return verificationServicesRouter;
  return [];
};

const getSessionRouter = (headers, tenantName) => {
  const router = [];
  addSessionRoutes(router, headers, tenantName);
  return router;
};

const getLoginRouter = (headers, tenantName) => {
  const router = [];
  addSessionRoutes(router, headers, tenantName);
  addLoginRoutes(router, headers, tenantName);
  return router;
};

module.exports = {
  getSessionRouter,
  getLoginRouter,
  getVerificationServicesRouter,
};
