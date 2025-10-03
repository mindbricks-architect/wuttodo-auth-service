const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("KafkaPublisher", () => {
  let KafkaPublisher;
  let sendMessageToKafkaStub;
  let hexaLoggerStub;
  let basePublisherStub;

  beforeEach(() => {
    sendMessageToKafkaStub = sinon.stub();

    hexaLoggerStub = {
      insertInfo: sinon.stub(),
      insertError: sinon.stub(),
    };

    basePublisherStub = class {
      constructor(eventName, data) {
        this.eventName = eventName;
        this.data = data;
        this.reTry = 0;
      }
      async publish() {}
      async delayRetry() {
        this.reTry++;
        return false; // default: stop retrying
      }
    };

    KafkaPublisher = proxyquire("../../src/common/kafka-publisher", {
      "./hexa-publisher": basePublisherStub,
      "./kafka": { sendMessageToKafka: sendMessageToKafkaStub },
      "../common/hexa-logger": {
        hexaLogger: hexaLoggerStub,
      },
    });

    process.env.SERVICE_NAME = "unit-service";
  });

  it("should publish successfully and log info", async () => {
    sendMessageToKafkaStub.resolves([{ status: "ok" }]);
    const publisher = new KafkaPublisher("test-event", { id: 1 });

    const result = await publisher.publish();
    expect(result).to.be.an("array").with.lengthOf(1);
    expect(
      hexaLoggerStub.insertInfo.calledWithMatch(
        "EventRaised",
        sinon.match.object,
        "kafka-publisher.js->publish",
        { id: 1 },
      ),
    ).to.be.true;
  });

  it("should retry and log error if publishing fails completely", async () => {
    sendMessageToKafkaStub.resolves([]);

    class NoRetryPublisher extends KafkaPublisher {
      delayRetry() {
        this.reTry++;
        return false; // stop retrying immediately, triggers insertError
      }
    }

    const publisher = new NoRetryPublisher("fail-event", { id: 2 });
    const result = await publisher.publish();

    expect(result).to.be.an("array").that.is.empty;
    expect(
      hexaLoggerStub.insertError.calledWithMatch(
        "EventCanNotBeRaised",
        sinon.match.object,
        "kafka-publisher.js->publish",
        { id: 2 },
      ),
    ).to.be.true;
  });

  it("should retry and not log error if retry continues", async () => {
    sendMessageToKafkaStub.resolves([]);

    class RetryPublisher extends KafkaPublisher {
      delayRetry() {
        this.reTry++;
        return true; // keep retrying
      }
    }

    const publisher = new RetryPublisher("retry-event", { a: 3 });
    const result = await publisher.publish();

    expect(result).to.deep.equal([]);
    expect(publisher.reTry).to.equal(1);
    // no insertError called
    expect(hexaLoggerStub.insertError.called).to.be.false;
  });

  it("should log raised message if reTry is greater than 0 and sendMessageToKafka succeeds", async () => {
    sendMessageToKafkaStub.resolves([{ status: "ok" }]);
    const publisher = new KafkaPublisher("delayed-success", { x: 5 });
    publisher.reTry = 2;

    const result = await publisher.publish();
    expect(result).to.have.lengthOf(1);
    expect(
      hexaLoggerStub.insertInfo.calledWithMatch(
        "EventRaised",
        sinon.match.object,
        "kafka-publisher.js->publish",
        { x: 5 },
      ),
    ).to.be.true;
  });
});
