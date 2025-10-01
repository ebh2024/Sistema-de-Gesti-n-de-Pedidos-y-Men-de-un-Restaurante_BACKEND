const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const baseController = (Model) => ({
  getAll: catchAsync(async (req, res, _next) => {
    const docs = await Model.findAll();
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        data: docs,
      },
    });
  }),

  getById: catchAsync(async (req, res, next) => {
    const doc = await Model.findByPk(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  }),

  create: catchAsync(async (req, res, _next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  }),

  update: catchAsync(async (req, res, next) => {
    const [updatedRows] = await Model.update(req.body, {
      where: { id: req.params.id },
    });

    if (updatedRows === 0) {
      return next(new AppError('No document found with that ID', 404));
    }

    const updatedDoc = await Model.findByPk(req.params.id);

    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDoc,
      },
    });
  }),

  delete: catchAsync(async (req, res, next) => {
    const deletedRows = await Model.destroy({
      where: { id: req.params.id },
    });

    if (deletedRows === 0) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }),
});

module.exports = baseController;
