/**
 * Type definitions for landing route
 * React Router v7 type definitions
 */

export interface Route {
  MetaArgs: {};
  LoaderArgs: {
    context: any;
  };
  ActionArgs: {
    request: Request;
    context: any;
  };
  ComponentProps: {
    loaderData: any;
    actionData?: any;
  };
}