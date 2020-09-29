const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Person = require("../models/person");
const {
  UserInputError,
  AuthenticationError,
  ApolloError,
} = require("apollo-server");
const { validateLogin } = require("../helper/validate");
const { validateRegister } = require("../helper/validate");
const { auth } = require("../helper/auth");
let generateToken = (person) =>
  jwt.sign(
    {
      id: person.id,
      email: person.email,
      username: person.username,
    },
    "SOME PRIVAT KEY",
    { expiresIn: "1h" }
  );
module.exports = {
  Query: {
    async getUsers() {
      try {
        let users = await User.find().sort();
        return users;
      } catch (err) {
        console.log(err);
      }
    },
    async getUser(parent, { id }) {
      try {
        const user = await User.findById(id);
        return user;
      } catch (err) {
        console.log(err);
      }
    },
  },
  Mutation: {
    async addUser(parent, args, context) {
      const person = auth(context);
      try {
        let newUser = new User({
          ...args,
          username: person.username,
        });
        let user = await newUser.save();
        context.pubSub.publish("NEW_USER", {
          newUser: user,
        });
        return user;
      } catch (err) {
        throw new Error("A User have name");
      }
    },
    async deleteUser(parent, { id }, context) {
      const person = auth(context);
      try {
        const user = await User.findById(id);
        if (person.username === user.username) {
          await user.delete();
          return "User deleted";
        } else {
          throw new AuthenticationError("Действие запрещено");
        }
      } catch (err) {
        throw new Error("Some error:", err);
      }
    },
    async register(
      parent,
      { inputData: { username, password, confirmPassword, email } }
    ) {
      const { errors, validate } = validateRegister(
        username,
        password,
        confirmPassword,
        email
      );
      const person = await Person.findOne({ username });
      if (validate) {
        throw new UserInputError("произошла ошибка", { errors });
      }

      if (person) {
        throw new UserInputError("Username is taken", {
          errors: {
            username: "This username is taken",
          },
        });
      }

      const newPerson = new Person({
        username,
        email,
        password,
      });
      let result = await newPerson.save();
      const token = generateToken(result);
      return {
        ...result._doc,
        id: result._id,
        token,
      };
    },
    async login(parent, { username, password }) {
      const { errors, validate } = validateLogin(username, password);
      let person = await Person.findOne({ username });
      if (validate) {
        throw new UserInputError("произошла ошибка", { errors });
      }

      if (!person) {
        errors.general = "Пользователь не найден";
        throw new UserInputError("Пользователь не найден", { errors });
      }
      let match = password === person.password && true;
      if (!match) {
        errors.general = "Пароль не совпадает";
        throw new Error("Пароль не совпадает");
      }
      const token = generateToken(person);
      return {
        ...person._doc,
        id: person._id,
        token,
      };
    },
  },
  Subscription: {
    newUser: {
      subscribe: (parent, args, context) =>
        context.pubSub.asyncIterator("NEW_USER"),
    },
  },
};
