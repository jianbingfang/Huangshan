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
router.get('/', function (req, res, next) {
  console.log(req.query);
  var code = req.query.code;
  var state = req.query.state;
  if (!_.isEmpty(code) && state === 'wxloginreturn') {
    console.log('[index] Weixin login returned');
    wxUtil.getUserInfo(code, (err, userInfo) => {
      console.log(userInfo);
      if (err) return next(err);
      return res.redirect(`/?userId=${userInfo.openid}&username=${userInfo.nickname}`);
    });
  } else {
    console.log('[index] Known user access');
    var userId = req.query.userId;
    var username = req.query.username;
    if (_.isEmpty(userId) || _.isEmpty(username)) {
      console.log('[index] First access, redirect to weixin login');
      return res.redirect('https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx8809a2cb2c2d89c4&redirect_uri=http%3A%2F%2Fwww.sunjiangtao.com&response_type=code&scope=snsapi_userinfo&state=wxloginreturn#wechat_redirect');
    } else {
      return renderIndex({
        userId: userId,
        username: username
      });
    }
  }

  function renderIndex(userInfo) {
    var taskList = _(dbUtil._tasks)
      .filter({ userId: userInfo.userId })
      .sortBy('createTime')
      .reverse()
      .slice(0, PAGE_SIZE)
      .value();

    taskList.forEach(task => {
      task.createTimeString = moment(task.createTime).format("YYYY年MM月DD日 hh:mm:ss");
    });

    res.render('index', {
      user: userInfo,
      taskList: taskList
    });
  }
});

router.get('/loadmore', function (req, res, next) {
  var userId = req.query.userId;
  var startTime = parseInt(req.query.startTime) || 0;
  var taskList = _(dbUtil._tasks)
    .filter(o => o.createTime < startTime && o.userId === userId)
    .sortBy('createTime')
    .reverse()
    .slice(0, PAGE_SIZE)
    .value();

  var html = '';
  var leastTime;
  for (var task of taskList) {
    html += wxUtil.genTaskHtml(task);
    leastTime = task.createTime;
  }

  res.send({
    size: taskList.length || 0,
    html: html,
    leastTime: leastTime
  });
});

router.get('/wxconfig', function (req, res, next) {
  var noncestr = randomstring.generate(16);
  var timestamp = parseInt(new Date().getTime() / 1000) + '';
  var url = req.query.url;
  wxUtil.genSignature(noncestr, timestamp, url, function (err, signature) {
    console.log(signature);
    res.send({
      appId: wxConfig.appid,
      timestamp: timestamp,
      nonceStr: noncestr,
      signature: signature
    });
  });
});

module.exports = router;