var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var _ = require('lodash');

var http = require("https");

var app = express();
var zlib = require("zlib");
app.use(logger('dev'));
app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.get('/', function (req, res) {
    res.json(req.body);
});

//http.get('https://circle-production-action-output.s3.amazonaws.com/a19484ae0573d16dee217075-atmarkcafegit-test-circleci-14-0?AWSAccessKeyId=AKIAIQ65EYQDTMSJK2DQ&Expires=1617847820&Signature=oVgp8ABmRYQKQ2q%2BpVMQIpe0l6k%3D', function (res) {
//    var gunzip = zlib.createGunzip();
//    res.pipe(gunzip);
//    var buffer = [];
//    gunzip.on('data', function (data) {
//        buffer.push(data.toString())
//    }).on("end", function () {
//        var s = buffer.join('');
//        var object = JSON.parse(s);
//        _.each(object, function (item) {
//            console.log(item.message);
//        });
//
//    }).on("error", function (e) {
//        console.log(e);
//    })
//});


var fs = require('fs');
fs.readFile('repo_map.json', 'utf8', function (err, data) {
    if (err) throw err;
    console.log(JSON.parse(data));
});

app.post('/', function (req, res) {
    var data = req.body.payload;

    _.each(data.steps, function (step) {
        var actions = step.actions;
        _.each(actions, function (action) {
            if (action.status === 'failed') {

                fs.readFile('repo_map.json', 'utf8', function (err, fileData) {
                    if (err) throw err;
                    var repoMapData = JSON.parse(fileData);

                    fs.readFile('repo_map.json', 'utf8', function (err, fileData) {
                        if (err) throw err;
                        var userMapData = JSON.parse(fileData);

                        var tempUser = _.find(userMapData, function (item) {
                            return item.github === data.author_name;
                        });

                        var tempRepo = _.find(repoMapData, function (item) {
                            return item.repo === data.reponame;
                        });

                        if (tempUser) {
                            var slackUserName = tempUser.slack;
                            var slackChannel = tempRepo.channel;
                        }

                        http.get(action.output_url, function (res) {

                            var gunzip = zlib.createGunzip();
                            res.pipe(gunzip);
                            var buffer = [];

                            gunzip.on('data', function (data) {
                                buffer.push(data.toString())
                            }).on("end", function () {
                                var message = buffer.join('');
                                var sendData = {
                                    "channel": "circleci",
                                    "attachments": [
                                        {
                                            "color": "#FF0000",

                                            "pretext": "CircleCI Message",
                                            "fields": [
                                                {
                                                    "title": "Error",
                                                    "value": message,
                                                    "short": false
                                                }
                                            ]
                                        }
                                    ]
                                };

                                var request = require('request');
                                request.post({
                                    url: 'https://hooks.slack.com/services/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',
                                    body: JSON.stringify(sendData)
                                }, function (error, response, body) {
                                    console.log(body);
                                });

                            }).on("error", function (e) {
                            })
                        });
                    });
                });
            }
        });
    });

    res.json({
        status: 'OK'
    })
});

module.exports = app;
