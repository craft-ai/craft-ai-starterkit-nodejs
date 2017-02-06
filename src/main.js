const craftai = require('craft-ai').createClient;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const process = require('process');

dotenv.load();

const ROOM = 'BEDROOM_1';
// const ROOM = 'LIVING_ROOM';
// const ROOM = 'RESTROOM';

const LOCAL_FILE_PATH = path.join(__dirname, `../data/twor_${ROOM}.json`);

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
.then(context => {
  const agentName = ROOM;
  // 2 - Cleanup the mess (agent's name can't be duplicate)
  return CRAFT_CLIENT.destroyAgent(agentName)
  // 3 - Create the agent
  .then(() => {
    console.log(`Creating agent ${agentName}.`);
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
    }, agentName);
  })
  // 4 - Send the dataset's operations
  .then(() => {
    console.log(`Adding context operations for agent ${agentName}...`);
    return CRAFT_CLIENT.addAgentContextOperations(agentName, context);
  })
  .then(() => {
    console.log(`Computing the decision model for agent ${agentName} (this may take a little while)...`);
    // 5 - Compute decision from the decision tree in order to automate the light
    // Download the tree
    return CRAFT_CLIENT.getAgentDecisionTree(agentName, context[context.length - 1].timestamp);
  })
  .then(tree => {
    console.log('Decision tree computed!');
    // 6 - Get decisions
    {
      const d = craftai.decide(
        tree,
        {
          movement: 0
        },
        new craftai.Time('2010-01-04T01:30:00+09:00')
      );
      console.log(`Decision taken:\n- The light is ${d.decision.light} when there is no movement at 1:30AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 0
        },
        new craftai.Time('2010-01-04T08:58:00+09:00')
      );
      console.log(`- The light is ${d.decision.light} when there is no movement at 8:58AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 0
        },
        new craftai.Time('2010-01-04T09:42:00+09:00')
      );
      console.log(`- The light is ${d.decision.light} when there is no movement at 9:42AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 2
        },
        new craftai.Time('2010-01-04T09:42:00+09:00')
      );
      console.log(`- The light is ${d.decision.light} when there is some movement at 9:42AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 2
        },
        new craftai.Time('2010-01-04T17:03:00+09:00')
      );
      console.log(`- The light is ${d.decision.light} when there is some movement at 5:03PM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 2
        },
        new craftai.Time('2010-01-04T20:30:00+09:00')
      );
      console.log(`- The light is ${d.decision.light} when there is some movement at 8:30PM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 10
        },
        new craftai.Time('2010-01-04T09:42:00+09:00')
      );
      console.log(`- The light is ${d.decision.light} when there is a lot of movement at 9:42AM.`);
    }
    {
      const d = craftai.decide(
        tree,
        {
          movement: 10
        },
        new craftai.Time('2010-01-04T02:17:00+09:00')
      );
      console.log(`- The light is ${d.decision.light} when there is a lot of movement at 2:17AM.`);
    }
  });
})
.catch(error => {
  console.log('Error!', error);
  process.exit(1);
});
