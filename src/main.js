require('dotenv').load();

const craftai = require('craft-ai').createClient;
const fs = require('fs');
const path = require('path');
const process = require('process');

// const ROOM = 'BEDROOM_1';
// const ROOM = 'LIVING_ROOM';
// const ROOM = 'RESTROOM';
const ROOM = 'BEDROOM_1augment'

const LOCAL_FILE_PATH = path.join(__dirname, `../data/twor_${ROOM}.json`);

// 0 - Create the craft client
const CRAFT_CLIENT = craftai(process.env.CRAFT_TOKEN);

// 1 - Retrieve the prepared data
new Promise((resolve, reject) => fs.readFile(LOCAL_FILE_PATH, (err, data) => {
  if (err) reject(err);
  resolve(data);
}))
.then(data => JSON.parse(data))
.then(context => {
  const agentName = ROOM;
  let tab = [];
  for (let i = 0; i < 20; i++) {
    console.log(`Deleting agent ${agentName + i}...`);
    tab[i] = CRAFT_CLIENT.deleteAgent(agentName + i)
  }
  return Promise.all(
    tab
  )
  // 2 - Cleanup the mess (agent's name can't be duplicate)
  // 3 - Create the agent
  .then(() => {
    let tab = [];
    for (let i = 0; i < 20; i++) {
      console.log(`Creating agent ${agentName + i}.`);
      tab[i] = CRAFT_CLIENT.createAgent({
        context: {
          movement: {
            type: 'continuous'
          },
          feature0: {
            type: 'continuous'
          },
          feature1: {
            type: 'continuous'
          },
          feature2: {
            type: 'continuous'
          },
          feature3: {
            type: 'continuous'
          },
          feature4: {
            type: 'continuous'
          },
          feature5: {
            type: 'continuous'
          },
          feature6: {
            type: 'continuous'
          },
          feature7: {
            type: 'continuous'
          },
          feature8: {
            type: 'continuous'
          },
          feature9: {
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
        time_quantum: 60 * 60, // 15 min
        //learning_period: 1400000
      }, agentName + i);
    }
    return Promise.all(
      tab
    );
  })
  // 4 - Send the dataset's operations
  .then(() => {
    let tab = [];
    for (let i = 0; i < 20; i++) {
      console.log(`Adding context operations for agent ${agentName + i}...`);
      tab[i] = CRAFT_CLIENT.addAgentContextOperations(agentName + i, context);
    }
    return Promise.all(
      tab
    );
  })
  .then(() => {
    // 5 - Compute decision from the decision tree in order to automate the light
    // Download the tree
    let tab = [];
    for (let i = 0; i < 20; i++) {
      console.log(`Computing the decision model for agent ${agentName + i} (this may take a little while)...`);
      tab[i] = CRAFT_CLIENT.getAgentDecisionTree(agentName + i, context[context.length - 1].timestamp);
    }
    return Promise.all(
      tab
    )
    // .catch(error => {
    //   console.log('Error!', error)
    //   process.exit(1)
    // })
  })
  .catch(error => {
    console.log('Error!', error)
    process.exit(1)
  })
  .then(() => {
    console.log("Finished");
    process.exit(0)
  })
})
.catch(error => {
  console.log('Error!', error);
  process.exit(1);
});
