/**
 * Job Processors
 * Contains the actual job processing logic for each queue
 */

import { Job } from "bullmq";
import type { IStorage } from "../storage";
import { runPriceUpdate } from "../jobs/priceUpdate";
import { runCandlestickDataFetch } from "../jobs/candlestickData";
import { runHoldingsPriceHistoryUpdate } from "../jobs/holdingsPriceHistory";
import { runTelegramFetch } from "../jobs/telegramFetch";
import { runOpeninsiderFetch } from "../jobs/openinsiderFetch";
import { runRecommendationCleanup } from "../jobs/recommendationCleanup";
import { runSimulatedRuleExecution } from "../jobs/simulatedRuleExecution";
import { runAIAnalysis } from "../jobs/aiAnalysis";
import { runAnalysisReconciliation } from "../jobs/analysisReconciliation";
import { runDailyBriefGeneration } from "../jobs/dailyBrief";
import { runUnverifiedUserCleanup } from "../jobs/unverifiedUserCleanup";
import { runStaleStockCleanup } from "../jobs/cleanupStaleStocks";
import { runTickerDailyBriefGeneration } from "../jobs/generateTickerDailyBriefs";
import { QUEUE_NAMES } from "./queues";

/**
 * Job processor registry
 * Maps queue names to their processor functions
 */
export const jobProcessors: Record<string, (job: Job, storage: IStorage) => Promise<void>> = {
  [QUEUE_NAMES.PRICE_UPDATE]: async (job, storage) => {
    await runPriceUpdate(storage);
  },
  [QUEUE_NAMES.CANDLESTICK_DATA]: async (job, storage) => {
    await runCandlestickDataFetch(storage);
  },
  [QUEUE_NAMES.HOLDINGS_PRICE_HISTORY]: async (job, storage) => {
    await runHoldingsPriceHistoryUpdate(storage);
  },
  [QUEUE_NAMES.TELEGRAM_FETCH]: async (job, storage) => {
    await runTelegramFetch(storage);
  },
  [QUEUE_NAMES.OPENINSIDER_FETCH]: async (job, storage) => {
    await runOpeninsiderFetch(storage);
  },
  [QUEUE_NAMES.RECOMMENDATION_CLEANUP]: async (job, storage) => {
    await runRecommendationCleanup(storage);
  },
  [QUEUE_NAMES.SIMULATED_RULE_EXECUTION]: async (job, storage) => {
    await runSimulatedRuleExecution(storage);
  },
  [QUEUE_NAMES.AI_ANALYSIS]: async (job, storage) => {
    await runAIAnalysis(storage);
  },
  [QUEUE_NAMES.ANALYSIS_RECONCILIATION]: async (job, storage) => {
    await runAnalysisReconciliation(storage);
  },
  [QUEUE_NAMES.DAILY_BRIEF]: async (job, storage) => {
    await runDailyBriefGeneration(storage);
  },
  [QUEUE_NAMES.UNVERIFIED_USER_CLEANUP]: async (job, storage) => {
    await runUnverifiedUserCleanup(storage);
  },
  [QUEUE_NAMES.CLEANUP_STALE_STOCKS]: async (job, storage) => {
    await runStaleStockCleanup(storage);
  },
  [QUEUE_NAMES.TICKER_DAILY_BRIEF]: async (job, storage) => {
    await runTickerDailyBriefGeneration(storage);
  },
};

