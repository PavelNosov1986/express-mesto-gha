const mongoose = require('mongoose');
const Card = require('../models/card');
const {
  OK_CODE,
  NOT_FOUND_CARD_MESSAGE,
  INCORRECT_ERROR_MESSAGE,
} = require('../constants');
const { IncorrectError, ForbiddenError, NotFoundError } = require('../errors/index');

const getCards = (req, res, next) => {
  Card.find({})
    .populate(['owner', 'likes'])
    .then((card) => res.send({ data: card }))
    .catch(next);
};

const createCard = (req, res, next) => {
  const { name, link } = req.body;
  Card.create({ name, link, owner: req.user._id })
    .then((card) => res.status(OK_CODE).send({ data: card }))
    .catch((err) => {
      if (err instanceof mongoose.Error.ValidationError) {
        return next(new IncorrectError(`${INCORRECT_ERROR_MESSAGE} при создании карточки.`));
      }
      return next(err);
    });
};

const deleteCard = (req, res, next) => {
  const { cardId } = req.params;
  Card.findById(cardId)
    .orFail(() => new NotFoundError(NOT_FOUND_CARD_MESSAGE))
    .then((card) => {
      if (!card.owner.equals(req.user._id)) {
        return next(new ForbiddenError('Нельзя удалить чужую карточку'));
      }
      return card.remove()
        .then(() => res.send({ message: 'Карточка удалена' }));
    })
    .catch(next);
};

const modifyLike = (req, res, next, action) => {
  Card.findByIdAndUpdate(req.params.cardId, action, { new: true })
    .populate('likes')
    .then((card) => {
      if (card === null) {
        throw new NotFoundError(NOT_FOUND_CARD_MESSAGE);
      }
      return res.send({ data: card });
    })
    .catch((err) => {
      if (err instanceof mongoose.Error.CastError) {
        return next(new IncorrectError(`${INCORRECT_ERROR_MESSAGE} для лайка.`));
      }
      return next(err);
    });
};
const likeCard = (req, res, next) => {
  modifyLike(req, res, next, { $addToSet: { likes: req.user._id } });
};

const dislikeCard = (req, res, next) => {
  modifyLike(req, res, next, { $pull: { likes: req.user._id } });
};

module.exports = {
  getCards,
  createCard,
  deleteCard,
  modifyLike,
  likeCard,
  dislikeCard,
};
