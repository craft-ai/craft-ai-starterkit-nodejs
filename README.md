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

### Context ###

For this example, we use real data from a house with 2 residents.
This house is equipped with movement sensors, light sensors, etc.

Here we will only use the movement sensors and the light sensor in one room.
We prepare the data by merging all the data of the movement sensors, to see if there is movement in a certain duration.

### Goal ###

See the light activity based on movement, date and time.

### Create an agent and send data ###

```console
> npm run start
```

### Resources ###

- [craft ai documentation](https://beta.craft.ai/doc)
- Datasets are downloaded from [WSU CASAS Datasets](http://ailab.wsu.edu/casas/datasets/)

Technical questions can be sent by email at [support@craft.ai]('mailto:support@craft.ai').
