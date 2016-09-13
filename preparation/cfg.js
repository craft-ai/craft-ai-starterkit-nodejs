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
export const HOUSE_CONTEXT = {
  ROOM_R1: {
    MOVEMENT: [
      'M044',
      'M045',
      'M046',
      'M047',
      'M048',
      'M049',
      'M050'
    ],
    LIGHT: [
      'L001'
    ]
  },
  LIVING_ROOM: {
    MOVEMENT: [
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
    LIGHT: [
      'L008'
    ]
  },
  ROOM_R2: {
    MOVEMENT: [
      'M030',
      'M031',
      'M032',
      'M033',
      'M034',
      'M035',
      'M036'
    ],
    LIGHT: [
      'L004'
    ]
  },
  BATHROOM: {
    MOVEMENT: [
      'M037',
      'M038',
      'M039',
      'M040'
    ],
    LIGHT: [
      'L006',
      'L005'
    ]
  },
  TOILET: {
    MOVEMENT: [
      'M041'
    ],
    LIGHT: [
      'L007'
    ]
  },
  KITCHEN: {
    MOVEMENT: [
      'M016',
      'M017',
      'M018',
      'M051'
    ],
    LIGHT: [
      'L010'
    ]
  },
  ENTRANCE: {
    MOVEMENT: [
      'M022',
      'M021',
      'M023',
      'M024',
      'M025'
    ],
    LIGHT: [
      'L009'
    ]
  },
  STAIRS_HALLWAY_UPSTAIRS: {
    MOVEMENT: [
      'M026',
      'M027',
      'M028',
      'M029'
    ],
    LIGHT: [
      'L003'
    ]
  }
};

export const SENSORS_CONTEXT = HOUSE_CONTEXT.ROOM_R1.MOVEMENT;
export const LIGHT_CONTEXT = HOUSE_CONTEXT.ROOM_R1.LIGHT;
export const CONTEXT_NAME = 'ROOM_R1.json';
// Which sensor to model with craft ai
export const SENSORS_OUTPUT = 'L001';

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
export const TIME_QUANTUM = 20 * 60;

// ----

export const CRAFT_AGENT = `starterkit-nodejs-${DATASET}-ROOM_R1`;
