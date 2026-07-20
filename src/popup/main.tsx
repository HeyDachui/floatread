import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../shared/page.css";

export function PopupApp(): React.JSX.Element {
  return (
    <main>
      <h1>FloatRead 浮读</h1>
      <p>项目基础已就绪，完整控制台将在后续阶段启用。</p>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PopupApp />
    </StrictMode>,
  );
}
