const { model, Schema } = require("mongoose");
const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: String,
  username: String,
});

module.exports = model("user", userSchema);
