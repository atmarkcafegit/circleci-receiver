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

const SLACK_HOOK_URL = 'https://hooks.slack.com/services/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';

function sendToSlack(message, callback) {
    require('request').post({
        url: SLACK_HOOK_URL,
        body: JSON.stringify(message)
    }, function () {
        callback();
    });
}

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

                        var commitList = _.map(_.map(data.all_commit_details, function (commit) {
                            var tempUser = _.find(userMapData, function (item) {
                                return item.github === commit.author_name;
                            });

                            var slackUserName = 'unknow';
                            if (tempUser) {
                                slackUserName = tempUser.slack;
                            }

                            return {
                                commit_user: commit.committer_name,
                                slack_user: slackUserName,
                                commit_url: commit.commit_url,
                                commit: commit.commit
                            }
                        }), function (item) {
                            return 'commit <' + item.commit_url + '|' + item.commit.substring(0, 6) + '> by ' +
                                item.commit_user + '(<@' + item.slack_user + '>)';

                        });

                        var titleText = commitList.join('\n');

                        var tempRepo = _.find(repoMapData, function (item) {
                            return item.repo === data.reponame;
                        });

                        var slackChannel = 'circleci';
                        if (tempRepo) {
                            slackChannel = tempRepo.channel;
                        }

                        http.get(action.output_url, function (res) {
                            var gunzip = zlib.createGunzip();
                            res.pipe(gunzip);
                            var buffer = [];

                            gunzip.on('data', function (data) {
                                buffer.push(data.toString())
                            }).on("end", function () {
                                var responseData = JSON.parse(buffer.join(''));

                                var errorData = {
                                    "channel": slackChannel,
                                    "attachments": [
                                        {
                                            "color": "#FF0000",
                                            "pretext": titleText,
                                            "fields": []
                                        }
                                    ]
                                };

                                _.each(responseData, function (res) {
                                    if (res.type === 'out') {
                                        errorData.attachments[0].fields.push({
                                            "title": "Error",
                                            "value": res.message,
                                            "short": false
                                        });
                                    }
                                });

                                sendToSlack(errorData, function () {
                                    console.log('sent');
                                });
                            }).on("error", function (e) {
                                console.log(e);
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
