var _ = require('lodash');
var dotenv = require('dotenv');
var es = require('event-stream');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var Promise = require('bluebird');
var streamReduce = require('stream-reduce');
var Time = require('craft-ai').createClient.Time;
var rimraf = require('rimraf');
var http = require('http');
var unzip = require('unzip');

dotenv.load();

function createDatasetReadStream(path) {
  return fs.createReadStream(path)
  .pipe(es.split()) //split stream to break on newlines
  .pipe(es.map(function(line, cb) {
    try {
      // lineSplit = [date, time, sensor, value]
      var lineSplit = line.split(/[\s]+/);
      if (_.isString(lineSplit[0]) && _.isString(lineSplit[1]) && _.isString(lineSplit[2]) && _.isString(lineSplit[3])) {
        var numberValue = _.toNumber(lineSplit[3]);

        cb(null, {
          datetime: moment(lineSplit[0] + 'T' + lineSplit[1]),
          sensor: lineSplit[2],
          value: _.isNaN(numberValue) ? lineSplit[3] : numberValue
        });
      }
      else {
        cb();
      }
    } catch (e) {
      cb(e);
    }
  }));
}

function isMoving(sensors) {
  var moving = false;
  _.forEach(sensors, (value) => {
    moving = value == 'ON' || moving;
  });
  return moving;
}

// 1 - Parse the data to retrieve the sensors and their values
new Promise(function(resolve, reject) {
  return rimraf(path.join(path.join(__dirname, '../'), './data', 'twor.2010'), function(err) {
    return err ? reject(err) : resolve(err);
  });
})
// 1 - Download the dataset
.then(function() {
  return new Promise(function(resolve, reject) {
    http.get('http://ailab.wsu.edu/casas/datasets/twor.2010.zip', function(response) {
      console.log('Retrieving dataset \'twor.2010\' from \'http://ailab.wsu.edu/casas/datasets/twor.2010.zip\'...');
      response
      .pipe(unzip.Extract({
        path: path.join(path.join(__dirname, '../'), './data')
      }))
      .on('close', function() {
        resolve();
      })
      .on('error', function(err) {
        reject(err);
      });
    });
  });
})
// 2 - Parse the data to retrieve the sensors and their values
.then(function() {
  const SENSORS_CONTEXT = [
    'M044',
    'M045',
    'M046',
    'M047',
    'M048',
    'M049',
    'M050'
  ];
  return new Promise(function(resolve, reject) {
    console.log('Extracting the metadata from dataset \'twor.2010\'...');
    createDatasetReadStream(path.join(path.join(__dirname, '../'), './data', 'twor.2010', 'data'))
    // acc = { startingTime, movement, light, sensorsValues, diffs }
    // data = { datetime, sensor, value }
    .pipe(streamReduce(function(acc, data) {
      var datetimeInTz = moment(data.datetime).utcOffset('+09:00');
      if (!acc.startingTime) {
        acc.startingTime = moment(datetimeInTz);
        acc.diffs.push({ timestamp: datetimeInTz.unix(), diff: { month: datetimeInTz.month(), light: 'OFF', movement: 'false', tz: Time(datetimeInTz).timezone } });
      }
      if (data.sensor == 'L001') {
        acc.diffs.push({ timestamp: datetimeInTz.unix(), diff: { month: datetimeInTz.month(), light: data.value, tz: Time(datetimeInTz).timezone } });
      }
      var addition = moment(acc.startingTime);
      while (acc.startingTime && addition.add('20', 'm').unix() <= datetimeInTz.unix()) {
        acc.diffs.push({ timestamp: acc.startingTime.unix(), diff: { month: acc.startingTime.month(), movement: acc.movement.toString(), tz: Time(acc.startingTime).timezone } });
        acc.startingTime = moment(addition);
        acc.movement = isMoving(acc.sensorsValues);
      }
      if (_.indexOf(SENSORS_CONTEXT, data.sensor) != -1) {
        acc.sensorsValues[data.sensor] = data.value;
        acc.movement = data.value == 'ON' || acc.movement;
      }
      return {
        startingTime: acc.startingTime,
        light: acc.light,
        movement: acc.movement,
        sensorsValues: acc.sensorsValues,
        diffs: acc.diffs
      };
    }, {
      startingTime: undefined,
      light: false,
      movement: false,
      sensorsValues: {},
      diffs: []
    }))
    .pipe(es.map(function(data, cb) {
      var diffs = _.sortBy(data.diffs, function(diff) {
        return diff.timestamp;
      });
      cb(null, JSON.stringify(diffs, null, '  '));
    }))
    .pipe(fs.createWriteStream(path.join(path.join(__dirname, '../'), './data', 'twor.2010', 'twor_ROOM_R1.json')))
    .on('close', function() {
      resolve();
    })
    .on('error', function(err) {
      reject(err);
    });
  });
})
.then(function() {
  console.log('Preparation of dataset \'twor.2010\' successful!');
})
.catch(function(err) {
  console.log('Error', err);
});
