const { UpdateUserPasswordManager } = require("apiLayer");
const { z } = require("zod");

const AuthMcpController = require("../../AuthServiceMcpController");

class UpdateUserPasswordMcpController extends AuthMcpController {
  constructor(params) {
    super("updateUserPassword", "updateuserpassword", params);
    this.dataName = "user";
    this.crudType = "update";
  }

  createApiManager() {
    return new UpdateUserPasswordManager(this.request, "mcp");
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
      accessToken: z
        .string()
        .optional()
        .describe(
          "The access token which is returned from a login request or given by user. This access token will override if there is any bearer or OAuth token in the mcp client. If not given the request will be made with the system (bearer or OAuth) token. For public routes you dont need to deifne any access token.",
        ),
      userId: z
        .string()
        .uuid()
        .describe(
          "This id paremeter is used to select the required data object that will be updated",
        ),

      oldPassword: z
        .string()
        .max(255)
        .describe(
          "The old password of the user that will be overridden bu the new one. Send for double check.",
        ),

      newPassword: z
        .string()
        .max(255)
        .describe("The new password of the user to be updated"),
    };
  }
}

module.exports = (headers) => {
  return {
    name: "updateUserPassword",
    description:
      "This route is used to to force the password update by old password.",
    parameters: UpdateUserPasswordMcpController.getInputScheme(),
    controller: async (mcpParams) => {
      console.log("Mcp Request Received", mcpParams);
      mcpParams.headers = headers;
      const controller = new UpdateUserPasswordMcpController(mcpParams);
      try {
        const result = await controller.processRequest();
        //return UpdateUserPasswordMcpController.getOutputSchema().parse(result);
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
