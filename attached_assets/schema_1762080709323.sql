--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_analysis_jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_analysis_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    source text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    scheduled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_analysis_jobs OWNER TO neondb_owner;

--
-- Name: backtest_jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backtest_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    message_count integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    progress integer DEFAULT 0,
    error_message text,
    candidate_stocks jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    data_source text DEFAULT 'telegram'::text NOT NULL,
    user_id character varying
);


ALTER TABLE public.backtest_jobs OWNER TO neondb_owner;

--
-- Name: backtest_price_data; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backtest_price_data (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    job_id character varying NOT NULL,
    ticker text NOT NULL,
    insider_buy_date text NOT NULL,
    price_matrix jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.backtest_price_data OWNER TO neondb_owner;

--
-- Name: backtest_scenarios; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backtest_scenarios (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    job_id character varying NOT NULL,
    scenario_number integer NOT NULL,
    name text NOT NULL,
    description text,
    total_profit_loss numeric(12,2) NOT NULL,
    total_profit_loss_percent numeric(10,2) NOT NULL,
    win_rate numeric(5,2),
    number_of_trades integer NOT NULL,
    trade_details jsonb,
    created_at timestamp without time zone DEFAULT now(),
    sell_conditions jsonb NOT NULL,
    sell_action jsonb NOT NULL
);


ALTER TABLE public.backtest_scenarios OWNER TO neondb_owner;

--
-- Name: backtests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.backtests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    rule_id character varying,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    initial_capital numeric(12,2) NOT NULL,
    final_value numeric(12,2) NOT NULL,
    total_return numeric(10,2) NOT NULL,
    total_return_percent numeric(10,2) NOT NULL,
    number_of_trades integer NOT NULL,
    win_rate numeric(5,2),
    best_trade numeric(12,2),
    worst_trade numeric(12,2),
    trade_log jsonb,
    equity_curve jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.backtests OWNER TO neondb_owner;

--
-- Name: ibkr_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ibkr_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    gateway_url text DEFAULT 'https://localhost:5000'::text NOT NULL,
    account_id text,
    is_connected boolean DEFAULT false NOT NULL,
    is_paper_trading boolean DEFAULT true NOT NULL,
    last_connection_check timestamp without time zone,
    last_error text,
    user_id character varying
);


ALTER TABLE public.ibkr_config OWNER TO neondb_owner;

--
-- Name: macro_analyses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.macro_analyses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    macro_score integer,
    macro_factor numeric(5,2),
    summary text,
    sp500_level numeric(12,2),
    sp500_change numeric(10,2),
    sp500_trend text,
    vix_level numeric(10,2),
    vix_interpretation text,
    economic_indicators jsonb,
    sector_performance jsonb,
    market_condition text,
    market_phase text,
    risk_appetite text,
    key_themes jsonb,
    opportunities jsonb,
    risks jsonb,
    recommendation text,
    analyzed_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    industry text
);


ALTER TABLE public.macro_analyses OWNER TO neondb_owner;

--
-- Name: openinsider_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.openinsider_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    fetch_limit integer DEFAULT 50 NOT NULL,
    last_sync timestamp without time zone,
    last_error text,
    fetch_interval text DEFAULT 'hourly'::text NOT NULL,
    fetch_previous_day_only boolean DEFAULT false NOT NULL,
    insider_titles text[],
    min_transaction_value integer,
    user_id character varying
);


ALTER TABLE public.openinsider_config OWNER TO neondb_owner;

--
-- Name: portfolio_holdings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.portfolio_holdings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    quantity integer NOT NULL,
    average_purchase_price numeric(12,2) NOT NULL,
    current_value numeric(12,2),
    profit_loss numeric(12,2),
    profit_loss_percent numeric(10,2),
    last_updated timestamp without time zone DEFAULT now(),
    is_simulated boolean DEFAULT false NOT NULL,
    user_id character varying
);


ALTER TABLE public.portfolio_holdings OWNER TO neondb_owner;

