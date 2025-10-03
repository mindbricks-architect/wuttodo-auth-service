const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("Icon Utils", () => {
  let extractIconFromGrid, sendImageBuffer;
  let sharpStub, extractStub, toBufferStub;

  beforeEach(() => {
    toBufferStub = sinon.stub().resolves(Buffer.from("fake-image"));
    extractStub = sinon.stub().returns({ toBuffer: toBufferStub });
    sharpStub = sinon.stub().returns({ extract: extractStub });

    ({ extractIconFromGrid, sendImageBuffer } = proxyquire(
      "../../src/common/imageUtils",
      { sharp: sharpStub },
    ));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("extractIconFromGrid", () => {
    it("should calculate correct coordinates and return buffer", async () => {
      const padding = { top: 10, left: 20, spacing: 5 };
      const iconSize = 32;
      const iconIndex = 3;
      const iconsPerRow = 5;

      const result = await extractIconFromGrid(
        "fake-path.png",
        padding,
        iconSize,
        iconIndex,
        iconsPerRow,
      );

      expect(sharpStub.calledWith("fake-path.png")).to.be.true;
      expect(extractStub.calledOnce).to.be.true;

      const args = extractStub.firstCall.args[0];
      expect(args).to.deep.equal({
        left: 20 + 3 * (32 + 5),
        top: 10 + 0 * (32 + 5),
        width: 32,
        height: 32,
      });

      expect(toBufferStub.calledOnce).to.be.true;
      expect(result.toString()).to.equal("fake-image");
    });

    it("should throw error if sharp fails", async () => {
      toBufferStub.rejects(new Error("sharp failed"));

      try {
        await extractIconFromGrid(
          "fake-path.png",
          { top: 0, left: 0, spacing: 0 },
          32,
          0,
          5,
        );
        expect.fail("Expected error not thrown");
      } catch (err) {
        expect(err.message).to.include("Failed to extract icon: sharp failed");
      }
    });
  });

  describe("sendImageBuffer", () => {
    it("should set headers for inline display", () => {
      const res = {
        set: sinon.stub(),
        send: sinon.stub(),
      };
      const buffer = Buffer.from("fake-image");

      sendImageBuffer(buffer, res);

      expect(res.set.calledWith("Content-Type", "image/png")).to.be.true;
      expect(res.set.calledWith("Content-Disposition", "inline")).to.be.true;
      expect(res.send.calledWith(buffer)).to.be.true;
    });

    it("should set headers for download with filename", () => {
      const res = {
        set: sinon.stub(),
        send: sinon.stub(),
      };
      const buffer = Buffer.from("fake-image");

      sendImageBuffer(buffer, res, "icon.png", true);

      expect(res.set.calledWith("Content-Type", "image/png")).to.be.true;
      expect(
        res.set.calledWith(
          "Content-Disposition",
          'attachment; filename="icon.png"',
        ),
      ).to.be.true;
      expect(res.send.calledWith(buffer)).to.be.true;
    });
  });
});
