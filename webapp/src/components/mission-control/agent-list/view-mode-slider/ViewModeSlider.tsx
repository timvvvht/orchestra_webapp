import { useMissionControlStore } from "@/stores/missionControlStore";
import ViewModeSliderOption from "./ViewModeSliderOption";
import { ViewModeOption } from "../../AgentListPanel";
import { Archive } from "lucide-react";

const VIEW_MODES: ViewModeOption[] = [
  { title: "Active", slug: "active" },
  {
    title: "Archived",
    slug: "archived",
    icon: <Archive className="w-3 h-3" />,
  },
];

const ViewModeSlider: React.FC = () => {
  const { setViewMode } = useMissionControlStore();
  return (
    <div className="flex items-center bg-white/[0.02] backdrop-blur-sm rounded-lg p-0.5 border border-white/[0.06]">
      {VIEW_MODES.map((vm: ViewModeOption) => {
        return (
          <ViewModeSliderOption
            key={vm.slug}
            onClick={() => setViewMode(vm.slug)}
            active={useMissionControlStore.getState().viewMode === vm.slug}
            ViewModeOption={vm}
          />
        );
      })}
    </div>
  );
};

export default ViewModeSlider;
