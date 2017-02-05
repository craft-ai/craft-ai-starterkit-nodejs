const craftai = require('craft-ai').createClient;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const process = require('process');

dotenv.load();

const LOCAL_FILE_PATH = path.join(__dirname, '../data/twor.2010/twor_ROOM_R1.json');
const REMOTE_FILE_PATH = 'http://craft.ai/content/data/twor_ROOM_R1.json';

// 0 - Create the craft client
const CRAFT_CLIENT = craftai({
  owner: process.env.CRAFT_OWNER,
  token: process.env.CRAFT_TOKEN
});

// 1 - Retrieve the prepared data
new Promise((resolve, reject) => fs.readFile(LOCAL_FILE_PATH, (err, data) => {
  if (err) reject(err);
  resolve(data);
}))
.then(data => JSON.parse(data))
.catch(err => {
  console.log(err);
  console.log(`Retrieving the data file from '${REMOTE_FILE_PATH}'...`);
  return fetch(REMOTE_FILE_PATH)
  .then((response) => {
    if (response.status >= 400) {
      return response.json()
        .catch(function() {
          throw new Error('Error ' + response.status + ' when retrieving context data, invalid json returned.');
        })
        .then(function(json) {
          throw new Error('Error ' + response.status + ' when retrieving context data: ' + json.message);
        });
    }
    return response.json();
  });
})
.then(context => {
  // 2 - Cleanup the mess (agent's name can't be duplicate)
  return CRAFT_CLIENT.destroyAgent('ROOM_R1')
  // 3 - Create the agent
  .then(() => {
    console.log('Creating agent ROOM_R1.');
    return CRAFT_CLIENT.createAgent({
      context: {
        movement: {
          type: 'continuous'
        },
        light: {
          type: 'enum'
        },
        tz: {
          type: 'timezone'
        },
        time: {
          type: 'time_of_day'
        }
      },
      output: ['light'],
      time_quantum: 5 * 60 // 5 min
    }, 'ROOM_R1');
  })
  // 4 - Send the dataset's operations
  .then(() => {
    console.log('Adding context operations extracted from the dataset.');
    return CRAFT_CLIENT.addAgentContextOperations('ROOM_R1', context);
  })
  .then(() => {
    console.log('Operations successfully added to agent ROOM_R1');
    // 5 - Compute decision from the decision tree in order to automate the light
    // Download the tree
    return CRAFT_CLIENT.getAgentDecisionTree('ROOM_R1', context[context.length - 1].timestamp);
  })
  .then(tree => {
    console.log('Decision tree retrieved!');
    // 6 - Get decisions
    {
      const d = craftai.decide(
        tree,
        {
          movement: 0
        },
        new craftai.Time('2010-01-04T01:30:00+09:00')
      );
      console.log(`Decision taken: the light is ${d.decision.light} when there is no movement at 1:30AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 0
        },
        new craftai.Time('2010-01-04T09:42:00+09:00')
      );
      console.log(`Decision taken: the light is ${d.decision.light} when there is no movement at 9:42AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 2
        },
        new craftai.Time('2010-01-04T09:42:00+09:00')
      );
      console.log(`Decision taken: the light is ${d.decision.light} when there is some movement at 9:42AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 2
        },
        new craftai.Time('2010-01-04T20:30:00+09:00')
      );
      console.log(`Decision taken: the light is ${d.decision.light} when there is some movement at 8:30PM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 6
        },
        new craftai.Time('2010-01-04T09:42:00+09:00')
      );
      console.log(`Decision taken: the light is ${d.decision.light} when there is a lot of movement at 9:42AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 6
        },
        new craftai.Time('2010-01-04T02:17:00+09:00')
      );
      console.log(`Decision taken: the light is ${d.decision.light} when there is a lot of movement at 2:17AM.`);
    }
  });
})
.catch(error => {
  console.log('Error!', error);
  process.exit(1);
});
