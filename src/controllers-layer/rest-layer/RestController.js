const { hexaLogger } = require("common");
const c = require("config");
const { createSessionManager } = require("sessionLayer");

class RestController {
  constructor(name, routeName, req, res) {
    this.name = name;
    this.routeName = routeName;
    this.apiManager = null;
    this.response = {};
    this.businessOutput = null;
    this.crudType = "get";
    this.status = 200;
    this.dataName = "resData";
    this._req = req;
    this._res = res;
    this.requestId = req.requestId;
    this.redirectUrl = null;
    this.projectCodename = null;
    this.isMultiTenant = false;
    this.tenantName = "tenant";
    this.tenantId = "tenantId";
    this.sessionManager = null;
  }

  async createApiManager() {}

  async init() {
    if (this.isMultiTenant) this.readTenant();
    this.sessionToken = this.readSessionToken();
    this._req.sessionToken = this.sessionToken;
    if (this.isMultiTenant) {
      this._req[this.tenantName + "Codename"] =
        this[this.tenantName + "Codename"];
      this._req.tenantCodename = this[this.tenantName + "Codename"];
    }

    this.sessionManager = await createSessionManager(this._req);
    if (!["/login", "/linksession", "/favicon.ico"].includes(this._req.path))
      await this.sessionManager.verifySessionToken(this._req);

    if (this.isLoginApi) {
      if (
        this._req.session &&
        (this._req.userAuthUpdate || this._req.session.userAuthUpdate)
      ) {
        await this.sessionManager.relogin(this._req);
      }
    }
  }

  readTenant() {
    // read tenantId or tenantCodename from the request
    console.log(
      "Reading tenant information from the rest request in rest controller",
    );

    const request = this._req;
    const tenantNameHeaderName = `mbx-${this.tenantName}-codename`;
    const tenantCodename = `${this.tenantName}Codename`;

    const _tenantName = `_${this.tenantName}`;

    // read tenant codename from query

    this[tenantCodename] = request.headers[tenantNameHeaderName];
    if (!this[tenantCodename]) {
      console.log(
        `Tenant codename not found in header: ${tenantNameHeaderName}`,
      );
    } else {
      console.log(
        `Tenant codename found in header: ${tenantNameHeaderName}`,
        this[tenantCodename],
      );
    }

    this[tenantCodename] = request.body[_tenantName];
    if (!this[tenantCodename]) {
      console.log(`Tenant codename not found in body: ${_tenantName}`);
    } else {
      console.log(
        `Tenant codename found in body: ${_tenantName}`,
        this[tenantCodename],
      );
    }

    this[tenantCodename] = request.query[_tenantName];
    if (!this[tenantCodename]) {
      console.log(`Tenant codename not found in query: ${_tenantName}`);
    } else {
      console.log(
        `Tenant codename found in query: ${_tenantName}`,
        this[tenantCodename],
      );
    }

    // If the codename is not set, try to read it from the url path if exists with $
    if (request.pathTenantCodename) {
      this[tenantCodename] = request.pathTenantCodename;

      console.log(
        `Tenant codename set from path tenantCodename: ${this[tenantCodename]}`,
        request.url,
      );
    } else {
      console.log("No tenant codename found in path");
    }

    if (!this[tenantCodename]) {
      this[tenantCodename] = "root";
      console.log("No tenant codename found, using default 'root'");
    }
    this.tenantCodename = this[tenantCodename];
    console.log("Final tenant codename:", this.tenantCodename);
  }

