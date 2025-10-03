const { expect } = require("chai");
const sinon = require("sinon");
const {
  OpenAiFetchManager,
  AnthropicFetchManager,
} = require("../../src/common/AiFetchManager");

describe("BaseAiFetchManager and Derived Classes", () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, "fetch");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("BaseAiFetchManager core behavior", () => {
    it("should throw error if API key is missing in makeRequest", async () => {
      const mgr = new OpenAiFetchManager("hi", null, {});
      mgr.apiKey = null; // simulate missing key
      try {
        await mgr.makeRequest({ userPrompt: "hi" });
        expect.fail("Expected error not thrown");
      } catch (err) {
        expect(err.message).to.equal("API key is required");
      }
    });

    it("should throw error if fetch response not ok", async () => {
      const mgr = new OpenAiFetchManager("hi", null, {});
      mgr.apiKey = "test-key";
      fetchStub.resolves({ ok: false, statusText: "Bad Request" });

      try {
        await mgr.makeRequest({ userPrompt: "hi" });
        expect.fail("Expected error not thrown");
      } catch (err) {
        expect(err.message).to.include("API request failed");
      }
    });

    it("should call fetch with correct args and parse response", async () => {
      const mgr = new OpenAiFetchManager("hi", "sys", {});
      mgr.apiKey = "test-key";
      const fakeData = { choices: [{ message: { content: "response text" } }] };

      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve(fakeData),
      });

      const result = await mgr.makeRequest({
        systemPrompt: mgr.systemPrompt,
        userPrompt: mgr.userPrompt,
      });

      expect(fetchStub.calledOnce).to.be.true;
      expect(result).to.equal("response text");
    });

    it("processResponse should throw on empty response", () => {
      const mgr = new OpenAiFetchManager("hi", null, {});
      expect(() => mgr.processResponse(null)).to.throw(
        "Empty response from AI service",
      );
    });

    it("processResponse should return parsed JSON when responseFormat=json", () => {
      const mgr = new OpenAiFetchManager("hi", null, {
        responseFormat: "json",
      });
      const parsed = mgr.processResponse('{"foo": "bar"}');
      expect(parsed).to.deep.equal({ foo: "bar" });
    });

    it("processResponse should wrap response in array if isArray=true", () => {
      const mgr = new OpenAiFetchManager("hi", null, { isArray: true });
      const parsed = mgr.processResponse("value");
      expect(parsed).to.deep.equal(["value"]);
    });

    it("execute should throw if API key is missing", async () => {
      const mgr = new OpenAiFetchManager("hi", null, {});
      mgr.apiKey = null;
      try {
        await mgr.execute("owner");
        expect.fail("Expected error not thrown");
      } catch (err) {
        expect(err.message).to.equal("API key not found");
      }
    });

    it("execute should call executeAiFetch and processResponse", async () => {
      const mgr = new OpenAiFetchManager("hi", null, {
        responseFormat: "json",
      });
      mgr.apiKey = "test-key";
      const fakeResponse = '{"foo":"bar"}';

      sinon.stub(mgr, "executeAiFetch").resolves(fakeResponse);
      const result = await mgr.execute("owner");

      expect(result).to.deep.equal({ foo: "bar" });
    });
  });

  describe("OpenAiFetchManager", () => {
    it("should build correct endpoint and headers", () => {
      const mgr = new OpenAiFetchManager("hello", "sys", {});
      mgr.apiKey = "test-key";
      expect(mgr.getApiEndpoint()).to.include("openai.com");
      const headers = mgr.getRequestHeaders();
      expect(headers).to.have.property("Authorization", `Bearer ${mgr.apiKey}`);
    });

    it("should format messages correctly", () => {
      const mgr = new OpenAiFetchManager("hello", "sys", {});
      const messages = mgr.formatMessages({
        systemPrompt: "sys",
        userPrompt: "hello",
      });
      expect(messages).to.deep.equal([
        { role: "system", content: "sys" },
        { role: "user", content: "hello" },
      ]);
    });

    it("should format request body correctly", () => {
      const mgr = new OpenAiFetchManager("hello", null, {});
      const messages = mgr.formatMessages({ userPrompt: "hello" });
      const body = mgr.formatRequestBody(messages);
      expect(body).to.have.keys(["model", "messages"]);
    });

    it("should extract response content correctly", () => {
      const mgr = new OpenAiFetchManager("hello", null, {});
      const content = mgr.extractResponseContent({
        choices: [{ message: { content: "hi" } }],
      });
      expect(content).to.equal("hi");
    });

    it("executeAiFetch should call makeRequest", async () => {
      const mgr = new OpenAiFetchManager("hello", null, {});
      mgr.apiKey = "test-key";
      sinon.stub(mgr, "makeRequest").resolves("result");
      const result = await mgr.executeAiFetch();
      expect(result).to.equal("result");
    });
  });

  describe("AnthropicFetchManager", () => {
    it("should build correct endpoint and headers", () => {
      const mgr = new AnthropicFetchManager("hello", "sys", {});
      mgr.apiKey = "test-key";
      expect(mgr.getApiEndpoint()).to.include("anthropic.com");
      const headers = mgr.getRequestHeaders();
      expect(headers).to.have.property("x-api-key", "test-key");
    });

    it("should format messages correctly", () => {
      const mgr = new AnthropicFetchManager("hello", "sys", {});
      const messages = mgr.formatMessages({
        systemPrompt: "sys",
        userPrompt: "hello",
      });
      expect(messages).to.deep.equal([
        { role: "system", content: "sys" },
        { role: "user", content: "hello" },
      ]);
    });

    it("should format request body correctly", () => {
      const mgr = new AnthropicFetchManager("hello", "sys", { maxTokens: 50 });
      const messages = mgr.formatMessages({
        systemPrompt: "sys",
        userPrompt: "hello",
      });
      const body = mgr.formatRequestBody(messages);
      expect(body).to.include.keys([
        "model",
        "messages",
        "max_tokens",
        "system",
      ]);
    });

    it("should extract response content correctly", () => {
      const mgr = new AnthropicFetchManager("hello", null, {});
      const content = mgr.extractResponseContent({ content: [{ text: "hi" }] });
      expect(content).to.equal("hi");
    });

    it("executeAiFetch should call makeRequest", async () => {
      const mgr = new AnthropicFetchManager("hello", null, {});
      mgr.apiKey = "test-key";
      sinon.stub(mgr, "makeRequest").resolves("result");
      const result = await mgr.executeAiFetch();
      expect(result).to.equal("result");
    });
  });
});
