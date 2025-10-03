const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("McpController", () => {
  let McpController;
  let hexaLogger;
  let createSessionManagerStub, verifyStub, reloginStub;
  let createHexCodeStub;
  let mcpParams;

  beforeEach(() => {
    hexaLogger = {
      insertInfo: sinon.stub(),
      insertError: sinon.stub(),
    };

    verifyStub = sinon.stub().resolves();
    reloginStub = sinon.stub().resolves();
    createSessionManagerStub = sinon.stub().resolves({
      verifySessionToken: verifyStub,
      relogin: reloginStub,
    });

    createHexCodeStub = sinon.stub().returns("hex-req-id");

    McpController = proxyquire(
      "../../../src/controllers-layer/mcp-layer/McpController.js",
      {
        common: { hexaLogger, createHexCode: createHexCodeStub },
        sessionLayer: { createSessionManager: createSessionManagerStub },
      },
    );

    mcpParams = {
      accessToken: null,
      headers: {},
      foo: "bar",
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should initialize with default values", () => {
    const controller = new McpController("myFunc", "myRoute", mcpParams);
    expect(controller.name).to.equal("myFunc");
    expect(controller.routeName).to.equal("myRoute");
    expect(controller.crudType).to.equal("get");
    expect(controller.dataName).to.equal("mcpData");
    expect(controller.requestId).to.equal("hex-req-id");
    expect(controller.request.mcpParams).to.deep.equal(mcpParams);
  });

  describe("readSessionToken", () => {
    it("should return accessToken if present", () => {
      mcpParams.accessToken = "token123";
      const controller = new McpController("n", "r", mcpParams);
      const token = controller.readSessionToken();
      expect(token).to.equal("token123");
    });

    it("should return bearer token if Authorization header exists", () => {
      mcpParams.headers.authorization = "Bearer abc999";
      const controller = new McpController("n", "r", mcpParams);
      const token = controller.readSessionToken();
      expect(token).to.equal("abc999");
    });

    it("should return null if no tokens found", () => {
      const controller = new McpController("n", "r", mcpParams);
      const token = controller.readSessionToken();
      expect(token).to.be.null;
    });
  });

  describe("readTenant", () => {
    it("should set tenantCodename from params", () => {
      mcpParams.tenantCodename = "clientA";
      const controller = new McpController("n", "r", mcpParams);
      controller.readTenant();
      expect(controller.tenantCodename).to.equal("clientA");
    });

    it("should fallback to root if no tenantCodename", () => {
      const controller = new McpController("n", "r", mcpParams);
      controller.readTenant();
      expect(controller.tenantCodename).to.equal("root");
    });
  });

  describe("init", () => {
    it("should set sessionToken from accessToken and call verifySessionToken", async () => {
      mcpParams.accessToken = "tok-123";
      const controller = new McpController("n", "r", mcpParams);

      const request = await controller.init();

      expect(request.sessionToken).to.equal("tok-123");
      expect(createSessionManagerStub.calledOnce).to.be.true;
      expect(verifyStub.calledOnce).to.be.true;
    });

    it("should set sessionToken from Authorization header if no accessToken", async () => {
      mcpParams.headers.authorization = "Bearer fromHeader";
      const controller = new McpController("n", "r", mcpParams);

      const request = await controller.init();

      expect(request.sessionToken).to.equal("fromHeader");
      expect(verifyStub.calledOnce).to.be.true;
    });

    it("should call readTenant and set tenantCodename when isMultiTenant=true", async () => {
      mcpParams.tenantCodename = "tenantA";
      const controller = new McpController("n", "r", mcpParams);
      controller.isMultiTenant = true;
      const spy = sinon.spy(controller, "readTenant");

      const request = await controller.init();

      expect(spy.calledOnce).to.be.true;
      expect(request.tenantCodename).to.equal("tenantA");
    });

    it("should default tenantCodename to root when isMultiTenant and no tenant provided", async () => {
      const controller = new McpController("n", "r", mcpParams);
      controller.isMultiTenant = true;

      const request = await controller.init();

      expect(request.tenantCodename).to.equal("root");
    });

    it("should return the same request object", async () => {
      const controller = new McpController("n", "r", mcpParams);
      const result = await controller.init();
      expect(result).to.equal(controller.request);
    });
  });

  describe("logging", () => {
    it("should log request", async () => {
      const controller = new McpController("n", "r", mcpParams);
      await controller._logRequest();
      expect(
        hexaLogger.insertInfo.calledWithMatch(
          "McpRequestReceived",
          sinon.match.object,
          "r.js->n",
          sinon.match.any,
          "hex-req-id",
        ),
      ).to.be.true;
    });

    it("should log response", async () => {
      const controller = new McpController("n", "r", mcpParams);
      controller.response = { ok: true };
      await controller._logResponse();
      expect(
        hexaLogger.insertInfo.calledWithMatch(
          "McpRequestResponded",
          sinon.match.any,
          "r.js->n",
          sinon.match.any,
          "hex-req-id",
        ),
      ).to.be.true;
    });

    it("should log error", async () => {
      const controller = new McpController("n", "r", mcpParams);
      const err = new Error("fail");
      await controller._logError(err);
      expect(
        hexaLogger.insertError.calledWithMatch(
          "ErrorInMcpRequest",
          sinon.match.any,
          "r.js->n",
          err,
          "hex-req-id",
        ),
      ).to.be.true;
    });
  });

  describe("processRequest", () => {
    it("should call createApiManager, execute, runAfterResponse", async () => {
      const controller = new McpController("n", "r", mcpParams);
      const executeStub = sinon.stub().resolves({ ok: "result" });
      const runAfterResponseStub = sinon.stub().resolves();

      controller.createApiManager = sinon.stub().resolves({
        execute: executeStub,
        runAfterResponse: runAfterResponseStub,
      });

      const result = await controller.processRequest();

      expect(controller.createApiManager.calledOnce).to.be.true;
      expect(executeStub.calledOnce).to.be.true;
      expect(runAfterResponseStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({ ok: "result" });
    });

    it("should log and throw error if execute fails", async () => {
      const controller = new McpController("n", "r", mcpParams);
      const error = new Error("boom");
      controller.createApiManager = sinon.stub().resolves({
        execute: sinon.stub().rejects(error),
        runAfterResponse: sinon.stub().resolves(),
      });

      try {
        await controller.processRequest();
        throw new Error("should not reach");
      } catch (err) {
        expect(err.message).to.equal("boom");
        expect(hexaLogger.insertError.called).to.be.true;
      }
    });
  });
});
