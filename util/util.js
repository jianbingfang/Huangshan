var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var mkpath = require('mkpath');
var moment = require('moment');
var Docxtemplater = require('docxtemplater');
var JSZip = require('jszip');
var ImageModule = require('docxtemplater-image-module');

function escapeNullValue(val) {
  if (val === undefined || val === null) return '';
  return val;
}

exports.exportMsWord = function (task, outputPath) {
  var wordTemplate = path.join(__dirname, 'wordTemplate.docx');
  var content = fs.readFileSync(wordTemplate, "binary");
  var opts = {}
  opts.centered = false;
  opts.getImage = function (tagValue, tagName) {
    return fs.readFileSync(tagValue, 'binary');
  }

  opts.getSize = function (img, tagValue, tagName) {
    return [150, 150];
  }

  var imageModule = new ImageModule(opts);

  var zip = new JSZip(content);
  var doc = new Docxtemplater().attachModule(imageModule).loadZip(zip);

  var data = {
    "username": escapeNullValue(task.username),
    "phone": escapeNullValue(task.phone),
    "mainCat": escapeNullValue(task.mainCat),
    "subCat": escapeNullValue(task.subCat),
    "createTime": moment(task.createTime).format("YYYY/MM/DD HH:mm:ss"),
    "description": escapeNullValue(task.description),
    "feedback": escapeNullValue(task.feedback)
  };

  if (!_.isEmpty(task.imgPaths)) {
    task.imgPaths.forEach(function (imgPath, i) {
      var key = 'img' + (i + 1);
      data[key] = path.join(__dirname, '..', 'public', imgPath.original);
    });
  }
  if (!_.isEmpty(task.feedbackImgPaths)) {
    task.feedbackImgPaths.forEach(function (imgPath, i) {
      var key = 'fbImg' + (i + 1);
      data[key] = path.join(__dirname, '..', 'public', imgPath.original);
    });
  }
  //set the templateVariables 
  doc.setData(data);
  //apply them (replace all occurences of {first_name} by Hipp, ...) 
  doc.render();
  var buf = doc.getZip().generate({ type: "nodebuffer" });

  var outputFolder = path.dirname(outputPath);
  if (!fs.existsSync(outputFolder)) {
    mkpath.sync(outputFolder);
  }
  fs.writeFileSync(outputPath, buf);
}