# **craft ai** JavaScript starter kit #

A fully working application integrating [**craft ai**](http://craft.ai) written
in Node.js using [**craft ai** official js client](https://www.npmjs.com/package/craft-ai).

## Setup ##

- Download or clone the [sources from GitHub](https://github.com/craft-ai/craft-ai-starterkit-nodejs),
- Install [Node.js](https://nodejs.org/en/download/) on your computer,
- Install dependencies by running `npm install` in a terminal from the directory where the sources are.
- in this directory, create a `.env` file setting the following variables:
    - `CRAFT_TOKEN` allows you to [authenticate your calls to the **craft ai** API](https://beta.craft.ai/doc/js#1---retrieve-your-credentials),
    - `CRAFT_OWNER` define the **owner** of the craft ai agents that will be created

## Usage ##

### Goal ###

Automate the light in a room based on movement, date and time.

### Context ###

In order to reach our goal, we use real data from a house with 2 residents, gathered around 1 year (2009 - 2010) academic year.
This house is equipped with sensors like motion, light, temperature, door, etc, in all the rooms.
All the data came from the dataset twor2010 that can be found [here](http://ailab.wsu.edu/casas/datasets/).

In this particular example, we will show you how to use craft ai to do this automation.

### Preparation ###

Here we will only use the movement sensors and the light sensor in one room, here the bedroom of one of the residents.
We prepare the data by merging all the data of the movement sensors, to see if there is movement in a certain duration.

The pre-treated data are already computed and available for this example.

But if you want to pre-treat by yourself, you could run:

```console
> npm run prepare_data.
```

The result will be set in data/twor.2010.

### Create an agent, send data and get a decision tree ###

```console
> npm run start
```


### What do next ? ###

Now, that you have your decision tree, you are able to complete the initial goal: automate the room's light.
With it you can compute decision and get a result with a confidence, that can help you to decide if you turn the light on or off.

### Resources ###

- [craft ai documentation](https://beta.craft.ai/doc)
- Datasets are downloaded from [WSU CASAS Datasets](http://ailab.wsu.edu/casas/datasets/)

Technical questions can be sent by email at [support@craft.ai]('mailto:support@craft.ai').
