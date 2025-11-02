CREATE TABLE "backtest_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"data_source" text DEFAULT 'telegram' NOT NULL,
	"message_count" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"error_message" text,
	"candidate_stocks" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "backtest_price_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"ticker" text NOT NULL,
	"insider_buy_date" text NOT NULL,
	"price_matrix" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "backtest_scenarios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"scenario_number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sell_conditions" jsonb NOT NULL,
	"sell_action" jsonb NOT NULL,
	"total_profit_loss" numeric(12, 2) NOT NULL,
	"total_profit_loss_percent" numeric(10, 2) NOT NULL,
	"win_rate" numeric(5, 2),
	"number_of_trades" integer NOT NULL,
	"trade_details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "backtests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"rule_id" varchar,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"initial_capital" numeric(12, 2) NOT NULL,
	"final_value" numeric(12, 2) NOT NULL,
	"total_return" numeric(10, 2) NOT NULL,
	"total_return_percent" numeric(10, 2) NOT NULL,
	"number_of_trades" integer NOT NULL,
	"win_rate" numeric(5, 2),
	"best_trade" numeric(12, 2),
	"worst_trade" numeric(12, 2),
	"trade_log" jsonb,
	"equity_curve" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ibkr_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway_url" text DEFAULT 'https://localhost:5000' NOT NULL,
	"account_id" text,
	"is_connected" boolean DEFAULT false NOT NULL,
	"is_paper_trading" boolean DEFAULT true NOT NULL,
	"last_connection_check" timestamp,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "openinsider_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"fetch_limit" integer DEFAULT 50 NOT NULL,
	"fetch_interval" text DEFAULT 'hourly' NOT NULL,
	"fetch_previous_day_only" boolean DEFAULT false NOT NULL,
	"insider_titles" text[],
	"min_transaction_value" integer,
	"last_sync" timestamp,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "portfolio_holdings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"quantity" integer NOT NULL,
	"average_purchase_price" numeric(12, 2) NOT NULL,
	"current_value" numeric(12, 2),
	"profit_loss" numeric(12, 2),
	"profit_loss_percent" numeric(10, 2),
	"is_simulated" boolean DEFAULT false NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rule_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"action_order" integer NOT NULL,
	"action_type" text NOT NULL,
	"quantity" integer,
	"percentage" numeric(5, 2),
	"allow_repeat" boolean DEFAULT false NOT NULL,
	"cooldown_minutes" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rule_condition_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" varchar NOT NULL,
	"group_order" integer NOT NULL,
	"junction_operator" text,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rule_conditions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"metric" text NOT NULL,
	"comparator" text NOT NULL,
	"threshold" numeric(12, 4) NOT NULL,
	"timeframe_value" integer,
	"timeframe_unit" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rule_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" varchar NOT NULL,
	"ticker" text NOT NULL,
	"holding_id" varchar,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"conditions_met" jsonb NOT NULL,
	"actions_executed" jsonb NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "stock_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"user_id" varchar NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_interests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"company_name" text NOT NULL,
	"current_price" numeric(12, 2) NOT NULL,
	"previous_close" numeric(12, 2),
	"insider_price" numeric(12, 2),
	"insider_quantity" integer,
	"insider_trade_date" text,
	"insider_name" text,
	"insider_title" text,
	"market_price_at_insider_date" numeric(12, 2),
	"market_cap" text,
	"pe_ratio" numeric(10, 2),
	"recommendation" text,
	"recommendation_status" text DEFAULT 'pending',
	"source" text,
	"confidence_score" integer,
	"price_history" jsonb DEFAULT '[]'::jsonb,
	"candlesticks" jsonb DEFAULT '[]'::jsonb,
	"description" text,
	"industry" text,
	"country" text,
	"web_url" text,
	"ipo" text,
	"news" jsonb DEFAULT '[]'::jsonb,
	"insider_sentiment_mspr" numeric(10, 4),
	"insider_sentiment_change" numeric(10, 4),
	"last_updated" timestamp DEFAULT now(),
	"rejected_at" timestamp,
	CONSTRAINT "stocks_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "telegram_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_username" text NOT NULL,
	"session_string" text,
	"phone_number" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync" timestamp,
	"last_message_id" integer
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"broker" text DEFAULT 'manual',
	"ibkr_order_id" text,
	"is_simulated" boolean DEFAULT false NOT NULL,
	"executed_at" timestamp DEFAULT now(),
	"n8n_workflow_id" text
);
--> statement-breakpoint
CREATE TABLE "trading_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"scope" text DEFAULT 'all_holdings' NOT NULL,
	"ticker" text,
	"priority" integer DEFAULT 1000 NOT NULL,
	"conditions" jsonb,
	"action" text,
	"action_params" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_color" text DEFAULT '#3b82f6' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "rule_actions" ADD CONSTRAINT "rule_actions_group_id_rule_condition_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."rule_condition_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_condition_groups" ADD CONSTRAINT "rule_condition_groups_rule_id_trading_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."trading_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_group_id_rule_condition_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."rule_condition_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_executions" ADD CONSTRAINT "rule_executions_rule_id_trading_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."trading_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_comments" ADD CONSTRAINT "stock_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_interests" ADD CONSTRAINT "stock_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;