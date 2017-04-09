var _ = require('lodash');
var express = require('express');
var router = express.Router();
var path = require('path');
var wxUtil = require('../util/wxUtil');
var dbUtil = require('../util/dbUtil');
var util = require('../util/util');
var download = require('download');
var fs = require('fs');
var moment = require('moment');
var aguid = require('aguid');
var mkpath = require('mkpath');
var randomstring = require('randomstring');
var Jimp = require('jimp');
var Docxtemplater = require('docxtemplater');
var JSZip = require('jszip');
var ImageModule = require('docxtemplater-image-module');

var TABLE = dbUtil.TABLE;

/* GET users listing. */
router.get('/all', function (req, res, next) {
  res.send(dbUtil._tasks.map(v => _.assign(v, {
    // hasAuditAdmin: 0,
    // hasAuditLead: 0,
    // hasAccept: 0,
    // hasFeedback: 0,
    // hasConfirm: 0
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

router.delete('/:taskId?', function (req, res, next) {
  var taskId = req.params.taskId;
  var deletedTask = dbUtil.removeById(TABLE.Task, taskId);
  var imgList = _.union(deletedTask.imgPaths, deletedTask.feedbackImgPaths)
  res.send(deletedTask);
  if (!_.isEmpty(imgList)) {
    imgList.forEach(function (imgPath) {
      if (fs.existsSync(imgPath.original)) {
        fs.unlink(imgPath.original);
      }
      if (fs.existsSync(imgPath.thumbnail)) {
        fs.unlink(imgPath.thumbnail);
      }
    });
  }
});

router.post('/', function (req, res, next) {
  var task = {};
  var taskId = req.body.taskId;
  var createNewTask = _.isUndefined(taskId);
  if (createNewTask) {
    task.userId = req.body.userId;
    task.username = req.body.username;
    task.phone = req.body.phone;
    task.mainCat = req.body.mainCat;
    task.subCat = req.body.subCat;
    task.description = req.body.description;
    task.imgServerIds = req.body.imgServerIds;
    task.createTime = Date.now();
    task.hasAuditAdmin = 0;
    task.hasAuditLead = 0;
    task.hasAccept = 0;
    task.hasFeedback = 0;
    task.hasConfirm = 0;
    task.imgPaths = [];
    task.feedback = undefined;
    task.feedbackImgPaths = [];
  } else {
    task.feedback = req.body.feedback;
    task.imgServerIds = req.body.imgServerIds;
    task.feedbackImgPaths = [];
  }

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
          if (createNewTask) {
            task.imgPaths.push({
              original: imgUriPath,
              thumbnail: thumbnailUriPath
            });
          } else {
            task.feedbackImgPaths.push({
              original: imgUriPath,
              thumbnail: thumbnailUriPath
            });
          }
        } catch (e) {
          return res.send({
            status: 101,
            msg: "图片保存异常"
          });
        }
      }))).then(() => {
        var savedTask;
        if (createNewTask) {
          savedTask = dbUtil.save(TABLE.Task, task);
        } else {
          var prop = {};
          prop['hasFeedback'] = 1;
          prop['feedback'] = task.feedback;
          prop['feedbackImgPaths'] = task.feedbackImgPaths;
          savedTask = dbUtil.updateById(TABLE.Task, taskId, prop);
        }
        res.send({
          status: 0,
          msg: "",
          data: savedTask
        });
      });
    });
  } else {
    var savedTask;
    if (createNewTask) {
      savedTask = dbUtil.save(TABLE.Task, task);
    } else {
      var prop = {};
      prop['hasFeedback'] = 1;
      prop['feedback'] = task.feedback;
      savedTask = dbUtil.updateById(TABLE.Task, taskId, prop);
    }
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
  prop[req.body.name] = parseInt(req.body.value);
  var updatedTask = dbUtil.updateById(TABLE.Task, taskId, prop);
  res.send(updatedTask);
});

router.get('/msword/:taskId', function (req, res, next) {
  var taskId = req.params.taskId;
  task = dbUtil.getById(TABLE.Task, taskId);
  if (task) {
    var noncestr = randomstring.generate(16);
    var filename = `${noncestr}.docx`;
    var outputPath = path.join(__dirname, '..', 'temp', 'docs', filename);
    util.exportMsWord(task, outputPath);
    res.sendFile(outputPath);
  } else {
    res.send(null);
  }
});

module.exports = router;