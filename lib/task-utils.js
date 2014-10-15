var _ = require('lodash');
var through = require('through2');
var path = require('path');
var swig = require('swig');
var cheerio = require('cheerio');

var config = require('../config.js');

swig.setDefaults({
  loader: swig.loaders.fs(__dirname + '/../design'),
  cache: false
});

swig.setFilter('limit', function (input, num) {
  return input.slice(0, num);
});

var taskUtils = exports;

taskUtils.rePostName = /(\d{4})-(\d{1,2})-(\d{1,2})-(.*)/;

var baseData = {
  site: config.site,
  indexes: config.indexes
};

baseData.allPostsMeta = _.chain(config.indexes.posts)
  .values().sortBy('date').reverse().value();

taskUtils.applyTemplate = function applyTemplate(templateFile) {
  var tpl;
  if (templateFile) {
    tpl = swig.compileFile(path.join(__dirname + '/..', templateFile));
  }
  return through.obj(function (file, enc, cb) {
    if (!templateFile) {
      tpl = swig.compileFile(file.path);
    }
    file.contents = new Buffer(tpl(_.extend({
      page: file.page,
      content: file.contents.toString()
    }, baseData)), 'utf8');
    this.push(file);
    cb();
  });
}

taskUtils.filename2date = function filename2date() {
  return through.obj(function (file, enc, cb) {
    var basename = path.basename(file.path, '.md');
    var match = taskUtils.rePostName.exec(basename);
    if (match)
    {
      var year   = match[1];
      var month  = match[2];
      var day   = match[3];
      var basename = match[4];
      file.page.date = new Date(year + "-" + month + "-" + day);
      file.page.url = '/' + year + '/' + month + '/' + day + '/' + basename + '.html';
    }
    this.push(file);
    cb();
  });
}

taskUtils.postNameToDatePath = function postNameToDatePath (path) {
  path.extname = ".html";
  var match = taskUtils.rePostName.exec(path.basename);
  if (match) {
    var year = match[1];
    var month = match[2];
    var day = match[3];

    path.dirname = year + '/' + month + '/' + day;
    path.basename = match[4];
  }
}

taskUtils.summarize = function summarize(marker) {
  return through.obj(function (file, enc, cb) {
    var contents = file.contents.toString();
    if (contents.indexOf(marker !== -1)) {
      var summary = file.contents.toString().split(marker)[0]
      if (summary) {
        var $ = cheerio.load(summary);
        $('#toc_container').remove();
        file.page.summary = $.html();
      }
    }
    this.push(file);
    cb();
  });
}
