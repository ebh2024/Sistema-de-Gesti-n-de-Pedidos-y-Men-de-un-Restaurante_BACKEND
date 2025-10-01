const { Table } = require('../models');
const baseController = require('./baseController');

const tableController = baseController(Table);


module.exports = {
    getAllTables: tableController.getAll,
    getTableById: tableController.getById,
    createTable: tableController.create,
    updateTable: tableController.update,
    deleteTable: tableController.delete
};
