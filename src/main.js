var craftai = require('craft-ai').createClient;
var dotenv =require('dotenv');
var fetch = require('node-fetch');

dotenv.load();

// 0 - Create the craft client
var CRAFT_CLIENT = craftai({
  owner: process.env.CRAFT_OWNER,
  token: process.env.CRAFT_TOKEN
});

// Retrieve the prepared data
fetch('http://craft.ai/content/data/twor_ROOM_R1.json')
.then(function(response) {
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
})
.then(function(context) {
  // 1 - Cleanup the mess (agent's name can't be duplicate)
  return CRAFT_CLIENT.destroyAgent('ROOM_R1')
  // 2 - Create the agent
  .then(function() {
    console.log('Creating agent ROOM_R1.');
    return CRAFT_CLIENT.createAgent({
      context: {
        movement: {
          type: 'enum'
        },
        light: {
          type: 'enum'
        },
        time: {
          type: 'time_of_day'
        },
        month: {
          type: 'continuous'
        },
        tz: {
          type: 'timezone'
        }
      },
      output: ['light'],
      time_quantum: 20 * 60 // 20 min
    }, 'ROOM_R1');
  })
  // 3 - Send the dataset's operations
  .then(function() {
    console.log('Adding context operations to agent ROOM_R1 from \'ROOM_R1\' from twor.');
    return CRAFT_CLIENT.addAgentContextOperations('ROOM_R1', context);
  })
  .then(function() {
    return CRAFT_CLIENT.getAgent('ROOM_R1')
    .then(function() {
      console.log('Operations successfully added to agent ROOM_R1');
      return CRAFT_CLIENT.getAgentInspectorUrl('ROOM_R1', context[context.length - 1].timestamp); // tree for the last timestamp pushed
    });
  })
  .then(function(url) {
    console.log('Agent ROOM_R1 inspectable at https://beta.craft.ai/inspector.');
    // 4 - Compute decision from the decision tree in order to automate the light
    // Download the tree
    return CRAFT_CLIENT.getAgentDecisionTree('ROOM_R1', context[context.length - 1].timestamp);
  })
  .then(function(tree) {
    console.log('Tree downloaded !');
    // Get a decision
    var decision = craftai.decide(
      tree,
      {
        movement: 'OFF',
        month: 0
      },
      new craftai.Time('2010-01-04T01:30:00')
    );
    console.log('Decision taken: the light is ' + decision.decision.light + ' when there is no movement on 2010-01-04T01:30:00.');
    decision = craftai.decide(
      tree,
      {
        movement: 'ON',
        month: 4
      },
      new craftai.Time('2009-05-16T23:00:00')
    );
    console.log('Decision taken: the light is ' + decision.decision.light + ' when there is movement on 2009-05-16T23:00:00.');
  });
})
.catch(function(error) {
  console.log('Error!', error);
});