--
-- Name: rule_actions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rule_actions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    rule_id character varying NOT NULL,
    action_order integer NOT NULL,
    action_type text NOT NULL,
    quantity integer,
    percentage numeric(5,2),
    allow_repeat boolean DEFAULT false NOT NULL,
    cooldown_minutes integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rule_actions OWNER TO neondb_owner;

--
-- Name: rule_condition_groups; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rule_condition_groups (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    rule_id character varying NOT NULL,
    group_order integer NOT NULL,
    junction_operator text,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rule_condition_groups OWNER TO neondb_owner;

--
-- Name: rule_conditions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rule_conditions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    group_id character varying NOT NULL,
    metric text NOT NULL,
    comparator text NOT NULL,
    threshold numeric(12,4) NOT NULL,
    timeframe_value integer,
    timeframe_unit text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rule_conditions OWNER TO neondb_owner;

--
-- Name: rule_executions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rule_executions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    rule_id character varying NOT NULL,
    ticker text NOT NULL,
    holding_id character varying,
    triggered_at timestamp without time zone DEFAULT now() NOT NULL,
    conditions_met jsonb NOT NULL,
    actions_executed jsonb NOT NULL,
    success boolean NOT NULL,
    error_message text
);


ALTER TABLE public.rule_executions OWNER TO neondb_owner;

--
-- Name: stock_analyses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stock_analyses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    overall_rating text,
    confidence_score integer,
    summary text,
    financial_health_score integer,
    strengths jsonb,
    weaknesses jsonb,
    red_flags jsonb,
    key_metrics jsonb,
    risks jsonb,
    opportunities jsonb,
    recommendation text,
    analyzed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'completed'::text,
    error_message text,
    technical_analysis_score integer,
    technical_analysis_trend text,
    technical_analysis_momentum text,
    technical_analysis_signals jsonb,
    sentiment_analysis_score integer,
    sentiment_analysis_trend text,
    sentiment_analysis_news_volume text,
    sentiment_analysis_key_themes jsonb,
    sec_filing_url text,
    sec_filing_type text,
    sec_filing_date text,
    sec_cik text,
    management_discussion text,
    risk_factors text,
    business_overview text,
    fundamental_data jsonb,
    fundamental_analysis text,
    macro_analysis_id character varying,
    integrated_score integer,
    score_adjustment text,
    CONSTRAINT stock_analyses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'analyzing'::text, 'completed'::text, 'failed'::text])))
);


ALTER TABLE public.stock_analyses OWNER TO neondb_owner;

--
-- Name: stock_comments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stock_comments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    user_id character varying NOT NULL,
    comment text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_comments OWNER TO neondb_owner;

--
-- Name: stock_interests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stock_interests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_interests OWNER TO neondb_owner;

--
-- Name: stock_views; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stock_views (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    user_id character varying NOT NULL,
    viewed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_views OWNER TO neondb_owner;

--
-- Name: stocks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stocks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    company_name text NOT NULL,
    current_price numeric(12,2) NOT NULL,
    previous_close numeric(12,2),
    market_cap text,
    pe_ratio numeric(10,2),
    recommendation text,
    recommendation_status text DEFAULT 'pending'::text,
    confidence_score integer,
    price_history jsonb DEFAULT '[]'::jsonb,
    last_updated timestamp without time zone DEFAULT now(),
    insider_price numeric(12,2),
    insider_quantity integer,
    insider_trade_date text,
    industry text,
    country text,
    web_url text,
    ipo text,
    news jsonb DEFAULT '[]'::jsonb,
    description text,
    market_price_at_insider_date numeric(12,2),
    insider_sentiment_mspr numeric(10,4),
    insider_sentiment_change numeric(10,4),
    source text,
    insider_name text,
    insider_title text,
    candlesticks jsonb DEFAULT '[]'::jsonb,
    rejected_at timestamp without time zone
);


ALTER TABLE public.stocks OWNER TO neondb_owner;

--
-- Name: telegram_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.telegram_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    channel_username text NOT NULL,
    session_string text,
    phone_number text,
    enabled boolean DEFAULT true NOT NULL,
    last_sync timestamp without time zone,
    last_message_id integer,
    user_id character varying
);


