# **craft ai** JavaScript starter kit #

A fully working application integrating [**craft ai**](http://craft.ai) written
in Node.js using [**craft ai** official js client](https://www.npmjs.com/package/craft-ai).

## Setup ##

- Download or clone the [sources from GitHub](https://github.com/craft-ai/craft-ai-starterkit-nodejs),
- Install [Node.js](https://nodejs.org/en/download/) on your computer,
- Install dependencies by running `npm install` in a terminal from the directory where the sources are.
- in this directory, create a `.env` file setting the following variables:
    - `CRAFT_TOKEN` allows you to [authenticate your calls to the **craft ai** API](https://beta.craft.ai/doc#header-authentication),
    - `CRAFT_OWNER` define the **owner** of the craft ai agents that will be created _(at the moment you can use any string w/o spaces)_,

## Usage ##

### Configure ###

Edit `src/cfg.js` to update the configuration.

### Retrieve and prepare data ###

```console
> npm run prepare
```

> Take a look at `data/{dataset}/metadata.json`

### Create an agent and send data ###

```console
> npm run learn
```

### Resources ###

- [craft ai documentation](https://beta.craft.ai/doc)
- Datasets are downloaded from [WSU CASAS Datasets](http://ailab.wsu.edu/casas/datasets/)

Technical questions can be sent by email at [support@craft.ai]('mailto:support@craft.ai').
