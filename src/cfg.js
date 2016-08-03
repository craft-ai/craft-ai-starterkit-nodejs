import _ from 'lodash';
import moment from 'moment';

export const DATASETS = {
  'hh112': 'http://ailab.wsu.edu/casas/datasets/hh112.zip'
};
export const DATA_DIR = './data';

// ----
// User changeable configuration

// The dataset to use (should belongs to DATASETS)
export const DATASET = 'hh112';
// The bound of the data that you want to select
export const LOWER_BOUND = moment('2011-06-10T00:00:00');
export const UPPER_BOUND = moment('2011-08-10T00:00:00');
// Which sensors to use with craft ai
// See ./data/${DATASET}/README.txt for some details
export const SENSORS_CONTEXT = [
  'LL002',
  'LS002'
];
// Which sensor to model with craft ai
export const SENSORS_OUTPUT = 'LL002';

export function SENSORS_POSTTREAMENT(sensor, value) {
  if (_.startsWith(sensor, 'LL')) {
    return value > 5 ? 'ON' : 'OFF';
  }
  else {
    return value;
  }
}

// Time quantum (cf. https://beta.craft.ai/doc#model)
export const TIME_QUANTUM = 15 * 60;

// ----

export const CRAFT_AGENT = `starterkit-nodejs-${DATASET}-${SENSORS_OUTPUT}`;
