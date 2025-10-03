module.exports = (headers) => {
  // main Database Crud Object Mcp Api Routers
  return {
    userMcpRouter: require("./user")(headers),
  };
};
