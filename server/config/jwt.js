require("dotenv").config();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "task-manager-secret-2026";

module.exports = {
  JWT_SECRET,
};
