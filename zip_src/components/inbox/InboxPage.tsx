import React, { useState } from 'react';
import { PlusCircle, Tag, Link, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface InboxItem {
  id: string;
  content: string;
  timestamp: Date;
  tags?: string[];
  relatedNotes?: { id: string; title: string }[];
}

const mockInboxItems: InboxItem[] = [
  {
    id: '1',
    content: 'Research the impact of large language models on creative writing',
    timestamp: new Date(2024, 4, 14, 9, 30),
    tags: ['AI', 'Research', 'Writing'],
    relatedNotes: [
      { id: 'note1', title: 'AI Writing Assistants' },
      { id: 'note2', title: 'Creative Process Notes' }
    ]
  },
  {
    id: '2',
    content: 'Schedule meeting with design team about new UI components',
    timestamp: new Date(2024, 4, 14, 10, 15),
    tags: ['Meeting', 'Design', 'UI'],
    relatedNotes: [
      { id: 'note3', title: 'Design System Guidelines' }
    ]
  },
  {
    id: '3',
    content: 'Implement the new Timeline component for agent orchestration',
    timestamp: new Date(2024, 4, 14, 11, 45),
    tags: ['Development', 'UI', 'Agents'],
    relatedNotes: [
      { id: 'note4', title: 'Agent Orchestration Architecture' },
      { id: 'note5', title: 'Timeline Component Specs' }
    ]
  },
  {
    id: '4',
    content: 'Review feedback on the knowledge graph visualization',
    timestamp: new Date(2024, 4, 13, 15, 20),
    tags: ['Feedback', 'Visualization', 'Knowledge Graph'],
  },
];

const InboxPage: React.FC = () => {
  const [newNote, setNewNote] = useState('');
  const [items, setItems] = useState<InboxItem[]>(mockInboxItems);
  
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const newItem: InboxItem = {
      id: Date.now().toString(),
      content: newNote,
      timestamp: new Date(),
      tags: ['Inbox', 'Unprocessed']
    };
    
    setItems([newItem, ...items]);
    setNewNote('');
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-24 font-display font-semibold">Inbox</h1>
        <Button variant="ghost" size="icon-sm">
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-4">
        <div className="flex gap-2 mb-6">
          <Input 
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Capture a thought..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <Button onClick={handleAddNote}>Capture</Button>
        </div>
        
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
          {items.map((item) => (
            <Card key={item.id} className="p-4 card-interactive">
              <div className="flex justify-between items-start mb-2">
                <p className="text-16 font-medium">{item.content}</p>
                <div className="flex items-center text-12 text-neutral-500 dark:text-neutral-400 whitespace-nowrap ml-4">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  <span>{formatDate(item.timestamp)}</span>
                  <Clock className="h-3.5 w-3.5 ml-2 mr-1" />
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              </div>
              
              {item.tags && (
                <div className="flex items-center mt-3">
                  <Tag className="h-3.5 w-3.5 mr-2 text-neutral-500 dark:text-neutral-400" />
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 text-12 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-700 dark:text-neutral-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {item.relatedNotes && (
                <div className="flex items-center mt-2">
                  <Link className="h-3.5 w-3.5 mr-2 text-neutral-500 dark:text-neutral-400" />
                  <div className="flex flex-wrap gap-1">
                    {item.relatedNotes.map((note) => (
                      <span 
                        key={note.id} 
                        className="px-2 py-0.5 text-12 bg-brand-100/50 dark:bg-brand-900/20 rounded-full text-brand-700 dark:text-brand-300 cursor-pointer"
                      >
                        {note.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;