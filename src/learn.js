import craftai, { Time } from 'craft-ai';
import dotenv from 'dotenv';

dotenv.load();

const CRAFT_AGENT = 'ROOM_R1';
const TIME_QUANTUM = 20 * 60;

// 0 - Create the craft client
let CRAFT_CLIENT = craftai({
  owner: process.env.CRAFT_OWNER,
  token: process.env.CRAFT_TOKEN,
  operationsChunksSize: 200
});

const CRAFT_MODEL = {
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
  time_quantum: TIME_QUANTUM
};

fetch('http://craft.ai/content/data/twor_ROOM_R1.json')
.then((response) => {
  return response.json();
})
.then((context) => {

  // 1 - Cleanup the mess (agent's name can't be duplicate)
  return CRAFT_CLIENT.destroyAgent(CRAFT_AGENT)
  // 2 - Create the agent
  .then(() => {
    console.log(`Creating agent ${CRAFT_AGENT} from the following model.`, CRAFT_MODEL);
    return CRAFT_CLIENT.createAgent(CRAFT_MODEL, CRAFT_AGENT);
  })
  // 3 - Send the dataset's operations
  .then(() => {
    console.log(`Adding context operations to agent ${CRAFT_AGENT} from '${CRAFT_AGENT}' from twor.`);
    return CRAFT_CLIENT.addAgentContextOperations(CRAFT_AGENT, context);
  })
  .then(() => {
    return CRAFT_CLIENT.getAgent(CRAFT_AGENT)
    .then(() => {
      console.log(`Operations successfully added to agent ${CRAFT_AGENT}`);
    })
    .then(() => CRAFT_CLIENT.getAgentInspectorUrl(CRAFT_AGENT, 1272745200));
  })
  .then(url => console.log(`Agent ${CRAFT_AGENT} inspectable at ${url}`))
  // 4 - Get some decisions
  .then(() => {
    // Download the tree
    return CRAFT_CLIENT.getAgentDecisionTree(CRAFT_AGENT, 1272745200);
  })
  .then((tree) => {
    console.log('Tree downloaded !');
    // Get a decision from it
    let decision = craftai.decide(
      tree,
      {
        movement: 'OFF',
        month: 0
      },
      new Time('2010-01-04T01:30:00')
    );
    console.log(`Decision taken: the light is ${decision.decision.light} when there is no movement on 2010-01-04T01:30:00.`);
    decision = craftai.decide(
      tree,
      {
        movement: 'ON',
        month: 4
      },
      new Time('2009-05-16T23:00:00')
    );
    console.log(`Decision taken: the light is ${decision.decision.light} when there is movement on 2009-05-16T23:00:00.`);
  });
})
.catch(error => console.log('Error!', error));
