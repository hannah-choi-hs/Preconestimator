import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Variant1 } from "./pages/Variant1";
import { Variant2 } from "./pages/Variant2";
import { Variant3 } from "./pages/Variant3";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Variant1 },
      { path: "variant-1", Component: Variant1 },
      { path: "variant-2", Component: Variant2 },
      { path: "variant-3", Component: Variant3 },
    ],
  },
]);
