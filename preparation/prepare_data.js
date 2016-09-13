import _ from 'lodash';
import { DATASET, DATASETS, DATA_DIR, SENSORS_CONTEXT, LIGHT_CONTEXT, CONTEXT_NAME } from './cfg';
import createDatasetReadStream from './createDatasetReadStream';
import dotenv from 'dotenv';
import es from 'event-stream';
import fs from 'fs';
import path from 'path';
import Promise from 'bluebird';
import streamReduce from 'stream-reduce';
import moment from 'moment';
import { Time } from 'craft-ai';

dotenv.load();

const ROOT_DIR = path.join(__dirname, '../');
const DATASET_FILE = DATASETS[DATASET].file;

function isMoving(sensors) {
  let moving = false;
  _.forEach(sensors, (value) => {
    moving = value == 'ON' || moving;
  });
  return moving;
}

// 1 - Parse the data to retrieve the sensors and their values
new Promise((resolve, reject) => {
  console.log(`Extracting the metadata from dataset '${DATASET}'...`);
  createDatasetReadStream(path.join(ROOT_DIR, DATA_DIR, DATASET, DATASET_FILE))
  .pipe(streamReduce(({ startingTime, movement, light, sensorsValues, diffs }, { datetime, sensor, value }) => {
    const datetimeInTz = moment(datetime).utcOffset('+09:00');
    if (!startingTime) {
      console.log('pouet');
      startingTime = moment(datetimeInTz);
      diffs.push({ timestamp: datetimeInTz.unix(), diff: { month: datetimeInTz.month(), light: 'OFF', movement: 'false', tz: Time(datetimeInTz).timezone } });
    }
    if (_.indexOf(LIGHT_CONTEXT, sensor) != -1) {
      diffs.push({ timestamp: datetimeInTz.unix(), diff: { month: datetimeInTz.month(), light: value, tz: Time(datetimeInTz).timezone } });
    }
    const addition = moment(startingTime);
    while (startingTime && addition.add('20', 'm').unix() <= datetimeInTz.unix()) {
      diffs.push({ timestamp: startingTime.unix(), diff: { month: startingTime.month(), movement: movement.toString(), tz: Time(startingTime).timezone } });
      startingTime = moment(addition);
      movement = isMoving(sensorsValues);
    }
    if (_.indexOf(SENSORS_CONTEXT, sensor) != -1) {
      sensorsValues[sensor] = value;
      movement = value == 'ON' || movement;
    }
    return { startingTime, light, movement, sensorsValues, diffs };
  }, {
    startingTime: undefined,
    light: false,
    movement: false,
    sensorsValues: {},
    diffs: []
  }))
  .pipe(es.map((data, cb) => {
    const diffs = _.sortBy(data.diffs, (diff) => diff.timestamp);
    cb(null, JSON.stringify(diffs, null, '  '));
  }))
  .pipe(fs.createWriteStream(path.join(ROOT_DIR, DATA_DIR, DATASET, CONTEXT_NAME)))
  .on('close', () => resolve())
  .on('error', err => reject(err));
})
.then(() => console.log(`Preparation of dataset '${DATASET}' successful!`))
.catch(err => console.log('Error', err));
