import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { perplexityWorkflow } from './workflows/perplexity-workflow';
import { createPerplexityAgent } from './agents/perplexity-agent';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize perplexity agent asynchronously
const perplexityAgent = await createPerplexityAgent();

export const mastra = new Mastra({
  workflows: { weatherWorkflow, perplexityWorkflow },
  agents: { weatherAgent, perplexityAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});