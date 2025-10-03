const awsS3Client = require("./awsS3");
const googleMapsClient = require("./googleMaps");

const clients = {};

const clientConstructors = {
  awsS3: () => {
    return new awsS3Client(
      process.env.CONFIG_ENV == "prod"
        ? {
            accessKeyId: "sample_accessKeyId_Live",
            secretAccessKey: process.env.AWS_SECRET_KEY,
            region: "eu-west-1",
          }
        : {
            accessKeyId: "sample_accessKeyId_Test",
            secretAccessKey: process.env.AWS_SECRET_KEY,
            region: "eu-west-1",
          },
    );
  },
  googleMaps: () => {
    return new googleMapsClient(
      process.env.CONFIG_ENV == "prod"
        ? {
            apiKey: "AIzaSyDLylxjnQ-4OLRm-Fsa3AGPTmQrzBAMMQU",
            language: "en",
            region: "tr",
          }
        : {
            apiKey: "AIzaSyDLylxjnQ-4OLRm-Fsa3AGPTmQrzBAMMQU",
            language: "en",
            region: "tr",
          },
    );
  },
};

const createClient = async (provider) => {
  if (!clientConstructors[provider]) return null;
  return clientConstructors[provider]();
};

const getIntegrationClient = async (provider) => {
  clients[provider] = clients[provider] || (await createClient(provider));
  return clients[provider];
};

module.exports = getIntegrationClient;
