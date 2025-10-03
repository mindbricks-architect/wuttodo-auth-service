const mongoose = require("mongoose");

const serviceName = process.env.SERVICE_CODENAME || "hexa-test";

mongoose.set("strictQuery", true);

const closeMongoDbConnection = async () => {
  console.log("🔌 Disconnecting MongoDb...");
  await mongoose.connection.close();
};

const connectToMongoDb = async () => {
  let uri = "";

  try {
    const dbUser = process.env.MONGODB_USER;
    const dbPass = process.env.MONGODB_PASSWORD;
    const dbHost = process.env.MONGODB_HOST;
    const dbPort = process.env.MONGODB_PORT;

    uri = `mongodb://${dbHost}:${dbPort}/${serviceName}?retryWrites=true&w=majority`;

    await mongoose.connect(uri, {
      authSource: "admin",
      user: dbUser,
      pass: dbPass,
    });
    console.log("✅ Connected to MongoDb:", uri);
    return null;
  } catch (err) {
    console.log("❌ Can not connect to MongoDb:", uri);
    return err;
  }
};

const startMongoDb = async () => {
  const err = await connectToMongoDb();

  if (err) {
    console.log(
      "❌ MongoDB connection failed, service will continue without database",
    );
  }
};

module.exports = {
  mongoose,
  connectToMongoDb,
  startMongoDb,
  closeMongoDbConnection,
};
