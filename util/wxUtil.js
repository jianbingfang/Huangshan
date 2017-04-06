var request = require('request');
var wxConfig = require('../config/weixin.json');
var moment = require('moment');
var sha1 = require('sha1');

var tokenCache = {};
var ticketCache = {};
var authInfoCache = {};
var userInfoCache = {};

exports.genTaskHtml = function (task) {
  var snippet = [
    `<a href="task?id=${task.id}" class="weui-media-box weui-media-box_appmsg">`,
    '<div class="weui-media-box__hd">',
    '<img class="weui-media-box__thumb" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAMAAAAOusbgAAAAeFBMVEUAwAD///+U5ZTc9twOww7G8MYwzDCH4YcfyR9x23Hw+/DY9dhm2WZG0kbT9NP0/PTL8sux7LFe115T1VM+zz7i+OIXxhes6qxr2mvA8MCe6J6M4oz6/frr+us5zjn2/fa67rqB4IF13XWn6ad83nxa1loqyirn+eccHxx4AAAC/klEQVRo3u2W2ZKiQBBF8wpCNSCyLwri7v//4bRIFVXoTBBB+DAReV5sG6lTXDITiGEYhmEYhmEYhmEYhmEY5v9i5fsZGRx9PyGDne8f6K9cfd+mKXe1yNG/0CcqYE86AkBMBh66f20deBc7wA/1WFiTwvSEpBMA2JJOBsSLxe/4QEEaJRrASP8EVF8Q74GbmevKg0saa0B8QbwBdjRyADYxIhqxAZ++IKYtciPXLQVG+imw+oo4Bu56rjEJ4GYsvPmKOAB+xlz7L5aevqUXuePWVhvWJ4eWiwUQ67mK51qPj4dFDMlRLBZTqF3SDvmr4BwtkECu5gHWPkmDfQh02WLxXuvbvC8ku8F57GsI5e0CmUwLz1kq3kD17R1In5816rGvQ5VMk5FEtIiWislTffuDpl/k/PzscdQsv8r9qWq4LRWX6tQYtTxvI3XyrwdyQxChXioOngH3dLgOFjk0all56XRi/wDFQrGQU3Os5t0wJu1GNtNKHdPqYaGYQuRDfbfDf26AGLYSyGS3ZAK4S8XuoAlxGSdYMKwqZKM9XJMtyqXi7HX/CiAZS6d8bSVUz5J36mEMFDTlAFQzxOT1dzLRljjB6+++ejFqka+mXIe6F59mw22OuOw1F4T6lg/9VjL1rLDoI9Xzl1MSYDNHnPQnt3D1EE7PrXjye/3pVpr1Z45hMUdcACc5NVQI0bOdS1WA0wuz73e7/5TNqBPhQXPEFGJNV2zNqWI7QKBd2Gn6AiBko02zuAOXeWIXjV0jNqdKegaE/kJQ6Bfs4aju04lMLkA2T5wBSYPKDGF3RKhFYEa6A1L1LG2yacmsaZ6YPOSAMKNsO+N5dNTfkc5Aqe26uxHpx7ZirvgCwJpWq/lmX1hA7LyabQ34tt5RiJKXSwQ+0KU0V5xg+hZrd4Bn1n4EID+WkQdgLfRNtvil9SPfwy+WQ7PFBWQz6dGWZBLkeJFXZGCfLUjCgGgqXo5TuSu3cugdcTv/HjqnBTEMwzAMwzAMwzAMwzAMw/zf/AFbXiOA6frlMAAAAABJRU5ErkJggg=="',
    'alt="">',
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