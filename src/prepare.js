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
const URL = DATASETS[DATASET];

// 0 - Cleanup the mess
new Promise((resolve, reject) => rimraf(path.join(ROOT_DIR, DATA_DIR, DATASET), err => err ? reject(err) : resolve(err)))
// 1 - Download the dataset
.then(() => new Promise((resolve, reject) => {
  http.get(URL, function(response) {
    console.log(`Retrieving dataset '${DATASET}' from '${URL}'...`);
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
  createDatasetReadStream(path.join(ROOT_DIR, DATA_DIR, DATASET, 'rawdata.txt'))
  .pipe(streamReduce(({ from, to, count, sensors }, { datetime, sensor, value }) => {
    if (!from || datetime.isBefore(from)) {
      from = datetime;
    }
    if (!to || datetime.isAfter(to)) {
      to = datetime;
    }
    sensors[sensor] = sensors[sensor] || {
      name: sensor,
      count: 0,
      values: []
    };
    sensors[sensor].count += 1;
    sensors[sensor].values = _(sensors[sensor].values).union([value]).sort().value();
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
