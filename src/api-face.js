const { inject } = require("mindbricks-api-face");

module.exports = (app) => {
  const basePath =
    process.env.SERVICE_URL_SUFFIX ?? `${process.env.SERVICE_SHORT_NAME}-api`;
  const baseUrl = process.env.SERVICE_URL ?? "mindbricks.com";
  const shortName = process.env.SERVICE_SHORT_NAME?.toLowerCase();
  const authUrl = shortName ? baseUrl.replace(shortName, "auth") : baseUrl;

  const config = {
    basePath: basePath,
    name: "wuttodo - auth",
    brand: {
      name: "wuttodo",
      image: "https://minioapi.masaupp.com/mindbricks/favico.ico",
      moduleName: "auth",
      version: process.env.SERVICE_VERSION || "1.0.0",
    },
    auth: {
      url: authUrl,
      loginPath: "/login",
      logoutPath: "/logout",
      currentUserPath: "/currentuser",
      authStrategy: "external",
      initialAuth: true,
    },
    dataObjects: [
      {
        name: "User",
        description:
          "A data object that stores the user information and handles login settings.",
        reference: {
          tableName: "user",
          properties: [
            {
              name: "email",
              type: "String",
            },

            {
              name: "password",
              type: "String",
            },

            {
              name: "fullname",
              type: "String",
            },

            {
              name: "avatar",
              type: "String",
            },

            {
              name: "roleId",
              type: "String",
            },

            {
              name: "emailVerified",
              type: "Boolean",
            },
          ],
        },
        endpoints: [
          {
            isAuth: true,
            method: "GET",
            url: `${basePath}/v1/users/{userId}`,
            title: "Get User",
            query: [],

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: true,
            method: "PATCH",
            url: `${basePath}/v1/users/{userId}`,
            title: "Update User",
            query: [],

            body: {
              type: "json",
              content: {},
            },

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: false,
            method: "POST",
            url: `${basePath}/v1/registeruser`,
            title: "Register User",
            query: [],

            body: {
              type: "json",
              content: {
                avatar: "String",
                password: "String",
                fullname: "String",
                email: "String",
              },
            },

            parameters: [],
            headers: [],
          },

          {
            isAuth: true,
            method: "DELETE",
            url: `${basePath}/v1/users/{userId}`,
            title: "Delete User",
            query: [],

            body: {
              type: "json",
              content: {},
            },

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: true,
            method: "GET",
            url: `${basePath}/v1/users`,
            title: "List Users",
            query: [],

            body: {
              type: "json",
              content: {},
            },

            parameters: [],
            headers: [],
          },

          {
            isAuth: true,
            method: "PATCH",
            url: `${basePath}/v1/userrole/{userId}`,
            title: "Update Userrole",
            query: [],

            body: {
              type: "json",
              content: {
                roleId: "String",
              },
            },

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: true,
            method: "PATCH",
            url: `${basePath}/v1/userpassword/{userId}`,
            title: "Update Userpassword",
            query: [],

            body: {
              type: "json",
              content: {
                oldPassword: "String",
                newPassword: "String",
              },
            },

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: false,
            method: "GET",
            url: `${basePath}/v1/briefuser/{userId}`,
            title: "Get Briefuser",
            query: [],

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },
        ],
      },
    ],
  };

  inject(app, config);
};
