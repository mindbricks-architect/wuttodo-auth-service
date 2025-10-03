const { RegisterUserManager } = require("apiLayer");
const { z } = require("zod");

const AuthMcpController = require("../../AuthServiceMcpController");

class RegisterUserMcpController extends AuthMcpController {
  constructor(params) {
    super("registerUser", "registeruser", params);
    this.dataName = "user";
    this.crudType = "create";
  }

  createApiManager() {
    return new RegisterUserManager(this.request, "mcp");
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
            email: z
              .string()
              .max(255)
              .describe(" A string value to represent the user's email."),
            password: z
              .string()
              .max(255)
              .describe(
                " A string value to represent the user's password. It will be stored as hashed.",
              ),
            fullname: z
              .string()
              .max(255)
              .describe("A string value to represent the fullname of the user"),
            avatar: z
              .string()
              .max(255)
              .optional()
              .nullable()
              .describe(
                "The avatar url of the user. A random avatar will be generated if not provided",
              ),
            roleId: z
              .string()
              .max(255)
              .describe("A string value to represent the roleId of the user."),
            emailVerified: z
              .boolean()
              .describe(
                "A boolean value to represent the email verification status of the user.",
              ),
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
      avatar: z
        .string()
        .max(255)
        .optional()
        .describe(
          "The avatar url of the user. If not sent, a default random one will be generated.",
        ),

      password: z
        .string()
        .max(255)
        .describe(
          "The password defined by the the user that is being registered.",
        ),

      fullname: z
        .string()
        .max(255)
        .describe(
          "The fullname defined by the the user that is being registered.",
        ),

      email: z
        .string()
        .max(255)
        .describe(
          "The email defined by the the user that is being registered.",
        ),
    };
  }
}

module.exports = (headers) => {
  return {
    name: "registerUser",
    description: "This api is used by public users to register themselves",
    parameters: RegisterUserMcpController.getInputScheme(),
    controller: async (mcpParams) => {
      console.log("Mcp Request Received", mcpParams);
      mcpParams.headers = headers;
      const controller = new RegisterUserMcpController(mcpParams);
      try {
        const result = await controller.processRequest();
        //return RegisterUserMcpController.getOutputSchema().parse(result);
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
