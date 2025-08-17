import React from 'react';
import TeamDashboard from '@/components/TeamDashboard';
import PythonWorkerTestPage from '@/components/developer/PythonWorkerTest';


const HomePage: React.FC = () => {
  return (
    <div className="h-full w-full overflow-hidden">
      {/* <PythonWorkerTestPage /> */}
      <TeamDashboard
        teamName=""
        teamObjective=""
        initialViewMode="tasks"
      />
    </div>
  );
};

export default HomePage;