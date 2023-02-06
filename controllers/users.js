/* eslint-disable object-curly-newline */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {
  OK_CODE,
  AUTH_ERROR_MESSAGE,
  NOT_FOUND_USER_MESSAGE,
  INCORRECT_ERROR_MESSAGE,
} = require('../constants');
const {
  IncorrectError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require('../errors/index');

const login = (req, res, next) => {
  const { email, password } = req.body;
  return User.findOne({ email })
    .select('+password')
    .then((user) => {
      if (!user) {
        throw new UnauthorizedError(AUTH_ERROR_MESSAGE);
      }
      return bcrypt.compare(password, user.password).then((matched) => {
        if (!matched) {
          throw new UnauthorizedError(AUTH_ERROR_MESSAGE);
        }
        return user;
      });
    })
    .then((user) => {
      const token = jwt.sign(
        {
          _id: user._id,
        },
        process.env.JWTKEY,
        {
          expiresIn: '7d',
        },
      );
      return res.send({
        token,
      });
    })
    .catch(next);
};

const createUser = (req, res, next) => {
  const { name, about, avatar, email, password } = req.body;

  bcrypt.hash(password, 10)
    .then((passHash) => User.create({
      name, about, avatar, email, password: passHash,
    })
      .then((newUser) => res.status(OK_CODE).send({
        _id: newUser._id, name, about, avatar, email,
      })))
    .catch((err) => {
      if (err.code === 11000) {
        return next(new ConflictError('Пользователь с таким email уже зарегистрирован'));
      }
      if (err.name === 'ValidationError') {
        return next(new IncorrectError(`${INCORRECT_ERROR_MESSAGE} при создании пользователя.`));
      }
      return next(err);
    });
};

const getUser = (req, res, next) => {
  User.findById(req.user._id)
    .then((user) => {
      res.send({
        user,
      });
    })
    .catch(next);
};

const getUsers = (req, res, next) => {
  User.find({})
    .then((users) => {
      res.send({
        data: users,
      });
    })
    .catch(next);
};

const getUserById = (req, res, next) => {
  User.findById(req.params.userId)
    .then((user) => {
      if (user === null) {
        throw new NotFoundError(NOT_FOUND_USER_MESSAGE);
      }
      return res.send({
        data: user,
      });
    })
    .catch((err) => {
      if (err instanceof mongoose.Error.CastError) {
        return next(new IncorrectError(`${INCORRECT_ERROR_MESSAGE} пользователя.`));
      }
      return next(err);
    });
};

const updateUser = (req, res, next, info) => {
  User.findByIdAndUpdate(req.user._id, info, {
    new: true,
    runValidators: true,
  })
    .then((user) => {
      if (user === null) {
        throw new NotFoundError(NOT_FOUND_USER_MESSAGE);
      }
      return res.send({
        data: user,
      });
    })
    .catch((err) => {
      if (err instanceof mongoose.Error.ValidationError) {
        return next(new IncorrectError(`${INCORRECT_ERROR_MESSAGE} при обновлении информации.`));
      }
      return next(err);
    });
};
const updateUserInfo = (req, res, next) => {
  const { name, about } = req.body;
  updateUser(req, res, next, {
    name,
    about,
  });
};

const updateAvatar = (req, res, next) => {
  const { avatar } = req.body;
  updateUser(req, res, next, {
    avatar,
  });
};

module.exports = {
  login,
  createUser,
  getUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserInfo,
  updateAvatar,
};
