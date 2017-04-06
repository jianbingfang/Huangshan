var _ = require('lodash');
var express = require('express');
var router = express.Router();
var path = require('path');
var wxUtil = require('../util/wxUtil');
var dbUtil = require('../util/dbUtil');
var download = require('download');
var fs = require('fs');
var moment = require('moment');
var aguid = require('aguid');
var mkpath = require('mkpath');
var Jimp = require('jimp');

var TABLE = dbUtil.TABLE;

/* GET users listing. */
router.get('/all', function (req, res, next) {
  res.send(dbUtil._tasks.map(v => _.assign(v, {
    // auditAdmin: 0,
    // auditLeader: 0,
    // accept: 0,
    // feedback: 0,
    // verify: 0
  })));
});

router.get('/:taskId?', function (req, res, next) {
  var userId = req.query.userId;
  var username = req.query.username;
  var taskId = req.params.taskId;
  var task;
  var newTask = _.isEmpty(taskId);
  if (!newTask) {
    task = dbUtil.getById(TABLE.Task, taskId);
    task.createTimeString = moment(task.createTime).format("YYYY-MM-DD hh:mm:ss");
  } else {
    task = {}
  }

  console.log(task);
  res.render('task', {
    user: { id: userId, name: username },
    task: task,
    newTask: newTask
  });
});

router.post('/', function (req, res, next) {
  var task = {};
  task.userId = req.body.userId;
  task.username = req.body.username;
  task.phone = req.body.phone;
  task.mainCat = req.body.mainCat;
  task.subCat = req.body.subCat;
  task.description = req.body.description;
  task.imgServerIds = req.body.imgServerIds;
  task.createTime = Date.now();
  task.auditAdmin = 0;
  task.auditLeader = 0;
  task.accept = 0;
  task.feedback = 0;
  task.verify = 0;
  task.imgPaths = [];

  if (task.imgServerIds) {
    wxUtil.getAccessToken(function (err, access_token) {
      if (err) {
        return res.send({
          status: 100,
          msg: err
        });
      }

      var url = `http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=${access_token}&media_id=`;
      var urlList = task.imgServerIds.split('\t').map(id => url + id);
      Promise.all(urlList.map(x => download(x).then(data => {
        try {
          var dateStr = moment().format('YYYY-MM-DD');
          var imgFile = aguid() + '.jpg';
          var imgFolder = path.join(__dirname, '..', 'public', 'images', 'upload', dateStr);
          var thumbnailFolder = path.join(__dirname, '..', 'public', 'images', 'thumbnail', dateStr);
          var imgPath = path.join(imgFolder, imgFile);
          if (!fs.existsSync(imgFolder)) {
            mkpath.sync(imgFolder);
          }
          if (!fs.existsSync(thumbnailFolder)) {
            mkpath.sync(thumbnailFolder);
          }
          fs.writeFileSync(imgPath, data);
          Jimp.read(imgPath).then(img => {
            var thumbnailPath = path.join(thumbnailFolder, imgFile);
            img.resize(Jimp.AUTO, 200)
              // .quaility(60)
              .write(thumbnailPath);
          }).catch(err => {
            console.error(err);
            thumbnailUriPath = '';
          });

          var imgUriPath = `/images/upload/${dateStr}/${imgFile}`;
          var thumbnailUriPath = `/images/thumbnail/${dateStr}/${imgFile}`;
          task.imgPaths.push({
            original: imgUriPath,
            thumbnail: thumbnailUriPath
          });
        } catch (e) {
          return res.send({
            status: 101,
            msg: "图片保存异常"
          });
        }
      }))).then(() => {
        var savedTask = dbUtil.save(TABLE.Task, task);
        res.send({
          status: 0,
          msg: "",
          data: savedTask
        });
      });
    });
  } else {
    var savedTask = dbUtil.save(TABLE.Task, task);
    res.send({
      status: 0,
      msg: "",
      data: savedTask
    });
  }
});

router.put('/updatestatus', function (req, res, next) {
  var taskId = req.body.pk;
  var prop = {};
  prop[req.body.name] = req.body.value;
  var updatedTask = dbUtil.updateById(TABLE.Task, taskId, prop);
  res.send(updatedTask);
});

module.exports = router;