ALTER TABLE public.telegram_config OWNER TO neondb_owner;

--
-- Name: trades; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trades (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    type text NOT NULL,
    quantity integer NOT NULL,
    price numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    executed_at timestamp without time zone DEFAULT now(),
    n8n_workflow_id text,
    broker text DEFAULT 'manual'::text,
    ibkr_order_id text,
    is_simulated boolean DEFAULT false NOT NULL,
    user_id character varying
);


ALTER TABLE public.trades OWNER TO neondb_owner;

--
-- Name: trading_rules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trading_rules (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    scope text DEFAULT 'all_holdings'::text NOT NULL,
    ticker text,
    conditions jsonb,
    action text,
    action_params jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    priority integer DEFAULT 1000 NOT NULL,
    user_id character varying
);


ALTER TABLE public.trading_rules OWNER TO neondb_owner;

--
-- Name: user_stock_statuses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_stock_statuses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    ticker text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    dismissed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_stock_statuses OWNER TO neondb_owner;

--
-- Name: user_tutorials; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_tutorials (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    tutorial_id character varying NOT NULL,
    completed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_tutorials OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    avatar_color text DEFAULT '#3b82f6'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: ai_analysis_jobs ai_analysis_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_analysis_jobs
    ADD CONSTRAINT ai_analysis_jobs_pkey PRIMARY KEY (id);


--
-- Name: backtest_jobs backtest_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.backtest_jobs
    ADD CONSTRAINT backtest_jobs_pkey PRIMARY KEY (id);


--
-- Name: backtest_price_data backtest_price_data_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.backtest_price_data
    ADD CONSTRAINT backtest_price_data_pkey PRIMARY KEY (id);


--
-- Name: backtest_scenarios backtest_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.backtest_scenarios
    ADD CONSTRAINT backtest_scenarios_pkey PRIMARY KEY (id);


--
-- Name: backtests backtests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.backtests
    ADD CONSTRAINT backtests_pkey PRIMARY KEY (id);


--
-- Name: ibkr_config ibkr_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ibkr_config
    ADD CONSTRAINT ibkr_config_pkey PRIMARY KEY (id);


--
-- Name: macro_analyses macro_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.macro_analyses
    ADD CONSTRAINT macro_analyses_pkey PRIMARY KEY (id);


--
-- Name: openinsider_config openinsider_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.openinsider_config
    ADD CONSTRAINT openinsider_config_pkey PRIMARY KEY (id);


--
-- Name: portfolio_holdings portfolio_holdings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.portfolio_holdings
    ADD CONSTRAINT portfolio_holdings_pkey PRIMARY KEY (id);


--
-- Name: rule_actions rule_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_actions
    ADD CONSTRAINT rule_actions_pkey PRIMARY KEY (id);


--
-- Name: rule_condition_groups rule_condition_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_condition_groups
    ADD CONSTRAINT rule_condition_groups_pkey PRIMARY KEY (id);


--
-- Name: rule_conditions rule_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_conditions
    ADD CONSTRAINT rule_conditions_pkey PRIMARY KEY (id);


--
-- Name: rule_executions rule_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_executions
    ADD CONSTRAINT rule_executions_pkey PRIMARY KEY (id);


--
-- Name: stock_analyses stock_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_analyses
    ADD CONSTRAINT stock_analyses_pkey PRIMARY KEY (id);


--
-- Name: stock_analyses stock_analyses_ticker_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_analyses
    ADD CONSTRAINT stock_analyses_ticker_key UNIQUE (ticker);


--
-- Name: stock_comments stock_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_comments
    ADD CONSTRAINT stock_comments_pkey PRIMARY KEY (id);


--
-- Name: stock_interests stock_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_interests
    ADD CONSTRAINT stock_interests_pkey PRIMARY KEY (id);


--
-- Name: stock_interests stock_interests_ticker_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_interests
    ADD CONSTRAINT stock_interests_ticker_user_id_key UNIQUE (ticker, user_id);


--
-- Name: stock_views stock_views_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_views
    ADD CONSTRAINT stock_views_pkey PRIMARY KEY (id);


--
-- Name: stocks stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);


