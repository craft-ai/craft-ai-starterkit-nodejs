const fs = require('fs');
const path = require('path');

const readData = async (path) => {
  return new Promise((resolve, reject) => fs.readFile(path, (err, data) => {
    if (err) {
      reject(err);
    }
    resolve(data);
  }))
    .then((data) => JSON.parse(data))
    .then((context) => {
      return context;
     })
     .catch((error) => {
       console.log('Error!', error);
       process.exit(1);
     });
}

const prepareData = (context, room) => {
  let operationsAgent = [];
  context.forEach((originalData) => {
    data = {
      timestamp: originalData.timestamp,
      context: {
        stateChange: originalData.context.light == "ON" ? (originalData.context.movement > 1 ? 'both' : 'light') : (originalData.context.movement > 1 ? 'movement' : 'none'),
        room: room,
        tz: originalData.context.tz,
        movement: originalData.context.movement
      }
    }
    operationsAgent.push(data);
  });
  return operationsAgent;
}

exports.readData = readData;
exports.prepareData = prepareData;
