var _ = require('lodash');
var express = require('express');
var router = express.Router();
var aguid = require("aguid");
var wxConfig = require('../config/weixin.json');
var wxUtil = require('../util/wxUtil');
var dbUtil = require('../util/dbUtil');
var moment = require('moment');
var randomstring = require('randomstring');
var TABLE = dbUtil.TABLE;
var PAGE_SIZE = 2;

/* GET home page. */
router.get('/statusList', function (req, res, next) {
  var statusList = [
    { value: 0, text: '待定' },
    { value: -1, text: '未通过' },
    { value: 1, text: '通过' }
  ];
  res.send(statusList);
});

module.exports = router;