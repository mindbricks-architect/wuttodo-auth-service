require("module-alias/register");
const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const { NotAuthorizedError } = require("common");

describe("wuttodo-session", () => {
  let getRedisDataStub;

  beforeEach(() => {
    getRedisDataStub = sinon.stub().resolves(null);

    InstanceSession = proxyquire("../../src/project-session/wuttodo-session", {
      common: {
        hexaLogger: { log: sinon.stub() },
        getRedisData: getRedisDataStub,
        redisClient: { set: sinon.stub() },
      },
      "../../src/project-session/hexa-auth": class {
        getBearerToken = sinon.stub();
        getCookieToken = sinon.stub();
      },
      serviceCommon: {
        ElasticIndexer: class {
          constructor() {}
          getOne = sinon.stub().resolves({ id: "resolved-id" });
        },
      },
    });

    instance = new InstanceSession();
    instance.session = {}; // default dummy session
  });
});
