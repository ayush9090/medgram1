import React from 'react';

const STORIES = [
  { id: 's1', username: 'Your Story', img: 'https://picsum.photos/seed/me/100/100', isUser: true },
  { id: 's2', username: 'dr.cardio', img: 'https://picsum.photos/seed/cardio/100/100' },
  { id: 's3', username: 'neuro_no...', img: 'https://picsum.photos/seed/neuro/100/100' },
  { id: 's4', username: 'anatomy...', img: 'https://picsum.photos/seed/ana/100/100' },
  { id: 's5', username: 'pathology', img: 'https://picsum.photos/seed/path/100/100' },
  { id: 's6', username: 'er_life', img: 'https://picsum.photos/seed/er/100/100' },
];

export const StoriesBar: React.FC = () => {
  return (
    <div className="flex gap-4 overflow-x-auto p-4 bg-white border-b border-gray-100 no-scrollbar">
      {STORIES.map((story) => (
        <div key={story.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
          <div className={`w-16 h-16 rounded-full p-[2px] ${story.isUser ? 'border-gray-200' : 'bg-gradient-to-tr from-yellow-400 to-purple-600'}`}>
            <div className="bg-white p-[2px] rounded-full w-full h-full">
              <img 
                src={story.img} 
                alt={story.username} 
                className="w-full h-full rounded-full object-cover"
              />
              {story.isUser && (
                <div className="absolute bottom-6 right-0 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center border-2 border-white translate-x-1 translate-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
              )}
            </div>
          </div>
          <span className="text-xs mt-1 text-gray-700 truncate w-16 text-center">
            {story.username}
          </span>
        </div>
      ))}
    </div>
  );
};