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

function diffOperationStream(initialState, os) {
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
      const newState = _.extend({}, initialState, state, op.diff);
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

    const eventStream = createDatasetReadStream(path.join(DATA_DIR, './twor.2010/data'))
    .filter(({ device }) => _.includes(ALL_DEVICES, device))
    .filter(({ time }) => time.timestamp > 1262300400); // Before then the light appears to be buggy

    const BATCH_DURATION = 20*60;
    let currentBatchTimestamp = null;
    let currentBatch = [];
    const eventBatchStream = eventStream
    .consume((err, evt, push, next) => {
      if (err) {
        push(err);
        next();
      }
      else if (evt === highland.nil) {
        push(null, currentBatch);
        push(null, highland.nil);
      }
      else {
        if (!currentBatchTimestamp) {
          currentBatchTimestamp = evt.time.timestamp;
        }
        if (evt.time.timestamp > (currentBatchTimestamp + BATCH_DURATION)) {
          push(null, _.clone(currentBatch));
          currentBatch = [];
          currentBatchTimestamp = evt.time.timestamp;
        }
        currentBatch.push(evt);
        next();
      }
    });

    const operationsStream = eventBatchStream
    .map(evtBatch => {
      let ops = [];
      // Tz
      ops = _.reduce(evtBatch, (ops, { time }) => {
        const previousTz = ops.length === 0 ? null : _.last(ops).diff.tz;
        if (time.timezone != previousTz) {
          ops.push({
            timestamp: time.timestamp,
            diff: {
              tz: time.timezone
            }
          });
        }
        return ops;
      }, ops);
      // Light
      const lightEvtBatch = evtBatch.filter(({ device }) => _.includes(LIGHT_DEVICES, device));
      ops = _.reduce(lightEvtBatch, (ops, { time, value }) => {
        ops.push({
          timestamp: time.timestamp,
          diff: {
            light: value
          }
        });
        return ops;
      }, ops);
      // Motion
      const movementEvtBatch = evtBatch.filter(({ device }) => _.includes(MOVEMENT_SENSOR_DEVICES, device));
      const movementStateBool = _.reduce(movementEvtBatch, (m, { value }) => (m || value === 'ON'), false);
      ops.push({
        timestamp: _.first(evtBatch).time.timestamp,
        diff: {
          movement: movementStateBool ? 'YES' : 'NO'
        }
      });

      const groupedOps = _.map(_.groupBy(ops, 'timestamp'), (opsGroup, timestamp) => ({
        timestamp: parseInt(timestamp),
        diff: _.reduce(opsGroup, (diff, op) => _.extend({}, diff, op.diff), {})
      }));

      return _.sortBy(groupedOps, 'timestamp');
    })
    .sequence(); // Flatten the stream of operations arrays to a stream of operations

    const diffedOperationStream = diffOperationStream({
      tz: '',
      movement: 'NO',
      light: 'OFF'
    }, operationsStream);

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
