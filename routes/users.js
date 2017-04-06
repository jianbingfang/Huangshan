var express = require('express');
var router = express.Router();
var dbUtil = require('../util/dbUtil');
var aguid = require('aguid');
var NodeCache = require("node-cache");

var TABLE = dbUtil.TABLE;
var tokenCache = new NodeCache();
var ttl = 300 * 60;  // 30 mins

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.render('PC/login', { errmsg: '' });
});

router.get('/:username', function (req, res, next) {
  var username = req.params.username;
  var token = req.query.token;
  if (!token || token !== tokenCache.get(username)) {
    return res.redirect('/user');
  }
  tokenCache.ttl(username, ttl);
  var user = dbUtil.getById(TABLE.User, username);
  res.render('PC/manage', { user: user });
});

router.post('/login', function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  var user = dbUtil.getById(TABLE.User, username);
  if (!user) {
    res.render('PC/login', { errmsg: `账号${username}不存在!` });
  } else if (user.password !== password) {
    res.render('PC/login', { errmsg: '密码错误!' });
  } else {
    var token = aguid();
    tokenCache.set(username, token, ttl);
    res.redirect(`/user/${username}?token=${token}`);
  }
});

module.exports = router;
