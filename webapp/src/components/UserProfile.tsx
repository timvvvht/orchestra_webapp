import React from "react";
import { useAuth } from "../auth/AuthContext";

const UserProfile: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (import.meta.env.PROD == true) return <></>;

  if (!isAuthenticated) {
    return (
      <div className=" top-0 left-0 right-0 z-40 bg-white/10 border-b border-white/10 text-white flex items-center">
        <div className="h-10 px-4 flex items-center text-sm max-w-screen-2xl mx-auto">
          Not Logged In
        </div>
      </div>
    );
  }

  return (
    <div className=" top-0 left-0 right-0 z-40 bg-white/10 border-b border-white/10 text-white flex items-center">
      <div className="h-10 px-4 flex items-center text-sm max-w-screen-2xl mx-auto">
        <strong>Logged in as:</strong>{" "}
        {user.email || user.name || "Unknown User"}
      </div>
    </div>
  );
};

export default UserProfile;
