import React from 'react';

interface Props { 
  date: Date; 
}

const DateSeparator: React.FC<Props> = ({ date }) => {
  // WhatsApp-style date label logic
  const today = new Date(); 
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today); 
  yesterday.setDate(yesterday.getDate() - 1);

  const label =
    date.getTime() === today.getTime()     ? 'Today'      :
    date.getTime() === yesterday.getTime() ? 'Yesterday'  :
    date.toLocaleDateString(undefined, {
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
    });

  return (
    <div className="flex justify-center my-6">
      <div className="px-3 py-1 rounded-full bg-white/[0.04] backdrop-blur-sm">
        <span className="text-xs font-medium text-white/40">{label}</span>
      </div>
    </div>
  );
};

export default DateSeparator;