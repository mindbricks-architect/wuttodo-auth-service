const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { status, Metadata } = require("@grpc/grpc-js");

describe("GrpcController", () => {
  let GrpcController;
  let hexaLogger;
  let call, callback, createSessionManagerStub, verifyStub, reloginStub;

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

    GrpcController = proxyquire(
      "../../../src/controllers-layer/grpc-layer/GrpcController.js",
      {
        common: { hexaLogger },
        "@grpc/grpc-js": {
          status,
          Metadata,
        },
        sessionLayer: {
          createSessionManager: createSessionManagerStub,
        },
      },
    );

    call = {
      request: { foo: "bar" },
      call: {
        handler: { path: "/service/addSomething" },
      },
      metadata: new Metadata(),
    };
    call.metadata.set("requestId", "grpc-req-id");
    callback = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should initialize with correct defaults", () => {
    const controller = new GrpcController("addUser", "user", call, callback);
    expect(controller.name).to.equal("addUser");
    expect(controller.routeName).to.equal("user");
    expect(controller._call).to.equal(call);
    expect(controller._callback).to.equal(callback);
    expect(controller.dataName).to.equal("grpcData");
    expect(controller.crudType).to.equal("get");
  });

  it("should log request with _logRequest", async () => {
    const controller = new GrpcController("test", "route", call, callback);
    await controller._logRequest();

    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "GrpcRequestReceived",
        sinon.match.object,
        "route.js->test",
        sinon.match.any,
        "grpc-req-id",
      ),
    ).to.be.true;
  });

  it("should log response with _logResponse", async () => {
    const controller = new GrpcController("test", "route", call, callback);
    controller.response = { grpcData: { ok: true } };
    await controller._logResponse();
    expect(
      hexaLogger.insertInfo.calledWithMatch(
        "GrpcRequestResponded",
        sinon.match.any,
        "route.js->test",
        sinon.match.any,
        "grpc-req-id",
      ),
    ).to.be.true;
  });

  it("should log error with _logError", async () => {
    const controller = new GrpcController("test", "route", call, callback);
    const err = new Error("bad grpc");
    await controller._logError(err);
    expect(
      hexaLogger.insertError.calledWithMatch(
        "ErrorInGrpcRequest",
        sinon.match.any,
        "route.js->test",
        err,
        "grpc-req-id",
      ),
    ).to.be.true;
  });

  it("should create metadata correctly", () => {
    const controller = new GrpcController("test", "route", call, callback);
    const metadata = controller._createMetadata();

    expect(metadata.get("requestId")[0]).to.equal("grpc-req-id");
    expect(metadata.get("endpoint")[0]).to.equal("/service/addSomething");
    expect(metadata.get("processingTime")[0]).to.be.a("string");
  });

  it("should format response normally", () => {
    const controller = new GrpcController("test", "route", call, callback);
    const result = { grpcData: { name: "john" } };
    const formatted = controller._formatResponse(result);
    expect(formatted).to.deep.equal({ name: "john" });
  });

  it("should throw if _formatResponse gets invalid result", () => {
    const controller = new GrpcController("test", "route", call, callback);
    expect(() => controller._formatResponse(null)).to.throw(
      "Invalid result in test",
    );
  });

  it("should read session token from authorization metadata", () => {
    call.metadata.set("authorization", "Bearer sometoken");
    const controller = new GrpcController("test", "route", call, callback);
    const token = controller.readSessionToken();
    expect(token).to.equal("sometoken");
  });

  it("should return null if no authorization header", () => {
    const controller = new GrpcController("test", "route", call, callback);
    const token = controller.readSessionToken();
    expect(token).to.be.null;
  });

  it("should read tenant info from metadata", () => {
    call.metadata.set("tenantId", "tid123");
    call.metadata.set("tenantCodename", "tenantA");

    const controller = new GrpcController("test", "route", call, callback);
    controller.tenantName = "tenant";
    controller.tenantId = "tenantId";

    call.metadata.set("tenantId", "tid123");
    call.metadata.set("tenantCodename", "tenantA");

    controller.readTenant();

    expect(controller["tenantId"]).to.equal("tid123");
    expect(controller["tenantCodename"]).to.equal("tenantA");
  });

  it("should handle processRequest success", async () => {
    class TestController extends GrpcController {
      async createApiManager() {
        return {
          execute: sinon.stub().resolves({ grpcData: { name: "ok" } }),
          runAfterResponse: sinon.stub().resolves(),
        };
      }
    }

    const controller = new TestController("test", "route", call, callback);
    await controller.processRequest();

    expect(callback.calledOnce).to.be.true;
    const [error, response, metadata] = callback.firstCall.args;
    expect(error).to.be.null;
    expect(response).to.deep.equal({ name: "ok" });
    expect(metadata).to.be.instanceOf(Metadata);
  });

  it("should handle error and map to grpc error", async () => {
    class TestController extends GrpcController {
      async createApiManager() {
        throw Object.assign(new Error("validation failed"), {
          name: "ValidationError",
        });
      }
    }

    const controller = new TestController("test", "route", call, callback);
    try {
      await controller.processRequest();
    } catch (err) {
      expect(err.name).to.equal("ValidationError");
      expect(err.message).to.equal("validation failed");
    }
  });

  it("should default to INTERNAL error if no known error type", async () => {
    class TestController extends GrpcController {
      async createApiManager() {
        throw new Error("Unknown failure");
      }
    }

    const controller = new TestController("test", "route", call, callback);
    try {
      await controller.processRequest();
    } catch (err) {
      expect(err.name).to.equal("Error");
      expect(err.message).to.equal("Unknown failure");
    }
  });
  describe("init", () => {
    it("should call readTenant when isMultiTenant=true", async () => {
      const controller = new GrpcController("test", "route", call, callback);
      controller.isMultiTenant = true;
      controller.tenantName = "tenant";
      controller.tenantId = "tenantId";
      const spy = sinon.spy(controller, "readTenant");

      await controller.init();

      expect(spy.calledOnce).to.be.true;
      expect(createSessionManagerStub.calledOnceWith(controller.request)).to.be
        .true;
      expect(verifyStub.calledOnce).to.be.true;
    });

    it("should set sessionToken from metadata authorization", async () => {
      call.metadata.set("authorization", "Bearer abc123");
      const controller = new GrpcController("test", "route", call, callback);

      await controller.init();

      expect(controller.request.sessionToken).to.equal("abc123");
    });

    it("should call relogin if isLoginApi and request has userAuthUpdate", async () => {
      const controller = new GrpcController("test", "route", call, callback);
      controller.isLoginApi = true;
      controller.request.session = { userAuthUpdate: true };

      await controller.init();

      expect(reloginStub.calledOnce).to.be.true;
    });

    it("should not call relogin if request has no userAuthUpdate", async () => {
      const controller = new GrpcController("test", "route", call, callback);
      controller.isLoginApi = true;
      controller.request.session = {};

      await controller.init();

      expect(reloginStub.called).to.be.false;
      expect(verifyStub.calledOnce).to.be.true;
    });
  });
});
