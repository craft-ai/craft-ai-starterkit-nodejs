const _ = require('lodash');
const dotenv = require('dotenv');
const fs = require('fs');
const highland = require('highland');
const http = require('http');
const moment = require('moment-timezone');
const path = require('path');
const process = require('process');
const rimraf = require('rimraf');
const Time = require('craft-ai').createClient.Time;
const unzip = require('unzip');

dotenv.load();

const DATA_DIR = path.join(__dirname, '../data');

// We're considering R1, the top left room (sensors layout from 'sensorlayout2.png')
const MOVEMENT_SENSOR_DEVICES = [
  'M044',
  'M045',
  'M046',
  'M047',
  'M048',
  'M049',
  'M050'
];

const LIGHT_DEVICES = [
  'L001'
];

const ALL_DEVICES = _.concat(MOVEMENT_SENSOR_DEVICES, LIGHT_DEVICES);

function createDatasetReadStream(path) {
  return highland(fs.createReadStream(path))
  .split() //split stream to break on newlines
  .map(line => _.zipObject(['date', 'time', 'sensor', 'value'], line.split(/[\s]+/)))
  .reject(({ date, time, sensor, value })  => !_.isString(date) || !_.isString(time) || !_.isString(sensor) || !_.isString(value))
  .map(({ date, time, sensor, value }) => {
    const numberValue = _.toNumber(value);
    return {
      time: Time(moment.tz(`${date}T${time}`, 'Asia/Tokyo')),
      device: sensor,
      value: _.isNaN(numberValue) ? value : numberValue
    };
  });
}

function diffOperationStream(os) {
  let state = {};
  return os.consume((err, op, push, next) => {
    if (err) {
      push(err);
      next();
    }
    else if (op === highland.nil) {
      push(null, highland.nil);
    }
    else {
      const newState = _.extend({}, state, op.diff);
      const diff = _.pickBy(newState, (value, key) => value !== state[key]);
      state = newState;
      if (_.size(diff) > 0) {
        push(null, {
          timestamp: op.timestamp,
          diff: diff
        });
      }
      next();
    }
  });
}
function mergeCloseOperations(os, threshold = 1) {
  let operation = {
    timestamp: null,
    diff: {}
  };
  return os.consume((err, newOperation, push, next) => {
    if (err) {
      push(err);
      next();
    }
    else if (newOperation === highland.nil) {
      if (operation.timestamp) {
        push(null, operation);
      }
      push(null, highland.nil);
    }
    else if (!operation.timestamp) {
      operation = newOperation;
      next();
    }
    else if (newOperation.timestamp - operation.timestamp < threshold) {
      operation.diff = _.extend(operation.diff, newOperation.diff);
      next();
    }
    else {
      push(null, operation);
      operation = newOperation;
      next();
    }
  });
}

// 1 - Clear the previously retrieved data
new Promise((resolve, reject) => {
  return rimraf(path.join(DATA_DIR, './twor.2010/twor_ROOM_R1.json'), err => {
    return err ? reject(err) : resolve();
  });
})
// 2 - Download the dataset
.then(() => {
  return new Promise((resolve, reject) => {
    http.get('http://ailab.wsu.edu/casas/datasets/twor.2010.zip', response => {
      console.log('Retrieving dataset \'twor.2010\' from \'http://ailab.wsu.edu/casas/datasets/twor.2010.zip\'...');
      response
      .pipe(unzip.Extract({
        path: DATA_DIR
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
  return new Promise((resolve, reject) => {
    console.log('Extracting the metadata from dataset \'twor.2010\'...');

    const fullOperationsStream = createDatasetReadStream(path.join(DATA_DIR, './twor.2010/data'))
    .filter(({ device }) => _.includes(ALL_DEVICES, device))
    //.filter(({ time }) => time.timestamp > 1262300400) // Before then the light appears to be buggy
    .map(({ time, device, value }) => {
      let operation = {
        timestamp: time.timestamp,
        diff: {
          tz: time.timezone
        }
      };
      operation.diff[device] = value;
      return operation;
    })
    .scan1((previousOp, op) => ({
      timestamp: op.timestamp,
      diff: _.extend({}, previousOp.diff, op.diff)
    }))
    .map(({ timestamp, diff }) => {
      const movementValues = _.filter(diff, (value, device) => _.includes(MOVEMENT_SENSOR_DEVICES, device));
      const counts = _.countBy(movementValues);
      return {
        timestamp: timestamp,
        diff: {
          tz: diff.tz,
          light: diff['L001'],
          movement: counts['ON'] || 0
        }
      };
    })
    .filter(({ diff }) => diff.tz && diff.light && diff.movement); // Filter the incomplete operations

    const mergeOperationStream = mergeCloseOperations(fullOperationsStream, 10);

    const diffedOperationStream = diffOperationStream(mergeOperationStream);

    const outputStream = fs.createWriteStream(path.join(DATA_DIR, './twor.2010/twor_ROOM_R1.json'));
    outputStream.on('close', () => resolve());
    outputStream.on('error', err => reject(err));

    highland([
      highland(['[\n  ']),
      diffedOperationStream.map(operation => JSON.stringify(operation)).intersperse(',\n  '),
      highland(['\n]\n'])
    ])
    .sequence()
    .pipe(outputStream);
  });
})
.then(() => {
  console.log('Preparation of dataset \'twor.2010\' successful!');
})
.catch(err => {
  console.log('Error', err);
  process.exit(1);
});
