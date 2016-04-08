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

app.post('/', function (req, res) {
    var data = req.body.payload;

    _.each(data.steps, function (step) {
        var actions = step.actions;
        _.each(actions, function (action) {
            if (action.status === 'failed') {
                var fs = require('fs');
                fs.readFile('repo_map.json', 'utf8', function (err, fileData) {
                    if (err) throw err;
                    var repoMapData = JSON.parse(fileData);

                    fs.readFile('user_map.json', 'utf8', function (err, fileData) {
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

                        console.log(slackChannel);

                        http.get(action.output_url, function (res) {

                            var gunzip = zlib.createGunzip();
                            res.pipe(gunzip);
                            var buffer = [];

                            gunzip.on('data', function (data) {
                                buffer.push(data.toString())
                            }).on("end", function () {
                                var responseData = JSON.parse(buffer.join(''));
                                _.each(responseData, function (res) {
                                    var sendData = {
                                        "channel": slackChannel,
                                        "attachments": [
                                            {
                                                "color": "#FF0000",
                                                "pretext": "Commit user: @" + slackUserName,
                                                "fields": [
                                                    {
                                                        "title": "Error",
                                                        "value": res.message,
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

                                    });
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
