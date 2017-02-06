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
const DOWNLOAD_DIR = path.join(__dirname, '../download');

// We're considering R1, the top left room (sensors layout from 'sensorlayout2.png')
const ROOMS = {
  BEDROOM_1: {
    MOTION_SENSORS: [
      'M044',
      'M045',
      'M046',
      'M047',
      'M048',
      'M049',
      'M050'
    ],
    LIGHT: 'L001'
  },
  RESTROOM: {
    MOTION_SENSORS: [
      'M040',
      'M041'
    ],
    LIGHT: 'L007'
  },
  LIVING_ROOM: {
    MOTION_SENSORS: [
      'M001',
      'M002',
      'M003',
      'M004',
      'M005',
      'M006',
      'M007',
      'M008',
      'M009',
      'M010',
      'M011',
      'M012',
      'M013',
      'M014',
      'M015'
    ],
    LIGHT: 'L008'
  }
};

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

// 1 - Download the dataset
new Promise((resolve, reject) => {
  http.get('http://ailab.wsu.edu/casas/datasets/twor.2010.zip', response => {
    console.log('Retrieving dataset \'twor.2010\' from \'http://ailab.wsu.edu/casas/datasets/twor.2010.zip\'...');
    response
    .pipe(unzip.Extract({
      path: DOWNLOAD_DIR
    }))
    .on('close', () => {
      resolve();
    })
    .on('error', err => {
      reject(err);
    });
  });
})
// 3 - Parse the data to retrieve the sensors and their values
.then(() => createDatasetReadStream(path.join(DOWNLOAD_DIR, './twor.2010/data')))
.then(stream => Promise.all(_.map(ROOMS, (devices, room) => {
  const outputFile = path.join(DATA_DIR, `./twor_${room}.json`);
  const selectedDevices = _.concat(devices.MOTION_SENSORS, [devices.LIGHT]);
  const fullOperationsStream = stream
  .fork()
  .filter(({ device }) => _.includes(selectedDevices, device))
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
    const movementValues = _.filter(diff, (value, device) => _.includes(devices.MOTION_SENSORS, device));
    const counts = _.countBy(movementValues);
    return {
      timestamp: timestamp,
      diff: {
        tz: diff.tz,
        light: diff[devices.LIGHT] && (_.includes(['OFF', 'Unknown'], diff[devices.LIGHT]) ? 'OFF' : 'ON'),
        movement: counts['ON'] || 0
      }
    };
  })
  .filter(({ diff }) => diff.tz && diff.light && diff.movement); // Filter the incomplete operations

  const mergedOperationsStream = mergeCloseOperations(fullOperationsStream, 10);

  const diffedsOperationStream = diffOperationStream(mergedOperationsStream);

  const dataStream = highland([
    highland(['[\n  ']),
    diffedsOperationStream.map(operation => JSON.stringify(operation)).intersperse(',\n  '),
    highland(['\n]\n'])
  ])
  .sequence();

  return new Promise((resolve, reject) => {
    rimraf(outputFile, err => err ? reject(err) : resolve());
  })
  .then(() => new Promise((resolve, reject) => {
    console.log(`Building the operation history for room ${room} from 'twor.2010'...`);

    const outputStream = fs.createWriteStream(outputFile);
    outputStream.on('close', () => resolve());
    outputStream.on('error', err => reject(err));

    dataStream.pipe(outputStream);
  }));
})))
.then(() => {
  console.log('Preparation of dataset \'twor.2010\' successful!');
})
.catch(err => {
  console.log('Error', err);
  process.exit(1);
});
