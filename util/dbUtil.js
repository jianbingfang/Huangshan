var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var _db = require('underscore-db');
_.mixin(_db);

var dbFile = path.join(__dirname, '..', 'db.json');
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, '{}');
}

var db = _db.load();

exports.TABLE = {
  User: 'users',
  Task: 'tasks'
};

exports._tasks = db[exports.TABLE.Task];
exports._users = db[exports.TABLE.User];

exports.save = save;
exports.find = find;
exports.getById = getById;
exports.updateById = updateById;
exports.removeById = removeById;

function save(table, data) {
  if (!_.isArray(db[table])) {
    db[table] = [];
  }

  var res = _.insert(db[table], data);
  _.save(db);
  return res;
}

function getById(table, id) {
  return _.getById(db[table], id);
}

function find(table, condition) {
  return _.find(db[table], condition);
}

function updateById(table, id, attr) {
  var res = _.updateById(db[table], id, attr);
  _.save(db);
  return res;
}

function removeById(table, id) {
  var res = _.removeById(db[table], id);
  _.save(db);
  return res;
}