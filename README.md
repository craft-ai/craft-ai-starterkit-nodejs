# **craft ai** JavaScript starter kit #

[![Build](https://img.shields.io/travis/craft-ai/craft-ai-starterkit-nodejs/master.svg?style=flat-square)](https://travis-ci.org/craft-ai/craft-ai-starterkit-nodejs) [![License](https://img.shields.io/badge/license-BSD--3--Clause-42358A.svg?style=flat-square)](LICENSE)

[**craft ai** _AI-as-a-service_](http://craft.ai) enables your services to learn every day: provide a personalized experience to each user and automate complex tasks.

This repository hosts a fully working application, in a **Smart Home** context, integrating [**craft ai**](http://craft.ai) written in Node.js using [**craft ai** official js client](https://www.npmjs.com/package/craft-ai).

The end goal: automate the _light_ in a room based on _motion sensors_ and _time_. Using **craft ai**, this simple application learns when each household prefers the light to be turned when a motion is detected.

## Setup ##

- Download or clone the [sources from GitHub](https://github.com/craft-ai/craft-ai-starterkit-nodejs),
- Install [Node.js](https://nodejs.org/en/download/) on your computer (version 6.9 is recommended),
- Install dependencies by running `npm install` in a terminal from the directory where the sources are.
- Create a project following the subsection 1 of this [tutorial](https://beta.craft.ai/doc/python#1---retrieve-your-credentials) and copy the write token
- in this directory, create a `.env` file setting the following variable:
    - `CRAFT_TOKEN` allows you to [authenticate your calls to the **craft ai** API](https://beta.craft.ai/doc/js#1---retrieve-your-credentials):
    ```
    CRAFT_TOKEN=paste-your-token-here
    ```

## Run ##

The following will:

1. create an agent,
2. add a bunch of context operations from the example dataset,
3. compute a decision tree and
4. take a few decisions.

```console
> npm run start
```

### What do next ? ###

Now that you know how to compute your decision tree, you are able to complete the initial goal: automate the room's light using actual devices.

You can use the devices input to add context operations in real time and compute a decision when the context changes that can be used, in conjuction with its confidence, to turn the light on or off.

## About the dataset ##

This starter kit uses real data extracted from a public dataset.

The dataset _"twor.2010"_ was made available by the [CASAS group of Washington State University](http://casas.wsu.edu); the original dataset can be found [here](http://ailab.wsu.edu/casas/datasets/). It comes from a house with 2 residents, gathered around 1 year (2009 - 2010) academic year. This house is equipped with sensors like motion, light, temperature, door, etc, in all the rooms.

### Data preparation ###

> The pre-treated data are already computed and available for this example.

We only use the movement sensors and the light sensor from one room: the bedroom of one of the residents.
From the original data, we selected the desired sensors: one lightbulb and several motion sensors that we merge to a unique indicator counting the number of sensors detecting movements.

If you want to pre-treat by yourself, you could run:

```console
> npm run prepare_data.
```

The result will be set in `data/twor.2010`.

This runs `src/prepare.js`, you can check out this file to see what we've done and make your own preparation.

> The **craft ai** user documentation can be found at <https://beta.craft.ai/doc> and technical questions can be sent by email at [support@craft.ai]('mailto:support@craft.ai').
