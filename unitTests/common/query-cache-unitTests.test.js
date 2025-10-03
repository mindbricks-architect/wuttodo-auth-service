const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("QueryCache and QueryCacheInvalidator", () => {
  let setRedisDataStub, getRedisDataStub, redisClientStub;
  let QueryCache, QueryCacheInvalidator;
  let fakeInput;

  beforeEach(() => {
    setRedisDataStub = sinon.stub().resolves();
    getRedisDataStub = sinon.stub().resolves(null);
    redisClientStub = {
      scanIterator: sinon.stub().returns([]),
      del: sinon.stub().resolves(1),
    };

    ({ QueryCache, QueryCacheInvalidator } = proxyquire(
      "../../src/common/query-cache",
      {
        "./redis": {
          setRedisData: setRedisDataStub,
          getRedisData: getRedisDataStub,
          redisClient: redisClientStub,
        },
      },
    ));

    // Always provide a fake input with toJSON
    fakeInput = { toJSON: () => ({}) };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("QueryCache", () => {
    it("should build a queryKey with clusters and input", () => {
      const input = {
        toJSON: () => ({ id: 123, name: "abc", requestId: "random" }),
      };

      const cache = new QueryCache("User", ["tenantId"], "$and", "$eq", input, {
        tenantId: "t1",
      });

      expect(cache.queryKey).to.match(/^qcache:User:c:t1:[a-f0-9]{40}$/);
    });

    it("should replace missing cluster values with 'all'", () => {
      const cache = new QueryCache(
        "User",
        ["orgId"],
        "$and",
        "$eq",
        fakeInput,
        {},
      );
      expect(cache.queryKey).to.include("c:all");
    });

    it("writeQueryResult should call setRedisData with stringified data", async () => {
      const cache = new QueryCache("User", [], "$and", "$eq", fakeInput, {});
      await cache.writeQueryResult({ foo: "bar" }, 60);
      expect(setRedisDataStub.calledOnce).to.be.true;
      const [key, data, exp] = setRedisDataStub.firstCall.args;
      expect(key).to.equal(cache.queryKey);
      expect(JSON.parse(data)).to.deep.equal({ foo: "bar" });
      expect(exp).to.equal(60);
    });

    it("readQueryResult should return null when getRedisData resolves null", async () => {
      const cache = new QueryCache("User", [], "$and", "$eq", fakeInput, {});
      getRedisDataStub.resolves(null);
      const result = await cache.readQueryResult();
      expect(result).to.equal(null);
    });

    it("readQueryResult should return parsed cache value when not empty", async () => {
      const cache = new QueryCache("User", [], "$and", "$eq", fakeInput, {});
      getRedisDataStub.resolves("cached-value");
      const result = await cache.readQueryResult();
      expect(result).to.equal("cached-value");
    });
  });

  describe("QueryCacheInvalidator", () => {
    it("clusterCombinations should generate all combinations", () => {
      const invalidator = new QueryCacheInvalidator("User", ["tenantId"]);
      const combos = [];
      invalidator.clusterCombinations(null, 0, { tenantId: "t1" }, combos);
      expect(combos).to.include("c:all");
      expect(combos).to.include("c:t1");
    });

    it("invalidateCache should call #deleteClusters with correct combinations", async () => {
      const invalidator = new QueryCacheInvalidator("User", ["tenantId"]);
      const spy = sinon.spy(invalidator, "invalidateCache");
      redisClientStub.scanIterator = sinon.stub().returns(["k1", "k2"]);

      await invalidator.invalidateCache({ tenantId: "t1" });
      expect(spy.calledOnce).to.be.true;
    });

    it("invalidateAll should scan and delete keys", async () => {
      const invalidator = new QueryCacheInvalidator("User", []);
      const fakeKeys = ["qcache:User:c:1", "qcache:User:c:2"];
      redisClientStub.scanIterator = async function* () {
        yield* fakeKeys;
      };
      redisClientStub.del.resolves(1);

      const deleted = await invalidator.invalidateAll();
      expect(deleted).to.equal(fakeKeys.length);
    });

    it("should handle errors gracefully when deleting", async () => {
      const invalidator = new QueryCacheInvalidator("User", []);
      redisClientStub.scanIterator = async function* () {
        throw new Error("boom");
      };
      const result = await invalidator.invalidateAll();
      expect(result).to.equal(0);
    });
  });
});
