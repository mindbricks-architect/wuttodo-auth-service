const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("Redis", () => {
  let redisStub, redisClientStub;
  let getRedisData, setRedisData, connectToRedis;

  beforeEach(() => {
    redisClientStub = {
      connect: sinon.stub().resolves(),
      on: sinon.stub(),
      get: sinon.stub(),
      set: sinon.stub(),
      expire: sinon.stub(),
      isOpen: false,
    };

    redisStub = {
      createClient: sinon.stub().returns(redisClientStub),
    };

    ({ getRedisData, setRedisData, connectToRedis } = proxyquire(
      "../../src/common/redis",
      { redis: redisStub },
    ));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("connectToRedis", () => {
    it("should call redisClient.connect and log success", async () => {
      await connectToRedis();
      expect(redisClientStub.connect.calledOnce).to.be.true;
    });

    it("should catch errors if connect fails", async () => {
      redisClientStub.connect.rejects(new Error("fail connect"));
      await connectToRedis(); // should not throw
      expect(redisClientStub.connect.calledOnce).to.be.true;
    });
  });

  describe("getRedisData", () => {
    it("should connect if not open and return parsed object with source", async () => {
      redisClientStub.isOpen = false;
      redisClientStub.get.resolves(JSON.stringify({ foo: "bar" }));

      const result = await getRedisData("key1");

      expect(redisClientStub.connect.calledOnce).to.be.true;
      expect(result).to.include({ foo: "bar", source: "redis" });
    });

    it("should return raw string if value is not JSON", async () => {
      redisClientStub.isOpen = true;
      redisClientStub.get.resolves("not-json");

      const result = await getRedisData("key2");
      expect(result).to.equal("not-json");
    });

    it("should return null if redis throws", async () => {
      redisClientStub.isOpen = true;
      redisClientStub.get.rejects(new Error("fail"));
      const result = await getRedisData("badKey");
      expect(result).to.equal(null);
    });

    it("should return null if key is not found", async () => {
      redisClientStub.isOpen = true;
      redisClientStub.get.resolves(null);
      const result = await getRedisData("missingKey");
      expect(result).to.equal(null);
    });
  });

  describe("setRedisData", () => {
    it("should stringify objects before saving", async () => {
      redisClientStub.isOpen = false;
      const data = { foo: "bar" };
      await setRedisData("key1", data);

      expect(redisClientStub.connect.calledOnce).to.be.true;
      expect(redisClientStub.set.calledWith("key1", JSON.stringify(data))).to.be
        .true;
    });

    it("should set expiration if exp provided", async () => {
      redisClientStub.isOpen = true;
      await setRedisData("key2", "value", 60);

      expect(redisClientStub.set.calledWith("key2", "value")).to.be.true;
      expect(redisClientStub.expire.calledWith("key2", 60)).to.be.true;
    });

    it("should catch and log errors", async () => {
      redisClientStub.isOpen = true;
      redisClientStub.set.rejects(new Error("fail set"));
      await setRedisData("key3", "value"); // should not throw
      expect(redisClientStub.set.calledOnce).to.be.true;
    });
  });
});
