import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";
import routes from "./routes";

const router = createBrowserRouter(routes);

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});