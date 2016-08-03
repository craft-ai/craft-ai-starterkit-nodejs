import _ from 'lodash';
import es from 'event-stream';
import fs from 'fs';
import moment from 'moment';

export default function createDatasetReadStream(path) {
  return fs.createReadStream(path)
  .pipe(es.split()) //split stream to break on newlines
  .pipe(es.map((line, cb) => {
    try {
      const [date, time, sensor, value] = line.split(' ');
      if (_.isString(date) && _.isString(time) && _.isString(sensor) && _.isString(value)) {
        const numberValue = _.toNumber(value);

        cb(null, {
          datetime: moment(date + 'T' + time),
          sensor: sensor,
          value: _.isNaN(numberValue) ? value : numberValue
        });
      }
      else {
        cb();
      }
    } catch (e) {
      cb(e);
    }
  }));
}
