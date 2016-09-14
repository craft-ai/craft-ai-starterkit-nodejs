# **craft ai** JavaScript starter kit #

[**craft ai** _AI-as-a-service_](http://craft.ai) enables developers to create Apps and Things that adapt to each user. To go beyond useless dashboards and spammy notifications, **craft ai** learns how users behave to automate recurring tasks, make personalized recommendations, or detect anomalies.

This repository hosts a fully working application, in a **Smart Home** context, integrating [**craft ai**](http://craft.ai) written in Node.js using [**craft ai** official js client](https://www.npmjs.com/package/craft-ai).

The end goal: automate the light in a room based on _motion sensors_, _date/time_. Using **craft ai**, this simple application learns when (_date/time_) each household prefers the light to be turned when a motion is detected.

## Setup ##

- Download or clone the [sources from GitHub](https://github.com/craft-ai/craft-ai-starterkit-nodejs),
- Install [Node.js](https://nodejs.org/en/download/) on your computer,
- Install dependencies by running `npm install` in a terminal from the directory where the sources are.
- in this directory, create a `.env` file setting the following variables:
    - `CRAFT_TOKEN` allows you to [authenticate your calls to the **craft ai** API](https://beta.craft.ai/doc/js#1---retrieve-your-credentials),
    - `CRAFT_OWNER` define the **owner** of the craft ai agents that will be created

## Run ##

The following will:

1. create an agent, 
2. add a bunch of context operations from the example dataset, 
3. compute a decision tree and 
4. take a few decisions, this is how you'd do the automation with data from real devices.

```console
> npm run start
```

## About the dataset ##

This starter kit uses real data extracted from a public dataset. 

The dataset _"twor.2010"_ was made available by the [CASAS group of Washington State University](http://casas.wsu.edu); the original dataset can be found [here](http://ailab.wsu.edu/casas/datasets/). It comes from a house with 2 residents, gathered around 1 year (2009 - 2010) academic year. This house is equipped with sensors like motion, light, temperature, door, etc, in all the rooms.

### Data preparation ###

> The pre-treated data are already computed and available for this example.

We only use the movement sensors and the light sensor from one room: the bedroom of one of the residents.
From the original data, we selected the desired sensors: one lightbulb and several motion sensor that we merge to a unique flag telling if at least one of the detector was activated in the past 20 minutes.

If you want to pre-treat by yourself, you could run:

```console
> npm run prepare_data.
```

The result will be set in `data/twor.2010`.

This runs `src/prepare.js`, you can check out this file to see what we've done and make your own preparation.


### What do next ? ###

Now, that you have your decision tree, you are able to complete the initial goal: automate the room's light.
With it you can compute decision and get a result with a confidence, that can help you to decide if you turn the light on or off.

> The **craft ai** user documentation can be found at <https://beta.craft.ai/doc> and technical questions can be sent by email at [support@craft.ai]('mailto:support@craft.ai').
