import { PyhopperFlowCanvas } from "@/components/flow/PyhopperFlowCanvas";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { FloatingPanel } from "@/components/ui/FloatingPanel";

export default function Home() {
  return (
    <main className="app-shell">
      <SceneCanvas />
      <div className="app-overlay">
        <div className="app-hud">
          <p>Pyhopper Web</p>
          <span>Three.js viewport + XYFlow canvas</span>
        </div>
        <FloatingPanel>
          <PyhopperFlowCanvas />
        </FloatingPanel>
      </div>
    </main>
  );
}
