var request = require('request');
var wxConfig = require('../config/weixin.json');
var moment = require('moment');
var sha1 = require('sha1');

var tokenCache = {};
var ticketCache = {};
var authInfoCache = {};
var userInfoCache = {};

exports.genTaskHtml = function (task) {
  var statusSnippet = '';
  if (task.hasAuditAdmin == -1 || task.hasAuditLead == -1) {
    statusSnippet = '<div class="weui-media-box__hd status-reject">未通过</div>';
  } else if (task.hasAuditAdmin == 1 && task.hasAuditLead == 1) {
    statusSnippet = '<div class="weui-media-box__hd status-pass">通过</div>';
  } else {
    statusSnippet = '<div class="weui-media-box__hd status-audit">审核中</div>';
  }

  var snippet = [
    `<a href="task/${task.id}" class="weui-media-box weui-media-box_appmsg">`,
    '<div class="weui-media-box__hd">',
    statusSnippet,
    '</div>',
    '<div class="weui-media-box__bd">',
    '<h4 class="weui-media-box__title">',
    moment(task.createTime).format('YYYY年MM月DD日  HH:mm:ss'),
    '</h4>',
    '<p class="weui-media-box__desc">',
    task.description,
    '</p>',
    '</div>',
    '</a>'
  ].join('');

  return snippet;
};

exports.genSignature = function (noncestr, timestamp, requestUrl, cb) {
  getApiTicket(function (err, ticket) {
    if (err) return cb(err);
    var string1 = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${requestUrl}`;
    cb(null, sha1(string1));
  });
};

exports.getAccessToken = getAccessToken;

exports.getUserInfo = function (code, cb) {
  getAuthInfo(code, (err, authInfo) => {
    if (authInfo.scope === 'snsapi_base') {
      return cb(null, authInfo);
    }

    var url = `https://api.weixin.qq.com/sns/userinfo?access_token=${authInfo.access_token}&openid=${authInfo.openid}&lang=zh_CN`;
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);
        cb(null, data);
      } else {
        cb(error);
      }
    });
  });
}

function getAccessToken(cb) {
  var requestTime = Date.now();
  if (tokenCache.expiry && requestTime < tokenCache.expiry) {
    return cb(null, tokenCache.token);
  }

  var appid = wxConfig.appid;
  var secret = wxConfig.secret;
  var url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = JSON.parse(body);
      tokenCache.token = data.access_token;
      tokenCache.expiry = requestTime + data.expires_in * 1000;
      cb(null, tokenCache.token);
    } else {
      cb(error);
    }
  });
}

function getAuthInfo(code, cb) {
  var requestTime = Date.now();
  // if (authInfoCache.expiry && requestTime < authInfoCache.expiry) {
  //   return cb(null, authInfoCache.info);
  // }

  var appid = wxConfig.appid;
  var secret = wxConfig.secret;
  var url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${secret}&code=${code}&grant_type=authorization_code`;
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = JSON.parse(body);
      authInfoCache.info = data;
      authInfoCache.expiry = requestTime + data.expires_in * 1000;
      cb(null, authInfoCache.info);
    } else {
      cb(error);
    }
  });
}

function getApiTicket(cb) {
  var requestTime = Date.now();
  if (ticketCache.expiry && requestTime < ticketCache.expiry) {
    return cb(null, ticketCache.ticket);
  }

  getAccessToken(function (err, accessToken) {
    if (err) return cb(err);
    var url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);
        if (data.errcode === 0) {
          ticketCache.ticket = data.ticket;
          ticketCache.expiry = requestTime + data.expires_in * 1000;
          cb(null, ticketCache.ticket);
        } else {
          cb("Weixin API error: " + data.errmsg);
        }
      } else {
        cb(error);
      }
    });
  });
}