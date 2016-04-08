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
                http.get(action.output_url, function (res) {
                    var gunzip = zlib.createGunzip();
                    res.pipe(gunzip);
                    var buffer = [];
                    gunzip.on('data', function (data) {
                        buffer.push(data.toString())
                    }).on("end", function () {
                        console.log(buffer.join(''));
                    }).on("error", function (e) {
                    })
                });
            }
        });
    });

    res.json({
        status: 'OK'
    })
});

module.exports = app;
