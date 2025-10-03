require("module-alias/register");
const request = require("supertest");
const express = require("express");
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const assert = require("assert");

describe("Social Auth Router", () => {
  let app, axiosStub, createSessionStub, router;

  beforeEach(() => {
    axiosStub = {
      post: sinon.stub(),
      get: sinon.stub(),
    };

    createSessionStub = sinon.stub().returns({
      loginBySocialAccount: sinon.stub().resolves(),
    });

    router = proxyquire("../../src/project-session/social-login-router", {
      axios: axiosStub,
      "../project-session/create-session": { createSession: createSessionStub },
    });

    app = express();
    app.use(express.json());
    app.use("/", router);
  });

  it("GET /auth/social-login-redirect should redirect with query string", async () => {
    const state = { redirect: "/target" };
    const stateStr = Buffer.from(JSON.stringify(state)).toString("base64");

    const res = await request(app).get(
      "/auth/social-login-redirect?state=" + stateStr + "&queryString=foo=bar",
    );
    assert.strictEqual(res.status, 302);
    assert(res.header.location.includes("/target"));
  });

  it("GET /social-login-demo should return HTML file", async () => {
    const res = await request(app).get("/social-login-demo");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.type, "text/html");
  });

  it("GET /auth/google should redirect to Google OAuth", async () => {
    process.env.GOOGLE_CLIENT_ID = "dummy-id";
    process.env.SERVICE_URL = "http://localhost";
    const res = await request(app).get("/auth/google");
    assert.strictEqual(res.status, 302);
    assert(
      res.header.location.startsWith(
        "https://accounts.google.com/o/oauth2/v2/auth",
      ),
    );
  });

  it("GET /auth/google/callback should handle missing code", async () => {
    const res = await request(app).get("/auth/google/callback");
    assert.strictEqual(res.status, 400);
  });

  it("GET /auth/github should redirect to GitHub OAuth", async () => {
    process.env.GITHUB_CLIENT_ID = "dummy-id";
    process.env.SERVICE_URL = "http://localhost";
    const res = await request(app).get("/auth/github");
    assert.strictEqual(res.status, 302);
    assert(
      res.header.location.startsWith(
        "https://github.com/login/oauth/authorize",
      ),
    );
  });

  it("GET /auth/gitlab should redirect to GitLab OAuth", async () => {
    process.env.GITLAB_CLIENT_ID = "dummy-id";
    process.env.SERVICE_URL = "http://localhost";
    const res = await request(app).get("/auth/gitlab");
    assert.strictEqual(res.status, 302);
    assert(
      res.header.location.startsWith("https://gitlab.com/oauth/authorize"),
    );
  });

  it("GET /auth/gitlab/callback should handle missing code", async () => {
    const res = await request(app).get("/auth/gitlab/callback");
    assert.strictEqual(res.status, 400);
  });

  it("GET /auth/apple should redirect to Apple OAuth", async () => {
    process.env.APPLE_CLIENT_ID = "dummy-id";
    process.env.SERVICE_URL = "http://localhost";
    const res = await request(app).get("/auth/apple");
    assert.strictEqual(res.status, 302);
    assert(
      res.header.location.startsWith(
        "https://appleid.apple.com/auth/authorize",
      ),
    );
  });

  it("POST /auth/apple/callback should handle missing code", async () => {
    const res = await request(app).post("/auth/apple/callback").send({});
    assert.strictEqual(res.status, 400);
  });

  it("GET /github-auth/callback should return HTML", async () => {
    const res = await request(app).get("/github-auth/callback");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.type, "text/html");
  });

  it("GET /auth/github/callback should handle missing code", async () => {
    const res = await request(app).get("/auth/github/callback");
    assert.strictEqual(res.status, 400);
  });

  it("GET /google-auth/callback should return HTML", async () => {
    const res = await request(app).get("/google-auth/callback");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.type, "text/html");
  });

  it("GET /apple-auth/callback should return HTML", async () => {
    const res = await request(app).get("/apple-auth/callback");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.type, "text/html");
  });

  it("GET /gitlab-auth/callback should return HTML", async () => {
    const res = await request(app).get("/gitlab-auth/callback");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.type, "text/html");
  });
});
