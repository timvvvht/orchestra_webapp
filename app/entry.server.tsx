// Minimal server entry stub for React Router dev mode
// This file is required by React Router even with ssr: false
// It will not be used in production since ssr: false

export default function handleRequest() {
  throw new Error('SSR is disabled - this should not be called');
}