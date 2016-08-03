import _ from 'lodash';
import { CRAFT_AGENT, DATASET, DATASETS, DATA_DIR, SENSORS_CONTEXT, SENSORS_OUTPUT, SENSORS_POSTTREAMENT, TIME_QUANTUM, LOWER_BOUND, UPPER_BOUND } from './cfg';
import craftai, { Time } from 'craft-ai';
import createDatasetReadStream from './createDatasetReadStream';
import dotenv from 'dotenv';
import es from 'event-stream';
import moment from 'moment';
import path from 'path';
import Promise from 'bluebird';
import streamReduce from 'stream-reduce';

dotenv.load();

const ROOT_DIR = path.join(__dirname, '../');
const DATASET_DIR = path.join(ROOT_DIR, DATA_DIR, DATASET);
const DATASET_METADATA = require(path.join(DATASET_DIR, 'metadata.json'));
const DATASET_FILE = path.join(DATASET_DIR,  DATASETS[DATASET].file);
const ACTUAL_FROM = LOWER_BOUND.isAfter(DATASET_METADATA.from) ? LOWER_BOUND : moment(DATASET_METADATA.from);
const ACTUAL_TO = UPPER_BOUND.isBefore(DATASET_METADATA.to) ? UPPER_BOUND : moment(DATASET_METADATA.to);

let CRAFT_CLIENT = craftai({
  owner: process.env.CRAFT_OWNER,
  token: process.env.CRAFT_TOKEN,
  url: process.env.CRAFT_URL,
  operationsChunksSize: 200
});

const CRAFT_MODEL = {
  context: _.reduce(SENSORS_CONTEXT, (context, sensor) => {
    const initialValue = SENSORS_POSTTREAMENT(sensor, DATASET_METADATA.sensors[sensor].initialValue);
    context[sensor] = {
      type: (SENSORS_OUTPUT === sensor || _.isString(initialValue)) ? 'enum' : 'continuous'
    };
    return context;
  }, {
    time: {
      type: 'time_of_day'
    },
    day: {
      type: 'day_of_week'
    },
    tz: {
      type: 'timezone'
    }
  }),
  output: [SENSORS_OUTPUT],
  time_quantum: TIME_QUANTUM
};

// 0 - Cleanup the mess
CRAFT_CLIENT.destroyAgent(CRAFT_AGENT)
// 1 - Create the agent
.then(() => {
  console.log(`Creating agent ${CRAFT_AGENT} from the following model.`, CRAFT_MODEL);
  return CRAFT_CLIENT.createAgent(CRAFT_MODEL, CRAFT_AGENT);
})
// 2 - Add the initial operation that gives value to all the context's properties
.then(() => {
  const t = Time(ACTUAL_FROM);
  let diff = {
    tz: t.timezone
  };
  _.each(SENSORS_CONTEXT, sensor => {
    const initialValue = DATASET_METADATA.sensors[sensor].initialValue;
    diff[sensor] = CRAFT_MODEL.context[sensor].type === 'enum' ? `${SENSORS_POSTTREAMENT(sensor, initialValue)}` : SENSORS_POSTTREAMENT(sensor, initialValue);
  });
  const operation = {
    timestamp: t.timestamp,
    diff: diff
  };
  console.log(`Adding the initial context operation to agent ${CRAFT_AGENT}.`, operation);
  return CRAFT_CLIENT.addAgentContextOperations(CRAFT_AGENT, [operation]);
})
// 3 - Send the dataset's operations
.then(() => new Promise((resolve, reject) => {
  console.log(`Adding context operations to agent ${CRAFT_AGENT} from '${DATASET_FILE}'.`);
  // Create a read stream of the dataset
  createDatasetReadStream(DATASET_FILE)
  // Filter it out
  .pipe(es.map(({ datetime, sensor, value }, cb) => {
    if (CRAFT_MODEL.context[sensor] &&
        datetime.isBetween(ACTUAL_FROM, ACTUAL_TO)) {
      cb(null, { datetime, sensor, value });
    }
    else {
      cb();
    }
  }))
  // Send to craft ai
  .pipe(streamReduce((p, { datetime, sensor, value }) => {
    return p.then(() => {
      const t = Time(datetime);
      let diff = {
        tz: t.timezone
      };
      diff[sensor] = CRAFT_MODEL.context[sensor].type === 'enum' ? `${SENSORS_POSTTREAMENT(sensor, value)}` : SENSORS_POSTTREAMENT(sensor, value);
      return CRAFT_CLIENT.addAgentContextOperations(CRAFT_AGENT, [{
        timestamp: t.timestamp,
        diff: diff
      }]);
    });
  }, Promise.resolve()))
  .on('data', p => {
    p
    .then(() => resolve())
    .catch(e => reject(e));
  })
  .on('error', e => reject(e));
}))
.then(() => {
  return CRAFT_CLIENT.getAgent(CRAFT_AGENT)
  .then(() => {
    console.log(`Operations successfully added to agent ${CRAFT_AGENT} from ${ACTUAL_FROM.toString()} to ${ACTUAL_TO.toString()}`);
  })
  .then(() => CRAFT_CLIENT.getAgentInspectorUrl(CRAFT_AGENT, ACTUAL_TO));
})
.then(url => console.log(`Agent ${CRAFT_AGENT} inspectable at ${url}`))
.catch(error => console.log('Error!', error));
