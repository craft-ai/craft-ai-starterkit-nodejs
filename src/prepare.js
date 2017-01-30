const _ = require('lodash');
const dotenv = require('dotenv');
const es = require('event-stream');
const fs = require('fs');
const http = require('http');
const moment = require('moment');
const path = require('path');
const process = require('process');
const rimraf = require('rimraf');
const streamReduce = require('stream-reduce');
const Time = require('craft-ai').createClient.Time;
const unzip = require('unzip');

dotenv.load();

function createDatasetReadStream(path) {
  return fs.createReadStream(path)
  .pipe(es.split()) //split stream to break on newlines
  .pipe(es.map((line, cb) => {
    try {
      // lineSplit = [date, time, sensor, value]
      const lineSplit = line.split(/[\s]+/);
      if (_.isString(lineSplit[0]) && _.isString(lineSplit[1]) && _.isString(lineSplit[2]) && _.isString(lineSplit[3])) {
        const numberValue = _.toNumber(lineSplit[3]);

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
  let moving = false;
  _.forEach(sensors, (value) => {
    moving = value == 'ON' || moving;
  });
  return moving;
}

// 1 - Clear the previously retrieved data
new Promise((resolve, reject) => {
  return rimraf(path.join(path.join(__dirname, '../'), './data', 'twor.2010'), err => {
    return err ? reject(err) : resolve(err);
  });
})
// 2 - Download the dataset
.then(() => {
  return new Promise((resolve, reject) => {
    http.get('http://ailab.wsu.edu/casas/datasets/twor.2010.zip', response => {
      console.log('Retrieving dataset \'twor.2010\' from \'http://ailab.wsu.edu/casas/datasets/twor.2010.zip\'...');
      response
      .pipe(unzip.Extract({
        path: path.join(path.join(__dirname, '../'), './data')
      }))
      .on('close', () => {
        resolve();
      })
      .on('error', err => {
        reject(err);
      });
    });
  });
})
// 3 - Parse the data to retrieve the sensors and their values
.then(() => {
  const SENSORS_CONTEXT = [
    'M044',
    'M045',
    'M046',
    'M047',
    'M048',
    'M049',
    'M050'
  ];
  return new Promise((resolve, reject) => {
    console.log('Extracting the metadata from dataset \'twor.2010\'...');
    createDatasetReadStream(path.join(path.join(__dirname, '../'), './data', 'twor.2010', 'data'))
    // acc = { startingTime, movement, light, sensorsValues, diffs }
    // data = { datetime, sensor, value }
    .pipe(streamReduce((acc, data) => {
      const datetimeInTz = moment(data.datetime).utcOffset('+09:00');
      if (!acc.startingTime) {
        acc.startingTime = moment(datetimeInTz);
        acc.diffs.push({ timestamp: datetimeInTz.unix(), diff: { month: datetimeInTz.month(), light: 'OFF', movement: 'false', tz: Time(datetimeInTz).timezone } });
      }
      if (data.sensor == 'L001') {
        acc.diffs.push({ timestamp: datetimeInTz.unix(), diff: { month: datetimeInTz.month(), light: data.value, tz: Time(datetimeInTz).timezone } });
      }
      const addition = moment(acc.startingTime);
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
    .pipe(es.map((data, cb) => {
      const diffs = _.sortBy(data.diffs, diff => {
        return diff.timestamp;
      });
      cb(null, JSON.stringify(diffs, null, '  '));
    }))
    .pipe(fs.createWriteStream(path.join(path.join(__dirname, '../'), './data', 'twor.2010', 'twor_ROOM_R1.json')))
    .on('close', () => {
      resolve();
    })
    .on('error', err => {
      reject(err);
    });
  });
})
.then(() => {
  console.log('Preparation of dataset \'twor.2010\' successful!');
})
.catch(err => {
  console.log('Error', err);
  process.exit(1);
});
