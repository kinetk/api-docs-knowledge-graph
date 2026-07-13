import { Bezel } from "./bezel";
import { VoiceLegend } from "./voice-legend";

export function ShareOfVoice() {
  return (
    <div className="grid grid-cols-[300px_1fr] items-center gap-14 max-[820px]:grid-cols-1 max-[820px]:justify-items-center">
      <Bezel />
      <VoiceLegend />
    </div>
  );
}
