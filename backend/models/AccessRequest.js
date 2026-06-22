const mongoose = require("mongoose");

const accessRequestSchema =
  new mongoose.Schema(
    {
      board: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Board",
        required: true,
      },

      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
        ],
        default: "pending",
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "AccessRequest",
    accessRequestSchema
  );