  getCookieToken(cookieName) {
    const request = this._req;
    if (!request || !request.headers) return null;
    const cookieHeader = request.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split("; ");
      const tokenCookie = cookies.find((cookie) => {
        return cookie.startsWith(cookieName + "=");
      });

      if (tokenCookie) {
        return tokenCookie.split("=")[1];
      }
    }
  }

  getBearerToken() {
    const request = this._req;
    const authorization =
      request.headers.authorization || request.headers.Authorization;
    if (authorization) {
      const authParts = authorization.split(" ");
      if (authParts.length === 2) {
        if (authParts[0] === "Bearer" || authParts[0] === "bearer") {
          const bearerToken = authParts[1];
          if (bearerToken && bearerToken !== "null") {
            return bearerToken;
          }
        }
      }
    }

    return null;
  }

  readSessionToken() {
    const request = this._req;

    let sessionToken;
    sessionToken = request.query["access_token"];
    if (sessionToken) {
      console.log("Token extracted:", "query", "access_token");
      return sessionToken;
    }

    sessionToken = this.getBearerToken();
    if (sessionToken) {
      console.log("Token extracted:", "bearer token");
      return sessionToken;
    }

    if (this.isMultiTenant) {
      // check if there is any header of the application
      const headerName =
        this.projectCodename + "-access-token-" + this.tenantCodename;
      sessionToken =
        request.headers[headerName] ||
        request.headers[headerName.toLowerCase()];
      if (sessionToken) {
        console.log("Tenant Token extracted:", "header", headerName);
        return sessionToken;
      }
    } else {
      // check if there is any header of the application
      const headerName = this.projectCodename + "-access-token-";
      sessionToken =
        request.headers[headerName] ||
        request.headers[headerName.toLowerCase()];
      if (sessionToken) {
        console.log("Token extracted:", "header", headerName);
        return sessionToken;
      }
    }

    if (this.isMultiTenant) {
      let cookieName = `${this.projectCodename}-access-token-${this.tenantCodename}`;
      sessionToken = this.getCookieToken(cookieName, request);
      if (!sessionToken && this.tenantCodename === "root") {
        // if tenantCodename is root, try to get the token from the default cookie name
        // this is useful for the root tenant to access the token without tenant codename
        cookieName = `${this.projectCodename}-access-token`;
        sessionToken = this.getCookieToken(cookieName, request);
      }
      if (sessionToken) {
        console.log("Tenant Token extracted:", "cookie", cookieName);
        this.currentCookieName = cookieName;
        return sessionToken;
      }
    } else {
      const cookieName = `${this.projectCodename}-access-token`;
      sessionToken = this.getCookieToken(cookieName, request);
      if (sessionToken) {
        console.log("Token extracted:", "cookie", cookieName);
        this.currentCookieName = cookieName;
        return sessionToken;
      }
    }
    return null;
  }

  setTokenInResponse() {
    const tokenName = this.isMultiTenant
      ? `${this.projectCodename}-access-token-${this.tenantCodename}`
      : `${this.projectCodename}-access-token`;
    if (this.sessionToken) {
      this._res.cookie(tokenName, this.sessionToken, {
        httpOnly: true,
        domain: process.env.COOKIE_URL,
        sameSite: "None",
        secure: true,
      });
      this._res.set(tokenName, this.sessionToken);
    }
  }

  clearCookie() {
    const tokenName = this.isMultiTenant
      ? `${this.projectCodename}-access-token-${this[this.tenantCodename]}`
      : `${this.projectCodename}-access-token`;
    this._res.clearCookie(tokenName, {
      httpOnly: true,
      domain: process.env.COOKIE_URL,
      sameSite: "None",
      secure: true,
    });
  }

  async redirect() {
    if (this.redirectUrl || this.apiManager.redirectUrl)
      return this._res.redirect(
        this.apiManager.redirectUrl ?? this.redirectUrl,
      );
    return false;
  }

  async doDownload() {
    //return await this.apiManager.doDownload(this._res);
  }

  async _logRequest() {
    hexaLogger.insertInfo(
      "RestRequestReceived",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      {
        method: this._req.method,
        url: this._req.url,
        body: this._req.body,
        query: this._req.query,
        params: this._req.params,
        headers: this._req.headers,
      },
      this.requestId,
    );
    console.group();
    console.log("    ");
    console.log(">>>");
    console.log(">>>");
    console.log("------------------------------------------------------------");
    console.log("RestRequestReceived", this._req.url, new Date().toISOString());
    console.log("------------------------------------------------------------");
    console.groupEnd();
  }

  async _logResponse() {
    hexaLogger.insertInfo(
      "RestRequestResponded",
      { function: this.name },
      `${this.routeName}.js->${this.name}`,
      this.response,
      this.requestId,
    );
    console.group();
    console.log("------------------------------------------------------------");
    console.log(
      "RestRequestResponded",
      this._req.url,
      new Date().toISOString(),
    );
    console.log("------------------------------------------------------------");
    console.groupEnd();
  }

  async _logError(err) {
    hexaLogger.insertError(
      "ErrorInRestRequest",
      { function: this.name, err: err.message },
      `${this.routeName}.js->${this.name}`,
      err,
      this.requestId,
    );
    console.group();
    console.error(
      "\x1b[31m",
      "------------------------------------------------------------",
    );
    console.error(
      "ErrorInRestRequest",
      this._req.url,
      new Date().toISOString(),
    );
    console.error("ErrorMessage:", err.message);
    console.error(
      "------------------------------------------------------------",
      "\x1b[0m",
    );
    console.groupEnd();
  }

  async processRequest() {
    await this._logRequest();

    try {
      await this.init();
      this.apiManager = await this.createApiManager(this._req);
      this.startTime = Date.now();
      this.response = await this.apiManager.execute();
      this.response.httpStatus = this.status;

      if (this.apiManager.setCookie) {
        this._res.cookie(
          this.apiManager.setCookie.cookieName,
          this.apiManager.setCookie.cookieValue,
          {
            httpOnly: true,
            domain: process.env.COOKIE_URL,
            sameSite: "None",
            secure: true,
          },
        );
      }

      if (this.isLoginApi) {
        this.sessionToken = this._req.sessionToken;
        this.setTokenInResponse();
      }

      if (!(await this.redirect()) && !(await this.doDownload())) {
        this._res.status(this.status).send(this.response);
      }
      await this._logResponse();
      await this.apiManager.runAfterResponse();
    } catch (err) {
      await this._logError(err);
      throw err;
    }
  }
}

module.exports = RestController;
