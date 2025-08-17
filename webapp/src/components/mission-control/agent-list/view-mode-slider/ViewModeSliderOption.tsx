import React from "react";
import { ViewModeOption } from "../../AgentListPanel";

interface ViewModeSliderOptionProps {
  ViewModeOption: ViewModeOption;
  onClick: () => void;
  active: boolean;
}

const ViewModeSliderOption: React.FC<ViewModeSliderOptionProps> = ({
  ViewModeOption,
  onClick = () => {},
  active = false,
}: ViewModeSliderOptionProps) => {
  return (
    <button
      onClick={() => onClick()}
      className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-1.5
                    ${
                      active
                        ? "bg-white/[0.08] text-white/90 shadow-sm"
                        : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
                    }
                  `}
    >
      {ViewModeOption.icon}
      {ViewModeOption.title}
    </button>
  );
};

export default ViewModeSliderOption;
