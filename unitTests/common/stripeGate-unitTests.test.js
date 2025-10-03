const chai = require("chai");
const sinon = require("sinon");
const { expect } = chai;
const { PaymentGateError } = require("../../src/common/error");
const fs = require("fs");

describe("StripeGate", function () {
  let stripeGate, stripeStub;

  beforeEach(() => {
    // Fake env vars so module exports an instance
    process.env.STRIPE_KEY = "pk_test_123";
    process.env.STRIPE_SECRET = "sk_test_123";

    delete require.cache[require.resolve("../../src/common/stripeGate")];
    stripeGate = require("../../src/common/stripeGate");

    // Patch stripe client inside the instance
    stripeStub = {
      paymentIntents: {
        create: sinon.stub(),
        retrieve: sinon.stub(),
        confirm: sinon.stub(),
      },
      webhookEndpoints: {
        create: sinon.stub(),
      },
      webhooks: {
        constructEvent: sinon.stub(),
      },
      customers: {
        list: sinon.stub(),
        create: sinon.stub(),
        update: sinon.stub(),
      },
      paymentMethods: {
        attach: sinon.stub(),
        detach: sinon.stub(),
      },
    };
    stripeGate.stripe = stripeStub;
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.STRIPE_KEY;
    delete process.env.STRIPE_SECRET;
  });

  describe("Initialization", function () {
    it("should initialize StripeGate with given config", function () {
      expect(stripeGate.gateName).to.equal("stripe");
      expect(stripeGate.config.secretKey).to.equal("sk_test_123");
      expect(stripeGate.config.publicKey).to.equal("pk_test_123");
    });
  });

  describe("getStatusLiteral()", function () {
    it("should return correct status literals", function () {
      expect(stripeGate.getStatusLiteral("succeeded")).to.equal("success");
      expect(stripeGate.getStatusLiteral("canceled")).to.equal("canceled");
      expect(stripeGate.getStatusLiteral("unknown_status")).to.equal(
        "unknown-unknown_status",
      );
    });
  });

  describe("registerWebHook()", function () {
    it("should create a webhook endpoint", async function () {
      const mockWebhook = { id: "wh_123", secret: "wh_secret" };
      stripeStub.webhookEndpoints.create.resolves(mockWebhook);

      await stripeGate.registerWebHook("http://example.com/webhook");

      expect(stripeStub.webhookEndpoints.create.calledOnce).to.be.true;
      expect(stripeGate.stripeSignKey).to.equal("wh_secret");
    });

    it("should handle errors gracefully", async function () {
      stripeStub.webhookEndpoints.create.rejects(
        new Error("Webhook creation failed"),
      );

      await stripeGate.registerWebHook("http://example.com/webhook");

      expect(stripeStub.webhookEndpoints.create.calledOnce).to.be.true;
    });
  });

  describe("startCheckout()", function () {
    it("should start a checkout and return payment details", async function () {
      const mockPaymentIntent = {
        id: "pi_123",
        client_secret: "secret_123",
        status: "requires_payment_method",
      };

      stripeStub.paymentIntents.create.resolves(mockPaymentIntent);

      const checkoutParams = {
        amount: 100,
        currency: "USD",
        description: "Test Payment",
        metadata: { orderId: "order_123" },
        orderId: "order_123",
        paymentUserParams: { paymentMethodId: "pm_123" },
      };

      const result = await stripeGate.startCheckout(checkoutParams);

      expect(stripeStub.paymentIntents.create.calledOnce).to.be.true;
      expect(result.paymentId).to.equal("pi_123");
      expect(result.paymentStatus).to.equal("requires_payment_method");
      expect(result.statusLiteral).to.equal("started");
    });

    it("should throw an error if Stripe payment creation fails", async function () {
      stripeStub.paymentIntents.create.rejects(new Error("Stripe error"));

      const checkoutParams = {
        amount: 100,
        currency: "USD",
        description: "Test Payment",
        metadata: { orderId: "order_123" },
        orderId: "order_123",
        paymentUserParams: { paymentMethodId: "pm_123" },
      };

      try {
        await stripeGate.startCheckout(checkoutParams);
      } catch (err) {
        expect(err).to.be.instanceOf(PaymentGateError);
        expect(err.message).to.equal("Stripe error");
      }
    });
  });

  describe("completeCheckout()", function () {
    it("should complete a checkout successfully", async function () {
      const mockPaymentIntent = {
        id: "pi_123",
        client_secret: "secret_123",
        status: "succeeded",
        metadata: {},
      };

      stripeStub.paymentIntents.retrieve.resolves(mockPaymentIntent);
      stripeStub.paymentIntents.confirm.resolves(mockPaymentIntent);

      const checkoutParams = {
        paymentUserParams: {
          paymentIntentId: "pi_123",
          paymentMethod: "pm_123",
          returnUrl: "http://example.com",
        },
        paymentId: "pi_123",
      };

      const result = await stripeGate.completeCheckout(checkoutParams);

      expect(stripeStub.paymentIntents.retrieve.calledOnce).to.be.true;
      expect(stripeStub.paymentIntents.confirm.calledOnce).to.be.false;
      expect(result.paymentStatus).to.equal("succeeded");
    });
  });

  describe("refreshCheckout()", function () {
    it("should return the updated payment status", async function () {
      const mockPaymentIntent = {
        id: "pi_123",
        status: "processing",
        metadata: {},
      };

      stripeStub.paymentIntents.retrieve.resolves(mockPaymentIntent);

      const result = await stripeGate.refreshCheckout({ paymentId: "pi_123" });

      expect(stripeStub.paymentIntents.retrieve.calledOnce).to.be.true;
      expect(result.paymentStatus).to.equal("processing");
      expect(result.statusLiteral).to.equal("started");
    });

    it("should throw an error if payment intent is not found", async function () {
      stripeStub.paymentIntents.retrieve.resolves(null);

      try {
        await stripeGate.refreshCheckout({ paymentId: "pi_123" });
      } catch (err) {
        expect(err).to.be.instanceOf(PaymentGateError);
        expect(err.message).to.equal(
          "No payment intent found on stripe with this id",
        );
      }
    });
  });

  describe("getCheckoutDemoHtml()", function () {
    it("should return 'Demo Not Found For stripe' if the file does not exist", async function () {
      fs.existsSync = () => false;

      const result = await stripeGate.getCheckoutDemoHtml(
        "https://yourdomain.com/demo",
        "https://yourdomain.com/simpleCheckout",
        "https://yourdomain.com/startCheckout",
        "https://yourdomain.com/endCheckout",
        "https://yourdomain.com/refreshCheckout",
        "https://yourdomain.com/getOrder",
        "https://yourdomain.com/getStoredCards",
      );

      expect(result).to.equal("Demo Not Found For stripe");
    });
  });

  describe("requiresAction / requiresConfirmation / requiresRedirect", () => {
    it("requiresAction should return true only if status=requires_action and type=use_stripe_sdk", () => {
      const pi1 = {
        status: "requires_action",
        next_action: { type: "use_stripe_sdk" },
      };
      expect(stripeGate.requiresAction(pi1)).to.be.true;

      const pi2 = { status: "requires_action", next_action: { type: "other" } };
      expect(stripeGate.requiresAction(pi2)).to.be.false;

      const pi3 = { status: "succeeded" };
      expect(stripeGate.requiresAction(pi3)).to.be.false;
    });

    it("requiresConfirmation should return true only if status=requires_confirmation", () => {
      expect(
        stripeGate.requiresConfirmation({ status: "requires_confirmation" }),
      ).to.be.true;
      expect(stripeGate.requiresConfirmation({ status: "succeeded" })).to.be
        .false;
    });

    it("requiresRedirect should return true if requires_action and has redirect_to_url", () => {
      const pi1 = {
        status: "requires_action",
        next_action: { redirect_to_url: { url: "http://x" } },
      };
      expect(stripeGate.requiresRedirect(pi1)).to.be.true;

      const pi2 = { status: "requires_action", next_action: {} };
      expect(stripeGate.requiresRedirect(pi2)).to.be.false;
    });
  });

  describe("webhookController", () => {
    it("should parse succeeded event", async () => {
      process.env.NODE_ENV = "production";
      stripeGate.stripeSignKey = "secret";
      const mockEvent = {
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_123",
            status: "succeeded",
            metadata: { orderId: "o1" },
            amount: 100,
          },
        },
      };
      stripeStub.webhooks.constructEvent.returns(mockEvent);

      const req = {
        rawBody: "{}",
        headers: { "stripe-signature": "sig" },
        body: {},
      };
      const res = {};
      const result = await stripeGate.webhookController(req, res);

      expect(result.statusLiteral).to.equal("success");
      expect(result.paymentId).to.equal("pi_123");
      expect(result.orderId).to.equal("o1");
    });
  });

  describe("customer and payment method helpers", () => {
    it("getCustomerIdByEmail should return first customer", async () => {
      stripeStub.customers.list.resolves({ data: [{ id: "cus_123" }] });
      const result = await stripeGate.getCustomerIdByEmail("test@example.com");
      expect(result.id).to.equal("cus_123");
    });

    it("addNewCustomer should return created customer", async () => {
      stripeStub.customers.create.resolves({ id: "cus_999" });
      const result = await stripeGate.addNewCustomer(
        "Full Name",
        "test@example.com",
        "u1",
      );
      expect(result.id).to.equal("cus_999");
    });

    it("addNewPaymentMethod should return attached payment method", async () => {
      stripeStub.paymentMethods.attach.resolves({ id: "pm_123" });
      const result = await stripeGate.addNewPaymentMethod("cus_1", "pm_123");
      expect(result.id).to.equal("pm_123");
    });

    it("deletePaymentMethod should return detached payment method", async () => {
      stripeStub.paymentMethods.detach.resolves({ id: "pm_456" });
      const result = await stripeGate.deletePaymentMethod("pm_456");
      expect(result.id).to.equal("pm_456");
    });

    it("setDefaultPaymentMethod should return updated customer", async () => {
      stripeStub.customers.update.resolves({
        id: "cus_2",
        invoice_settings: { default_payment_method: "pm_x" },
      });
      const result = await stripeGate.setDefaultPaymentMethod("cus_2", "pm_x");
      expect(result.invoice_settings.default_payment_method).to.equal("pm_x");
    });
  });

  describe("createPaymentIntent", () => {
    it("should call stripe.paymentIntents.create and return the intent", async () => {
      stripeStub.paymentIntents.create.resolves({ id: "pi_new" });
      const result = await stripeGate.createPaymentIntent(
        1000,
        "usd",
        "desc",
        "cus_3",
        "pm_9",
      );
      expect(stripeStub.paymentIntents.create.calledOnce).to.be.true;
      expect(result.id).to.equal("pi_new");
    });
  });
});

describe("doSimpleCheckout()", function () {
  let stripeGateInstance;

  beforeEach(() => {
    process.env.STRIPE_KEY = "pk_test_123";
    process.env.STRIPE_SECRET = "sk_test_123";
    delete require.cache[require.resolve("../../src/common/stripeGate")];
    stripeGateInstance = require("../../src/common/stripeGate");
  });

  it("should throw an error when simple payment is discontinued in stripe", async function () {
    const checkoutParams = {
      amount: 5000,
      currency: "USD",
      description: "Simple Checkout",
      orderId: "order_456",
    };

    try {
      await stripeGateInstance.doSimpleCheckout(checkoutParams);
      throw new Error("Expected PaymentGateError not thrown");
    } catch (error) {
      expect(error).to.be.instanceOf(PaymentGateError);
      expect(error.message).to.equal(
        "Simple payment is discontinued in stripe",
      );
    }
  });
});
