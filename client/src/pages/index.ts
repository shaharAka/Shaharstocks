/**
 * Lazy-loaded page components
 * This file exports all page components as lazy imports for code splitting
 */

import { lazy } from "react";

// Lazy load all page components for code splitting
export const Portfolio = lazy(() => import("./portfolio"));
export const Opportunities = lazy(() => import("./opportunities"));
export const Following = lazy(() => import("./following"));
export const InPosition = lazy(() => import("./in-position"));
export const Community = lazy(() => import("./community"));
export const FeatureSuggestions = lazy(() => import("./community-feature-suggestions"));
export const Trading = lazy(() => import("./trading"));
export const Settings = lazy(() => import("./settings"));
export const AdminPage = lazy(() => import("./admin"));
export const TickerDetail = lazy(() => import("./ticker-detail"));
export const Login = lazy(() => import("./login"));
export const Signup = lazy(() => import("./signup"));
export const Terms = lazy(() => import("./terms"));
export const VerifyEmail = lazy(() => import("./verify-email"));
export const NotFound = lazy(() => import("./not-found"));

