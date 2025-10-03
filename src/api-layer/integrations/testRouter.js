const express = require("express");
const router = express.Router();

const { HttpServerError, NotFoundError, HttpError } = require("common");

const getIntegrationClient = require("./index.js");

router.post("/testconnect", async (req, res, next) => {
  const provider = req.body.provider;

  if (!provider) {
    return next(new BadRequestError("Provider should be given."));
  }

  try {
    const client = await getIntegrationClient(provider);

    if (!client) {
      return next(new NotFoundError("Provider is not found"));
    }

    const connectResult = await client._init();

    await client._close();

    res.status(200).send({ result: connectResult });
  } catch (err) {
    return next(
      err instanceof HttpError
        ? err
        : new HttpServerError(`Integration Test Failed: ${err.toString()}`),
    );
  }
});

router.post("/testall", async (req, res, next) => {
  const provider = req.body.provider;

  if (!provider) {
    return next(new BadRequestError("Provider should be given."));
  }

  try {
    const client = await getIntegrationClient(provider);

    if (!client) {
      return next(new NotFoundError("Provider is not found"));
    }

    const testResult = await client._test();

    await client._close();

    res.status(200).send({ result: testResult });
  } catch (err) {
    return next(
      err instanceof HttpError
        ? err
        : new HttpServerError(`Integration Test Failed: ${err.toString()}`),
    );
  }
});

module.exports = router;
