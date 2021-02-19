require('dotenv').load();

const craftai = require('craft-ai').createClient;
const path = require('path');
const process = require('process');

const utils = require('./utils');

const ROOM1 = 'BEDROOM_1';
const ROOM2 = 'LIVING_ROOM';
const ROOM3 = 'RESTROOM';

const GENERATOR_FILTER = [ROOM1, ROOM2, ROOM3];
const GENERATOR_NAME = 'smarthome';

const LOCAL_FILE_PATH1 = path.join(__dirname, `../data/twor_${ROOM1}.json`);
const LOCAL_FILE_PATH2 = path.join(__dirname, `../data/twor_${ROOM2}.json`);
const LOCAL_FILE_PATH3 = path.join(__dirname, `../data/twor_${ROOM3}.json`);

// 0 - Create the craft client
const CRAFT_CLIENT = craftai(process.env.CRAFT_TOKEN);

// 1 - Retrieve the prepared data
utils.readData(LOCAL_FILE_PATH1)
  .then((context) => {
    const agentName = ROOM1;
    // 2 - Cleanup the mess (agent's name can't be duplicate)
    return Promise.all([
      CRAFT_CLIENT.deleteAgent(agentName),
      CRAFT_CLIENT.deleteGenerator(GENERATOR_NAME)
    ])
      // 3 - Create the agent 1
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
          time_quantum: 15 * 60 // 15 min
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
        return CRAFT_CLIENT.getAgentDecisionTree(agentName, context[context.length - 1].timestamp, 2);
      })
      .then((tree) => {
        console.log('Decision tree computed!');
        // 6 - Get decisions
        const d1 = craftai.interpreter.decide(
          tree,
          {
            movement: 0
          },
          new craftai.Time('2010-01-04T01:30:00+09:00')
        );
        console.log(`Decision taken:\n- The light is ${d1.output.light.predicted_value} when there is no movement at 1:30AM.`);
        const d2 = craftai.interpreter.decide(
          tree,
          {
            movement: 0
          },
          new craftai.Time('2010-01-04T08:58:00+09:00')
        );
        console.log(`- The light is ${d2.output.light.predicted_value} when there is no movement at 8:58AM.`);
        const d3 = craftai.interpreter.decide(
          tree,
          {
            movement: 0
          },
          new craftai.Time('2010-01-04T09:42:00+09:00')
        );
        console.log(`- The light is ${d3.output.light.predicted_value} when there is no movement at 9:42AM.`);
        const d4 = craftai.interpreter.decide(
          tree,
          {
            movement: 2
          },
          new craftai.Time('2010-01-04T09:42:00+09:00')
        );
        console.log(`- The light is ${d4.output.light.predicted_value} when there is some movement at 9:42AM.`);
          const d5 = craftai.interpreter.decide(
            tree,
            {
              movement: 2
            },
            new craftai.Time('2010-01-04T17:03:00+09:00')
          );
          console.log(`- The light is ${d5.output.light.predicted_value} when there is some movement at 5:03PM.`);
        }
        {
          const d6 = craftai.interpreter.decide(
            tree,
            {
              movement: 2
            },
            new craftai.Time('2010-01-04T20:55:00+09:00')
          );
          console.log(`- The light is ${d6.output.light.predicted_value} when there is some movement at 8:55PM.`);
        }
        {
          const d7 = craftai.interpreter.decide(
            tree,
            {
              movement: 2
            },
            new craftai.Time('2010-01-04T22:07:00+09:00')
          );
          console.log(`- The light is ${d7.output.light.predicted_value} when there is some movement at 10:07PM.`);
        }
        {
          const d8 = craftai.interpreter.decide(
            tree,
            {
              movement: 10
            },
            new craftai.Time('2010-01-04T09:42:00+09:00')
          );
          console.log(`- The light is ${d8.output.light.predicted_value} when there is a lot of movement at 9:42AM.`);
        }
        {
          const d9 = craftai.interpreter.decide(
            tree,
            {
              movement: 10
            },
            new craftai.Time('2010-01-04T02:17:00+09:00')
          );
          console.log(`- The light is ${d9.output.light.predicted_value} when there is a lot of movement at 2:17AM.`);
        }
      })
      .then(() => {
        const deleteBulkPayload = [
          { id: ROOM1 },
          { id: ROOM2 },
          { id: ROOM3 }
        ];
        return Promise.all([
          CRAFT_CLIENT.deleteAgentBulk(deleteBulkPayload),
          CRAFT_CLIENT.deleteGenerator(GENERATOR_NAME)
        ]);
      })
      // 7 - Create Agent 1, 2 and 3
      .then(() => {
        const configuration = {
          context: {
            movement: {
              type: 'continuous'
            },
            stateChange: {
              type: 'enum'
            },
            room: {
              type: 'enum'
            },
            tz: {
              type: 'timezone'
            },
            time: {
              type: 'time_of_day'
            }
          },
          output: ['stateChange'],
          time_quantum: 15 * 60 // 15 min
        };
        const createBulkPayload = [
          { id: ROOM1, configuration: configuration },
          { id: ROOM2, configuration: configuration },
          { id: ROOM3, configuration: configuration }
        ];
        console.log(`Creating agents ${ROOM1}, ${ROOM2} and ${ROOM3}.`);
        return CRAFT_CLIENT.createAgentBulk(createBulkPayload);
      })
      .then(() => Promise.all([
        utils.readData(LOCAL_FILE_PATH1),
        utils.readData(LOCAL_FILE_PATH2),
        utils.readData(LOCAL_FILE_PATH3),
      ]))
      .then(([context_1, context_2, context_3]) => {
        const operations_agent_1 = utils.prepareData(context_1, ROOM1);
        const operations_agent_2 = utils.prepareData(context_2, ROOM2);
        const operations_agent_3 = utils.prepareData(context_3, ROOM3);
        const contextOperationBulkPayload = [
          { id: ROOM1, operations: operations_agent_1 },
          { id: ROOM2, operations: operations_agent_2 },
          { id: ROOM3, operations: operations_agent_3 }
        ];
        console.log(`Adding context operations for agents ${ROOM1}, ${ROOM2} and ${ROOM3}.`);
        return CRAFT_CLIENT.addAgentContextOperationsBulk(contextOperationBulkPayload);
      })
      .then(() => {
        const GENERATOR_CONFIGURATION = {
          context: {
            stateChange: {
              type: 'enum'
            },
            room: {
              type: 'enum'
            },
            tz: {
              type: 'timezone'
            },
            time: {
              type: 'time_of_day',
              is_generated: true
            }
          },
          output: [
            'stateChange'
          ],
          learning_period: 1500000,
          tree_max_operations: 15000,
          operations_as_events: true,
          filter: GENERATOR_FILTER
        };
        console.log(`Creating generator ${GENERATOR_NAME}.`);
        // 8 - Create generator
        return CRAFT_CLIENT.createGenerator(GENERATOR_CONFIGURATION, GENERATOR_NAME);
      })
      .then(() => {
        console.log(`Computing the decision model for generator ${GENERATOR_NAME} (this may take a little while)...`);
        // 9 - Compute decision from the decision tree in order to automate the light
        // Download the tree
        return CRAFT_CLIENT.getGeneratorDecisionTree(GENERATOR_NAME, context[context.length - 1].timestamp);
      })
      .then((tree) => {
        console.log('Generator decision tree computed!');
        // 10 - Get decisions
          const d10 = craftai.interpreter.decide(
            tree,
            {
              room: ROOM1
            },
            new craftai.Time('2010-01-04T01:30:00+09:00')
          );
          console.log(`- A change of state ${d10.output.stateChange.predicted_value} is expected in the bedroom at 1:30AM.`);
          const d11 = craftai.interpreter.decide(
            tree,
            {
              room: ROOM2
            },
            new craftai.Time('2010-01-04T08:58:00+09:00')
          );
          console.log(`- A change of state ${d11.output.stateChange.predicted_value} is expected in the living room at 8:58AM.`);
          const d12 = craftai.interpreter.decide(
            tree,
            {
              room: ROOM3
            },
            new craftai.Time('2010-01-04T09:42:00+09:00')
          );
          console.log(`- A change of state ${d12.output.stateChange.predicted_value} is expected in the restroom at 9:42AM.`);
          const d13 = craftai.interpreter.decide(
            tree,
            {
              room: ROOM1
            },
            new craftai.Time('2010-01-08T02:17:00+09:00')
          );
          console.log(`- A change of state ${d13.output.stateChange.predicted_value} is expected in the bedroom at 2:17AM.`);
      });
  })
  .catch((error) => {
    console.log('Error!', error);
    process.exit(1);
  });
