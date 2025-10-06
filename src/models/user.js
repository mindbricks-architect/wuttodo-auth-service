const { sequelize } = require("common");
const { DataTypes } = require("sequelize");

//A data object that stores the user information and handles login settings.
const User = sequelize.define(
  "user",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    email: {
      //  A string value to represent the user's email.
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "default",
    },
    password: {
      //  A string value to represent the user's password. It will be stored as hashed.
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "default",
    },
    fullname: {
      // A string value to represent the fullname of the user
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "default",
    },
    avatar: {
      // The avatar url of the user. A random avatar will be generated if not provided
      type: DataTypes.STRING,
      allowNull: true,
    },
    roleId: {
      // A string value to represent the roleId of the user.
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "user",
    },
    emailVerified: {
      // A boolean value to represent the email verification status of the user.
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      // isActive property will be set to false when deleted
      // so that the document will be archived
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["email"],
        where: { isActive: true },
      },
    ],
  },
);

module.exports = User;
