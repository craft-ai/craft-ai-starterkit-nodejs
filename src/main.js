require('dotenv').load();

const craftai = require('craft-ai').createClient;
const fs = require('fs');
const path = require('path');
const process = require('process');

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
new Promise((resolve, reject) => fs.readFile(LOCAL_FILE_PATH1, (err, data) => {
  if (err) {
    reject(err);
  }
  resolve(data);
}))
  .then((data) => JSON.parse(data))
  .then((context) => {
    const agentName = ROOM1;
    // 2 - Cleanup the mess (agent's name can't be duplicate)
    return CRAFT_CLIENT.deleteAgent(agentName)
      .then(() => {
        return CRAFT_CLIENT.deleteGenerator(GENERATOR_NAME);
      })
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
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 0
            },
            new craftai.Time('2010-01-04T01:30:00+09:00')
          );
          console.log(`Decision taken:\n- The light is ${d.output.light.predicted_value} when there is no movement at 1:30AM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 0
            },
            new craftai.Time('2010-01-04T08:58:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is no movement at 8:58AM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 0
            },
            new craftai.Time('2010-01-04T09:42:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is no movement at 9:42AM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 2
            },
            new craftai.Time('2010-01-04T09:42:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is some movement at 9:42AM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 2
            },
            new craftai.Time('2010-01-04T17:03:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is some movement at 5:03PM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 2
            },
            new craftai.Time('2010-01-04T20:55:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is some movement at 8:55PM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 2
            },
            new craftai.Time('2010-01-04T22:07:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is some movement at 10:07PM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 10
            },
            new craftai.Time('2010-01-04T09:42:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is a lot of movement at 9:42AM.`);
        }
        {
          const d = craftai.interpreter.decide(
            tree,
            {
              movement: 10
            },
            new craftai.Time('2010-01-04T02:17:00+09:00')
          );
          console.log(`- The light is ${d.output.light.predicted_value} when there is a lot of movement at 2:17AM.`);
        }
      })
      .then(() => {
        // 7 - Create Agent 1, 2 and 3
        new Promise((resolve, reject) => fs.readFile(LOCAL_FILE_PATH1, (err, data) => {
          if (err) {
            reject(err);
          }
          resolve(data);
        }))
          .then((data) => JSON.parse(data))
          .then((context) => {
            const agentName = ROOM1;
            // 2 - Cleanup the mess (agent's name can't be duplicate)
            newData = [];
            context.forEach((originalData) => {
              data = {
                timestamp: originalData.timestamp,
                context: {
                  stateChange: originalData.context.light=="ON" ? (originalData.context.movement>1 ? 'both' : 'light') : (originalData.context.movement>1 ? 'movement' : 'none'),
                  room: agentName,
                  tz: originalData.context.tz,
                  movement: originalData.context.movement,
                }
              }
              newData.push(data);
            });
            return CRAFT_CLIENT.deleteAgent(agentName)
              .then(() => {
                console.log(`Creating agent ${agentName}.`);
                return CRAFT_CLIENT.createAgent({
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
                }, agentName);
              })
              // 4 - Send the dataset's operations
              .then(() => {
                console.log(`Adding context operations for agent ${agentName}...`);
                return CRAFT_CLIENT.addAgentContextOperations(agentName, newData);
              })
              .then(() => {
                new Promise((resolve, reject) => fs.readFile(LOCAL_FILE_PATH2, (err, data) => {
                  if (err) {
                    reject(err);
                  }
                  resolve(data);
                }))
                  .then((data) => JSON.parse(data))
                  .then((context) => {
                    const CRAFT_CLIENT = craftai(process.env.CRAFT_TOKEN);
                    const agentName = ROOM2;
                    newData = [];
                    context.forEach((originalData) => {
                      data = {
                        timestamp: originalData.timestamp,
                        context: {
                          stateChange: originalData.context.light=="ON" ? (originalData.context.movement>1 ? 'both' : 'light') : (originalData.context.movement>1 ? 'movement' : 'none'),
                          room: agentName,
                          tz: originalData.context.tz,
                          movement: originalData.context.movement,
                        }
                      }
                      newData.push(data);
                    });
                    return CRAFT_CLIENT.deleteAgent(agentName)
                      .then(() => {
                        console.log(`Creating agent ${agentName}.`);
                        return CRAFT_CLIENT.createAgent({
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
                        }, agentName);
                      })
                      .then(() => {
                        console.log(`Adding context operations for agent ${agentName}...`);
                        return CRAFT_CLIENT.addAgentContextOperations(agentName, newData);
                      })
                      .then(() => {
                        new Promise((resolve, reject) => fs.readFile(LOCAL_FILE_PATH3, (err, data) => {
                          if (err) {
                            reject(err);
                          }
                          resolve(data);
                        }))
                          .then((data) => JSON.parse(data))
                          .then((context) => {
                            const CRAFT_CLIENT = craftai(process.env.CRAFT_TOKEN);
                            const agentName = ROOM3;
                            newData = [];
                            context.forEach((originalData) => {
                              data = {
                                timestamp: originalData.timestamp,
                                context: {
                                  stateChange: originalData.context.light=="ON" ? (originalData.context.movement>1 ? 'both' : 'light') : (originalData.context.movement>1 ? 'movement' : 'none'),
                                  room: agentName,
                                  tz: originalData.context.tz,
                                  movement: originalData.context.movement,
                                }
                              }
                              newData.push(data);
                            });
                            return CRAFT_CLIENT.deleteAgent(agentName)
                              .then(() => {
                                console.log(`Creating agent ${agentName}.`);
                                return CRAFT_CLIENT.createAgent({
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
                                }, agentName);
                              })
                              .then(() => {
                                console.log(`Adding context operations for agent ${agentName}...`);
                                return CRAFT_CLIENT.addAgentContextOperations(agentName, newData);
                              })
                              .then(() => {
                                const CRAFT_CLIENT = craftai(process.env.CRAFT_TOKEN);
                                // 8 - Cleanup the mess (generator's name can't be duplicate)
                                return CRAFT_CLIENT.deleteGenerator(GENERATOR_NAME);
                              })
                              .then(() => {
                                // 9 - Create the generator
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
                                    "stateChange"
                                  ],
                                  learning_period: 1500000,
                                  tree_max_operations: 15000,
                                  operations_as_events: true,
                                  filter: GENERATOR_FILTER
                                };
                                return CRAFT_CLIENT.createGenerator(GENERATOR_CONFIGURATION, GENERATOR_NAME);
                              })
                              .then(() => {
                                console.log(`Computing the decision model for generator ${GENERATOR_NAME} (this may take a little while)...`);
                                // 10 - Compute decision from the decision tree in order to automate the light
                                // Download the tree
                                return CRAFT_CLIENT.getGeneratorDecisionTree(GENERATOR_NAME, context[context.length - 1].timestamp);
                              })
                              .then((tree) => {
                                console.log('Generator decision tree computed!');
                                // 11 - Get decisions
                                {
                                  const d = craftai.interpreter.decide(
                                    tree,
                                    {
                                      room: ROOM1
                                    },
                                    new craftai.Time('2010-01-04T01:30:00+09:00')
                                  );
                                  console.log(`- A change of state ${d.output.stateChange.predicted_value} is expected in the bedroom at 1:30AM.`);
                                }
                                {
                                  const d = craftai.interpreter.decide(
                                    tree,
                                    {
                                      room: ROOM2
                                    },
                                    new craftai.Time('2010-01-04T08:58:00+09:00')
                                  );
                                  console.log(`- A change of state ${d.output.stateChange.predicted_value} is expected in the living room at 8:58AM.`);
                                }
                                {
                                  const d = craftai.interpreter.decide(
                                    tree,
                                    {
                                      room: ROOM3
                                    },
                                    new craftai.Time('2010-01-04T09:42:00+09:00')
                                  );
                                  console.log(`- A change of state ${d.output.stateChange.predicted_value} is expected in the restroom at 9:42AM.`);
                                }
                                {
                                  const d = craftai.interpreter.decide(
                                    tree,
                                    {
                                      room: ROOM1
                                    },
                                    new craftai.Time('2010-01-08T02:17:00+09:00')
                                  );
                                  console.log(`- A change of state ${d.output.stateChange.predicted_value} is expected in the bedroom at 2:17AM.`);
                                }
                              })
                          })
                      })
                  })
              })
          })
      })
  })
  .catch((error) => {
    console.log('Error!', error);
    process.exit(1);
  });
