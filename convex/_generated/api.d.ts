/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bodyMeasurements from "../bodyMeasurements.js";
import type * as clientInvites from "../clientInvites.js";
import type * as coachClients from "../coachClients.js";
import type * as exercises from "../exercises.js";
import type * as http from "../http.js";
import type * as programAssignments from "../programAssignments.js";
import type * as programs from "../programs.js";
import type * as routines from "../routines.js";
import type * as traineeDashboard from "../traineeDashboard.js";
import type * as trainingResults from "../trainingResults.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bodyMeasurements: typeof bodyMeasurements;
  clientInvites: typeof clientInvites;
  coachClients: typeof coachClients;
  exercises: typeof exercises;
  http: typeof http;
  programAssignments: typeof programAssignments;
  programs: typeof programs;
  routines: typeof routines;
  traineeDashboard: typeof traineeDashboard;
  trainingResults: typeof trainingResults;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
