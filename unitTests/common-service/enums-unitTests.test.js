require("module-alias/register");
const { expect } = require("chai");
const sinon = require("sinon");
const { redisClient } = require("common");
const ElasticIndexer = require("../../src/common-service/service-indexer");
const {
  getEnumValue,
  loadEnumDictionary,
} = require("../../src/common-service/enums");

describe("Enum Dictionary Functions", () => {
  let hGetStub, hSetStub, getByIdStub, getByPageStub;

  beforeEach(() => {
    hGetStub = sinon.stub(redisClient, "hGet");
    hSetStub = sinon.stub(redisClient, "hSet").resolves();
    getByIdStub = sinon.stub(ElasticIndexer.prototype, "getDataById");
    getByPageStub = sinon.stub(ElasticIndexer.prototype, "getDataByPage");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getEnumValue", () => {
    it("should return local enum value if exists (default dict)", async () => {
      const result = await getEnumValue("testId", "default", false);
      expect(result).to.deep.equal({
        id: "testId",
        name: "testName",
        desc: undefined,
      });
    });

    it("should return single value from Redis if local fails", async () => {
      hGetStub.withArgs("my_enum", "abc").resolves("RedisName");
      hGetStub.withArgs("my_enum_desc", "abc").resolves("RedisDesc");

      const result = await getEnumValue("abc", "my_enum", true);
      expect(result).to.deep.equal({
        id: "abc",
        name: "RedisName",
        desc: "RedisDesc",
      });
    });

    it("should return multiple values from Redis", async () => {
      hGetStub.withArgs("my_enum", "1").resolves("Name1");
      hGetStub.withArgs("my_enum", "2").resolves("Name2");
      hGetStub.withArgs("my_enum_desc", "1").resolves("Desc1");
      hGetStub.withArgs("my_enum_desc", "2").resolves("Desc2");

      const result = await getEnumValue(["1", "2"], "my_enum", true);
      expect(result).to.deep.equal([
        { id: "1", name: "Name1", desc: "Desc1" },
        { id: "2", name: "Name2", desc: "Desc2" },
      ]);
    });

    it("should return empty array if Redis result contains null and no fallback exists", async () => {
      hGetStub.withArgs("my_enum", "1").resolves("A");
      hGetStub.withArgs("my_enum", "2").resolves(null);

      const result = await getEnumValue(["1", "2"], "my_enum", false);
      expect(result).to.deep.equal([]);
    });

    it("should return null if Redis result for single id is null", async () => {
      hGetStub.withArgs("my_enum", "abc").resolves(null);

      const result = await getEnumValue("abc", "my_enum", false);
      expect(result).to.be.null;
    });

    it("should fallback to Elastic if Redis and Local fail", async () => {
      hGetStub.resolves(null);
      getByIdStub.resolves({
        id: "elastic-id",
        name: "Elastic Name",
        desc: "Elastic Desc",
      });

      const result = await getEnumValue("elastic-id", "elastic_dict", true);
      expect(result).to.deep.equal({
        id: "elastic-id",
        name: "Elastic Name",
        desc: "Elastic Desc",
      });
    });

    it("should fallback to Elastic with array input", async () => {
      hGetStub.resolves(null);
      getByIdStub.resolves([
        { id: "1", name: "E1", desc: "D1" },
        { id: "2", name: "E2", desc: "D2" },
      ]);

      const result = await getEnumValue(["1", "2"], "elastic_dict", true);
      expect(result).to.deep.equal([
        { id: "1", name: "E1", desc: "D1" },
        { id: "2", name: "E2", desc: "D2" },
      ]);
    });

    it("should return null for null input", async () => {
      const result = await getEnumValue(null, "any_enum", true);
      expect(result).to.be.null;
    });

    it("should return [] for empty input array", async () => {
      const result = await getEnumValue([], "any_enum", false);
      expect(result).to.deep.equal([]);
    });
  });

  describe("loadEnumDictionary", () => {
    it("should load data from Elastic and populate Redis/local with hasDesc=true", async () => {
      getByPageStub.resolves([
        { id: "id1", name: "name1", desc: "desc1" },
        { id: "id2", name: "name2", desc: "desc2" },
      ]);

      await loadEnumDictionary("my_enum", true);

      sinon.assert.calledWith(hSetStub, "my_enum", sinon.match.array);
      sinon.assert.calledWith(hSetStub, "my_enum_desc", sinon.match.array);
    });

    it("should load data from Elastic and populate Redis/local with hasDesc=false", async () => {
      getByPageStub.resolves([
        { id: "id1", name: "name1" },
        { id: "id2", name: "name2" },
      ]);

      await loadEnumDictionary("simple_enum", false);

      sinon.assert.calledWith(hSetStub, "simple_enum", sinon.match.array);
      sinon.assert.neverCalledWith(hSetStub, "simple_enum_desc");
    });
  });
});
