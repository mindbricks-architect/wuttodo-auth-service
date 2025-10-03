const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("GetUserMcpController", () => {
  let factory;
  let ManagerStub, processRequestStub;

  const headers = { authorization: "Bearer test123" };

  beforeEach(() => {
    processRequestStub = sinon.stub().resolves({ ok: true });
    ManagerStub = sinon.stub();

    factory = proxyquire(
      "../../../src/controllers-layer/mcp-layer/main/user/get-user-api.js",
      {
        apiLayer: { GetUserManager: ManagerStub },
        "../../AuthServiceMcpController": class {
          constructor(name, routeName, params) {
            this.name = name;
            this.routeName = routeName;
            this.request = params;
            this.processRequest = processRequestStub;
          }
        },
        common: {
          hexaLogger: { insertInfo: sinon.stub(), insertError: sinon.stub() },
          createHexCode: sinon.stub().returns("hex-req"),
        },
      },
    );
  });

  afterEach(() => sinon.restore());

  it("factory should return correct metadata", () => {
    const result = factory(headers);
    expect(result.name).to.equal("getUser");
    expect(result.description).to.be.a("string");
    expect(result.parameters).to.be.an("object");
    expect(result.controller).to.be.a("function");
  });

  it("controller should call processRequest and wrap result", async () => {
    const result = factory(headers);
    const out = await result.controller({ headers, foo: "bar" });

    expect(processRequestStub.calledOnce).to.be.true;
    expect(out.content[0].type).to.equal("text");
    expect(out.content[0].text).to.include("ok");
  });

  it("controller should catch errors and return isError=true", async () => {
    processRequestStub.rejects(new Error("fail!"));
    const result = factory(headers);
    const out = await result.controller({ headers });

    expect(out.isError).to.be.true;
    expect(out.content[0].text).to.include("fail!");
  });
});
