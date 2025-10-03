const { GetBriefUserManager } = require("apiLayer");
const { z } = require("zod");

const AuthMcpController = require("../../AuthServiceMcpController");

class GetBriefUserMcpController extends AuthMcpController {
  constructor(params) {
    super("getBriefUser", "getbriefuser", params);
    this.dataName = "user";
    this.crudType = "get";
  }

  createApiManager() {
    return new GetBriefUserManager(this.request, "mcp");
  }

  static getOutputSchema() {
    return z
      .object({
        status: z.string(),
        user: z
          .object({
            id: z
              .string()
              .uuid()
              .describe("The unique primary key of the data object as UUID"),
            isActive: z
              .boolean()
              .describe(
                "The active status of the data object to manage soft delete. False when deleted.",
              ),
          })
          .describe(
            "A data object that stores the user information and handles login settings.",
          ),
      })
      .describe("The response object of the crud route");
  }

  static getInputScheme() {
    return {
      userId: z
        .string()
        .uuid()
        .describe(
          "This id paremeter is used to query the required data object.",
        ),
    };
  }
}

module.exports = (headers) => {
  return {
    name: "getBriefUser",
    description:
      "This route is used by public to get simple user profile information.",
    parameters: GetBriefUserMcpController.getInputScheme(),
    controller: async (mcpParams) => {
      console.log("Mcp Request Received", mcpParams);
      mcpParams.headers = headers;
      const controller = new GetBriefUserMcpController(mcpParams);
      try {
        const result = await controller.processRequest();
        //return GetBriefUserMcpController.getOutputSchema().parse(result);
        console.log("Mcp Response Ready", JSON.stringify(result));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (err) {
        console.log("Mcp Error Occured", err.message);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${err.message}`,
            },
          ],
        };
      }
    },
  };
};
