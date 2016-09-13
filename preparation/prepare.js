import _ from 'lodash';
import { DATASET, DATASETS, DATA_DIR } from './cfg';
import createDatasetReadStream from './createDatasetReadStream';
import dotenv from 'dotenv';
import es from 'event-stream';
import fs from 'fs';
import http from 'http';
import path from 'path';
import Promise from 'bluebird';
import rimraf from 'rimraf';
import streamReduce from 'stream-reduce';
import unzip from 'unzip';

dotenv.load();

const ROOT_DIR = path.join(__dirname, '../');
const DATASET_URL = DATASETS[DATASET].url;
const DATASET_FILE = DATASETS[DATASET].file;

// 0 - Cleanup the mess
new Promise((resolve, reject) => rimraf(path.join(ROOT_DIR, DATA_DIR, DATASET), err => err ? reject(err) : resolve(err)))
// 1 - Download the dataset
.then(() => new Promise((resolve, reject) => {
  http.get(DATASET_URL, function(response) {
    console.log(`Retrieving dataset '${DATASET}' from '${DATASET_URL}'...`);
    response
    .pipe(unzip.Extract({
      path: path.join(ROOT_DIR, DATA_DIR)
    }))
    .on('close', () => resolve())
    .on('error', err => reject(err));
  });
}))
// 2 - Parse the data to retrieve the sensors and their values
.then(() => new Promise((resolve, reject) => {
  console.log(`Extracting the metadata from dataset '${DATASET}'...`);
  createDatasetReadStream(path.join(ROOT_DIR, DATA_DIR, DATASET, DATASET_FILE))
  .pipe(streamReduce(({ from, to, count, sensors }, { datetime, sensor, value }) => {
    if (!from || datetime.isBefore(from)) {
      from = datetime;
    }
    if (!to || datetime.isAfter(to)) {
      to = datetime;
    }
    if (_.isUndefined(sensors[sensor])) {
      if (_.isNumber(value)) {
        sensors[sensor] = {
          name: sensor,
          count: 1,
          min: value,
          max: value,
          initialValue: value
        };
      }
      else {
        sensors[sensor] = {
          name: sensor,
          count: 1,
          values: [value],
          initialValue: value
        };
      }
    }
    else {
      sensors[sensor].count += 1;
      if (_.isNumber(value)) {
        sensors[sensor].min = Math.min(value, sensors[sensor].min);
        sensors[sensor].max = Math.max(value, sensors[sensor].max);
      }
      else {
        sensors[sensor].values = _.union(sensors[sensor].values, [value]);
      }
    }
    count += 1;
    return { from, to, count, sensors };
  }, {
    from: undefined,
    to: undefined,
    count: 0,
    sensors: {}
  }))
  .pipe(es.map((data, cb) => {
    cb(null, JSON.stringify(data, null, '  '));
  }))
  .pipe(fs.createWriteStream(path.join(ROOT_DIR, DATA_DIR, DATASET, 'metadata.json')))
  .on('close', () => resolve())
  .on('error', err => reject(err));
}))
.then(() => console.log(`Preparation of dataset '${DATASET}' successful!`))
.catch(err => console.log('Error', err));
