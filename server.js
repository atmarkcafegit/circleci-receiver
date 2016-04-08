var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var _ = require('lodash');
var request = require('request');

var app = express();

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
                request(action.output_url, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        console.log(body);
                    }
                })
            }
        });
    });

    res.json({
        status: 'OK'
    })
});

module.exports = app;
