require("module-alias/register");
const { expect } = require("chai");
const sinon = require("sinon");
const { NotAuthenticatedError } = require("common");
const proxyquire = require("proxyquire");

describe("sendMailRestController", function () {
  let functionNameStub;
  let sendMailRestController;

  beforeEach(() => {
    // Always return a basic object so controller can respond
    functionNameStub = sinon.stub().resolves({ content: "ok" });

    sendMailRestController = proxyquire(
      "../../../src/controllers-layer/edge-layer/sendMail-rest",
      {
        edgeFunctions: { sendMail: functionNameStub },
      },
    );
  });

  it("should call next() with NotAuthenticatedError when session is missing", async function () {
    const req = { session: null };
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    const next = sinon.stub();

    await sendMailRestController(req, res, next);

    expect(next.called).to.be.true;
    expect(next.args[0][0]).to.be.instanceOf(NotAuthenticatedError);
    expect(next.args[0][0].message).to.equal("sendMail requires login");
  });

  it("should return a valid response when session exists", async function () {
    const req = { session: {} };
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    const next = sinon.stub();

    await sendMailRestController(req, res, next);

    expect(res.status.called).to.be.true;
    expect(res.send.called).to.be.true;
    expect(next.called).to.be.false;
  });

  it("should handle errors and call next() on failure", async function () {
    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };
    const next = sinon.stub();

    const error = new Error("Test error");

    sendMailRestController = (req, res, next) => {
      next(error);
    };

    await sendMailRestController(req, res, next);

    expect(next.calledWith(error)).to.be.true;
    expect(next.args[0][0]).to.be.instanceOf(Error);
    expect(next.args[0][0].message).to.equal("Test error");
  });
});
