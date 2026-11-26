import { createRoot } from "react-dom/client";
import "../src/styles/globals.css";
import { HomePrototype } from "../src/components/HomePrototype";

createRoot(document.getElementById("root")!).render(<HomePrototype assetBase="./" />);
