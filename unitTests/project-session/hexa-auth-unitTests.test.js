require("module-alias/register");
const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const crypto = require("crypto");
const { HttpServerError } = require("common");
const fs = require("fs");

describe("HexaAuth", () => {
  let HexaAuth, mockRedis, mockJwt, mocks;

  beforeEach(() => {
    mockRedis = {
      getRedisData: sinon.stub(),
      setRedisData: sinon.stub(),
      redisClient: { del: sinon.stub().resolves(1) },
    };

    mockJwt = {
      decode: sinon.stub(),
      validateJWT: sinon.stub().resolves({ decoded: true }),
      validateJWT_RSA: sinon.stub().resolves({ decoded: true }),
      createJWT: sinon.stub().resolves("jwt-token"),
      createJWT_RSA: sinon.stub().resolves("rsa-jwt-token"),
    };

    mocks = {
      ...mockRedis,
      ...mockJwt,
      sendRestRequest: sinon.stub().resolves({ verified: true }),
      NotAuthorizedError: class NotAuthorizedError extends Error {
        constructor(message) {
          super(message);
          this.name = "NotAuthorizedError";
        }
      },
      createHexCode: () => "hexcode123",
    };

    const mockFs = {
      existsSync: sinon.stub().returns(true),
      readFileSync: sinon.stub().returns("FAKE_PRIVATE_KEY_STRING"),
    };

    utils = {
      getPublicKey: sinon.stub(),
    };

    HexaAuth = proxyquire("../../src/project-session/hexa-auth", {
      common: mocks,
      fs: mockFs,
      path: require("path"),
      jsonwebtoken: { decode: mockJwt.decode },
      utils: utils,
    });
  });

  describe("setSessionToEntityCache", () => {
    it("should store session data and related keys in Redis", async () => {
      const auth = new HexaAuth();
      const session = { sessionId: "s1", _USERID: "u1" };
      await auth.setSessionToEntityCache(session, 1);
      expect(mockRedis.setRedisData.callCount).to.equal(3);
    });
  });

  describe("createTokenFromSession", () => {
    it("should create JWT token when isTest is true", async () => {
      const auth = new HexaAuth();
      const session = { sessionId: "s1", _USERID: "u1", loginDate: new Date() };

      const token = await auth.createTokenFromSession(session, true);
      expect(token).to.equal("rsa-jwt-token");
    });
    it("should throw HttpServerError if private key is not found", async () => {
      // fresh proxyquire with existsSync false
      const mockFs = {
        existsSync: sinon.stub().returns(false), // ⬅ force no private key
        readFileSync: sinon.stub().returns("FAKE_PRIVATE_KEY_STRING"),
      };

      HexaAuth = proxyquire("../../src/project-session/hexa-auth", {
        common: mocks,
        fs: mockFs,
        path: require("path"),
        jsonwebtoken: { decode: mockJwt.decode },
        utils: utils,
      });

      const auth = new HexaAuth();
      global.currentKeyId = "nonexistentkey";
      process.env.KEYS_FOLDER = "test_keys";

      const session = { sessionId: "s1", _USERID: "u1", loginDate: new Date() };

      try {
        await auth.createTokenFromSession(session, false);
        throw new Error("should not reach");
      } catch (err) {
        expect(err).to.be.instanceOf(HttpServerError);
        expect(err.message).to.equal("errMsg_PrivateKeyNotFound");
      }
    });

    it("should throw HttpServerError if createJWT_RSA fails", async () => {
      const auth = new HexaAuth();
      global.currentKeyId = "dev";
      process.env.KEYS_FOLDER = "test_keys";

      mockJwt.createJWT_RSA.rejects(new Error("sign error"));

      const session = { sessionId: "s1", _USERID: "u1", loginDate: new Date() };

      try {
        await auth.createTokenFromSession(session, false);
        throw new Error("Should not reach");
      } catch (err) {
        //expect(err).to.be.instanceOf("HttpServerError");
        expect(err.message).to.equal("errMsg_ErrorCreateingToken");
      }
    });
  });

  describe("verifyJWTAccessToken", () => {
    it("should return null if token is invalid", async () => {
      const auth = new HexaAuth();
      mockJwt.decode.returns(null);
      const result = await auth.verifyJWTAccessToken("badtoken", false);
      expect(result).to.be.null;
    });

    it("should return decoded token with simple JWT validation", async () => {
      process.env.JWT_KEY = "test-secret-key";
      const auth = new HexaAuth();
      mockJwt.decode.returns({
        tokenMark: "mindbricks-inapp-token",
        tokenName: "mindbricks-access-token",
      });
      const result = await auth.verifyJWTAccessToken("token", false);
      expect(result).to.deep.equal({ decoded: true });
    });
    it("should return null if public key is not found in verifyJWTAccessToken", async () => {
      const auth = new HexaAuth();
      const fakeToken = "anytoken";

      mockJwt.decode.returns({ tokenMark: "mindbricks-inapp-token" });

      utils.getPublicKey.resolves(null);
      mockJwt.validateJWT_RSA.resolves(null);

      const result = await auth.verifyJWTAccessToken(fakeToken, false);

      expect(result).to.be.null;
    });
  });

  describe("setServiceSession", () => {
    it("should set session and call sub methods", async () => {
      const auth = new HexaAuth();
      auth.session = { userId: "u1" };
      const req = {};

      sinon.stub(auth, "createPermissionManager").resolves();

      await auth.setServiceSession(req);
      expect(auth.createPermissionManager.calledOnce).to.be.true;
      expect(req.sessionObject).to.equal(auth.sessionObject);
    });
  });

  describe("verifySessionToken", () => {
    it("should pass silently if session is valid", async () => {
      const auth = new HexaAuth();
      auth.session = { userAuthUpdate: false };
      sinon.stub(auth, "readTenantIdFromRequest").resolves();
      sinon.stub(auth, "buildSessionFromRequest").resolves();

      const req = {};
      let threw = false;

      try {
        await auth.verifySessionToken(req);
      } catch (err) {
        threw = true;
      }

      expect(threw).to.be.false;
    });

    it("should throw NotAuthorizedError on error", async () => {
      const auth = new HexaAuth();
      const req = {};
      sinon.stub(auth, "readTenantIdFromRequest").throws(new Error("fail"));

      try {
        await auth.verifySessionToken(req);
        throw new Error("Should not succeed");
      } catch (err) {
        expect(err.message).to.equal("fail");
      }
    });
  });

  describe("buildSessionFromRequest", () => {
    it("should silently do nothing if token is invalid", async () => {
      const auth = new HexaAuth();
      auth.isJWT = true;
      sinon.stub(auth, "verifyJWTAccessToken").resolves(null);

      const req = {};
      await auth.buildSessionFromRequest(req);

      expect(req.session).to.be.undefined;
    });

    it("should set session from token if sessionReadLocation = tokenIsSession", async () => {
      const auth = new HexaAuth();
      auth.sessionReadLocation = "tokenIsSession";
      auth.isJWT = true;
      auth.useRemoteSession = false;

      sinon.stub(auth, "verifyJWTAccessToken").resolves({
        sessionId: "s1",
        _USERID: "u1",
      });
      sinon.stub(auth, "setServiceSession").resolves();

      const req = {
        sessionToken: "mock-token",
      };

      await auth.buildSessionFromRequest(req);
      expect(req.session).to.deep.equal({ sessionId: "s1", _USERID: "u1" });
    });
  });
  describe("getSessionFromEntityCache", () => {
    it("should return session with permissions and userAuthUpdate", async () => {
      const auth = new HexaAuth();
      const fakeSession = { sessionId: "s1", _USERID: "u1" };
      auth.permissionConfigNames = ["main"];

      mockRedis.getRedisData.withArgs("hexasession:s1").resolves(fakeSession);
      mockRedis.getRedisData.withArgs("hexauserauthupdate:u1").resolves("true");

      const result = await auth.getSessionFromEntityCache("s1");

      expect(result.sessionId).to.equal("s1");
      expect(result.userAuthUpdate).to.equal("true");
    });
  });

  describe("getValidationCache / setValidationCache", () => {
    it("should get token validation cache", async () => {
      const auth = new HexaAuth();
      mockRedis.getRedisData.resolves("cacheData");
      const result = await auth.getValidationCache("abc123");
      expect(result).to.equal("cacheData");
    });

    it("should set token validation cache", async () => {
      const auth = new HexaAuth();
      await auth.setValidationCache("abc123", { test: true });
      expect(mockRedis.setRedisData.calledOnce).to.be.true;
      expect(mockRedis.setRedisData.firstCall.args[0]).to.equal(
        "tokenValidation:abc123",
      );
    });
  });

  describe("verifyAccessTokenByService", () => {
    it("should return cached verification if available", async () => {
      const auth = new HexaAuth();
      auth.cacheRemoteServiceResponse = true;

      // Stub internal method and crypto
      const hash = crypto
        .createHash("sha1")
        .update(JSON.stringify({ bearer: "token" }))
        .digest("hex");
      sinon
        .stub(auth, "setRemoteServiceVerificationRequest")
        .resolves({ bearer: "token" });
      sinon.stub(auth, "getValidationCache").resolves({ verified: true });

      const result = await auth.verifyAccessTokenByService("token");
      expect(result).to.deep.equal({ verified: true });
    });
    it("should call sendRestRequest and cache if no validation cache", async () => {
      const auth = new HexaAuth();
      auth.cacheRemoteServiceResponse = true;

      const request = {
        verifyUrl: "https://auth.service/verify",
        bearer: "token",
        headers: {},
        cookies: {},
        body: {},
        query: {},
        method: "POST",
      };

      sinon.stub(auth, "setRemoteServiceVerificationRequest").resolves(request);
      sinon.stub(auth, "getValidationCache").resolves(null);
      sinon.stub(auth, "setValidationCache").resolves();
      mocks.sendRestRequest.resolves({ verified: "fresh" });

      const result = await auth.verifyAccessTokenByService("token");

      expect(result).to.deep.equal({ verified: "fresh" });
      expect(mocks.sendRestRequest.calledOnce).to.be.true;
    });
  });
  describe("getRemoteSession", () => {
    it("should return cached remote session if writeInStore is true", async () => {
      const auth = new HexaAuth();
      auth.remoteSessionWriteInStore = true;
      const tokenData = { sessionId: "abc" };

      sinon
        .stub(auth, "getSessionFromEntityCache")
        .resolves({ sessionId: "abc" });
      const result = await auth.getRemoteSession("token", tokenData);

      expect(result).to.deep.equal({ sessionId: "abc" });
    });

    it("should request and cache remote session", async () => {
      const auth = new HexaAuth();
      auth.remoteSessionWriteInStore = true;

      sinon.stub(auth, "setRemoteSessionRequest").resolves({
        verifyUrl: "https://auth.service/verify",
        bearer: "token",
        headers: {},
        cookies: {},
        body: {},
        query: {},
        method: "GET",
      });
      sinon.stub(auth, "normalizeRemoteSessionData").callsFake((x) => x);
      sinon.stub(auth, "setSessionToEntityCache").resolves();

      mocks.sendRestRequest.resolves({ sessionId: "remote123" });

      const result = await auth.getRemoteSession("token", {
        sessionId: "remote123",
      });

      expect(result).to.deep.equal({ sessionId: "remote123" });
    });
  });
  describe("permission-related helpers", () => {
    it("checkPermission should return false if no permissionManager", async () => {
      const auth = new HexaAuth();
      expect(await auth.checkPermission("perm")).to.equal(false);
    });

    it("checkPermission should delegate to permissionManager", async () => {
      const auth = new HexaAuth();
      auth.permissionManager = {
        checkPermissionForSession: sinon.stub().resolves(true),
      };
      expect(await auth.checkPermission("perm")).to.equal(true);
    });

    it("checkObjectPermission should delegate with objectId", async () => {
      const auth = new HexaAuth();
      auth.permissionManager = {
        checkPermissionForSession: sinon.stub().resolves(true),
      };
      expect(await auth.checkObjectPermission("perm", "obj1")).to.equal(true);
    });

    it("getPermissions/getRootPermissions/getObjectPermissions should return [] if no manager", async () => {
      const auth = new HexaAuth();
      expect(await auth.getPermissions("p", "o")).to.deep.equal([]);
      expect(await auth.getRootPermissions("p")).to.deep.equal([]);
      expect(await auth.getObjectPermissions("p")).to.deep.equal([]);
    });

    it("getAllowedObjects/getPermissionFilter should return null if no manager", async () => {
      const auth = new HexaAuth();
      expect(await auth.getAllowedObjects("p")).to.equal(null);
      expect(await auth.getPermissionFilter("p")).to.equal(null);
    });

    it("getCurrentUserPermissions/getCurrentRolePermissions should return [] if no manager", async () => {
      const auth = new HexaAuth();
      expect(await auth.getCurrentUserPermissions()).to.deep.equal([]);
      expect(await auth.getCurrentRolePermissions()).to.deep.equal([]);
    });
  });

  describe("readFromContext/readFromSession", () => {
    it("should read values correctly", () => {
      const auth = new HexaAuth();
      auth.foo = "bar";
      auth.session = { x: 42 };
      expect(auth.readFromContext("foo")).to.equal("bar");
      expect(auth.readFromSession("x")).to.equal(42);
    });

    it("should return null if no session", () => {
      const auth = new HexaAuth();
      auth.session = null;
      expect(auth.readFromSession("x")).to.be.null;
    });
  });

  describe("hasSessionInEntityCache", () => {
    it("should return true if redis has session", async () => {
      const auth = new HexaAuth();
      mockRedis.getRedisData.resolves({ sessionId: "s1" });
      expect(await auth.hasSessionInEntityCache("s1")).to.be.true;
    });

    it("should return false if redis returns null", async () => {
      const auth = new HexaAuth();
      mockRedis.getRedisData.resolves(null);
      expect(await auth.hasSessionInEntityCache("s2")).to.be.false;
    });
  });

  describe("deleteSessionFromEntityCache", () => {
    it("should call redisClient.del three times", async () => {
      const auth = new HexaAuth();
      await auth.deleteSessionFromEntityCache("s1");
      expect(mocks.redisClient.del.callCount).to.equal(3);
    });
  });

  describe("normalizeRemoteSessionData", () => {
    it("should return data unchanged", async () => {
      const auth = new HexaAuth();
      const data = { a: 1 };
      expect(await auth.normalizeRemoteSessionData(data)).to.equal(data);
    });
  });

  describe("userHasRole", () => {
    it("should always return false by default", () => {
      const auth = new HexaAuth();
      expect(auth.userHasRole("admin")).to.be.false;
    });
  });
});
