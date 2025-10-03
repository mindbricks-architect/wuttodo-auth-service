const AuthServiceGrpcController = require("./AuthServiceGrpcController");

module.exports = (name, routeName, call, callback) => {
  const grpcController = new AuthServiceGrpcController(
    name,
    routeName,
    call,
    callback,
  );
  return grpcController;
};
