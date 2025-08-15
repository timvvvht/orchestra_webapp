/**
 * Type definitions for root route
 * React Router v7 type definitions
 */

export interface Route {
  LinksFunction: () => Array<{
    rel: string;
    href: string;
    crossOrigin?: string;
  }>;
}