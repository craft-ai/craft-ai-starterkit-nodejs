import _ from 'lodash';
import moment from 'moment';

export const DATASETS = {
  'hh112': {
    url: 'http://ailab.wsu.edu/casas/datasets/hh112.zip',
    file: 'rawdata.txt'
  },
  'twor.2010': {
    url: 'http://ailab.wsu.edu/casas/datasets/twor.2010.zip',
    file: 'data'
  }
};
export const DATA_DIR = './data';

// ----
// User changeable configuration

// The dataset to use (should belongs to DATASETS)
export const DATASET = 'twor.2010';
// The bound of the data that you want to select
export const LOWER_BOUND = moment('2009-12-01T00:00:00');
export const UPPER_BOUND = moment('2010-03-01T00:00:00');
// Which sensors to use with craft ai
// See ./data/${DATASET}/README.txt for some details
export const SENSORS_CONTEXT = [
  'L010'
];
// Which sensor to model with craft ai
export const SENSORS_OUTPUT = 'L010';

export function SENSORS_POSTTREAMENT(sensor, value) {
  if (_.startsWith(sensor, 'LL')) {
    return value > 5 ? 'ON' : 'OFF';
  }
  else if (_.startsWith(sensor, 'L')) {
    return value !== 'OFF' ? 'ON' : 'OFF';
  }
  else {
    return value;
  }
}

// Time quantum (cf. https://beta.craft.ai/doc#model)
export const TIME_QUANTUM = 10;

// ----

export const CRAFT_AGENT = `starterkit-nodejs-${DATASET}-${SENSORS_OUTPUT}`;
