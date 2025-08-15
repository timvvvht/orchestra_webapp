/**
 * Type definitions for home route
 * React Router v7 type definitions
 */

export interface Route {
  MetaArgs: {};
  LoaderArgs: {
    context: {
      cloudflare: {
        env: {
          VALUE_FROM_CLOUDFLARE: string;
        };
      };
    };
  };
  ComponentProps: {
    loaderData: {
      message: string;
    };
  };
}