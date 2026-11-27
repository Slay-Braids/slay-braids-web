import { createRoot } from "react-dom/client";
import "../src/styles/globals.css";
import { ChaptersPage } from "../src/components/chapters/ChaptersPage";

createRoot(document.getElementById("root")!).render(<ChaptersPage assetBase="./" />);