--
-- Name: stocks stocks_ticker_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_ticker_unique UNIQUE (ticker);


--
-- Name: telegram_config telegram_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.telegram_config
    ADD CONSTRAINT telegram_config_pkey PRIMARY KEY (id);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: trading_rules trading_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trading_rules
    ADD CONSTRAINT trading_rules_pkey PRIMARY KEY (id);


--
-- Name: user_stock_statuses user_stock_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_stock_statuses
    ADD CONSTRAINT user_stock_statuses_pkey PRIMARY KEY (id);


--
-- Name: user_stock_statuses user_stock_statuses_user_id_ticker_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_stock_statuses
    ADD CONSTRAINT user_stock_statuses_user_id_ticker_key UNIQUE (user_id, ticker);


--
-- Name: user_tutorials user_tutorials_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_tutorials
    ADD CONSTRAINT user_tutorials_pkey PRIMARY KEY (id);


--
-- Name: user_tutorials user_tutorials_user_id_tutorial_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_tutorials
    ADD CONSTRAINT user_tutorials_user_id_tutorial_id_key UNIQUE (user_id, tutorial_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_analysis_jobs_queue_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_analysis_jobs_queue_idx ON public.ai_analysis_jobs USING btree (status, priority, scheduled_at) WHERE (status = 'pending'::text);


--
-- Name: ai_analysis_jobs_ticker_active_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX ai_analysis_jobs_ticker_active_unique ON public.ai_analysis_jobs USING btree (ticker) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));


--
-- Name: backtest_jobs backtest_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.backtest_jobs
    ADD CONSTRAINT backtest_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ibkr_config ibkr_config_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ibkr_config
    ADD CONSTRAINT ibkr_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: openinsider_config openinsider_config_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.openinsider_config
    ADD CONSTRAINT openinsider_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: portfolio_holdings portfolio_holdings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.portfolio_holdings
    ADD CONSTRAINT portfolio_holdings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rule_actions rule_actions_rule_id_trading_rules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_actions
    ADD CONSTRAINT rule_actions_rule_id_trading_rules_id_fk FOREIGN KEY (rule_id) REFERENCES public.trading_rules(id) ON DELETE CASCADE;


--
-- Name: rule_condition_groups rule_condition_groups_rule_id_trading_rules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_condition_groups
    ADD CONSTRAINT rule_condition_groups_rule_id_trading_rules_id_fk FOREIGN KEY (rule_id) REFERENCES public.trading_rules(id) ON DELETE CASCADE;


--
-- Name: rule_conditions rule_conditions_group_id_rule_condition_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_conditions
    ADD CONSTRAINT rule_conditions_group_id_rule_condition_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.rule_condition_groups(id) ON DELETE CASCADE;


--
-- Name: rule_executions rule_executions_rule_id_trading_rules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rule_executions
    ADD CONSTRAINT rule_executions_rule_id_trading_rules_id_fk FOREIGN KEY (rule_id) REFERENCES public.trading_rules(id) ON DELETE CASCADE;


--
-- Name: stock_analyses stock_analyses_macro_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_analyses
    ADD CONSTRAINT stock_analyses_macro_analysis_id_fkey FOREIGN KEY (macro_analysis_id) REFERENCES public.macro_analyses(id);


--
-- Name: stock_comments stock_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_comments
    ADD CONSTRAINT stock_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stock_interests stock_interests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_interests
    ADD CONSTRAINT stock_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stock_views stock_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stock_views
    ADD CONSTRAINT stock_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: telegram_config telegram_config_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.telegram_config
    ADD CONSTRAINT telegram_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trades trades_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trading_rules trading_rules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trading_rules
    ADD CONSTRAINT trading_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_tutorials user_tutorials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_tutorials
    ADD CONSTRAINT user_tutorials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

