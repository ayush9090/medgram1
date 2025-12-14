import React from 'react';

const CONVERSATIONS = [
  { id: '1', username: 'dr_house', avatar: 'https://picsum.photos/seed/house/100/100', lastMsg: 'It\'s not lupus.', time: '2m', unread: true },
  { id: '2', username: 'nurse_jackie', avatar: 'https://picsum.photos/seed/jackie/100/100', lastMsg: 'Can you cover my shift?', time: '1h', unread: false },
  { id: '3', username: 'pathology_lab', avatar: 'https://picsum.photos/seed/path/100/100', lastMsg: 'Biopsy results are ready.', time: '3h', unread: true },
  { id: '4', username: 'neuro_nomad', avatar: 'https://picsum.photos/seed/neuro/100/100', lastMsg: 'Sent a reel by dr.cardio', time: '5h', unread: false },
  { id: '5', username: 'med_student_john', avatar: 'https://picsum.photos/seed/jd/100/100', lastMsg: 'Where is the rounding list?', time: '1d', unread: false },
  { id: '6', username: 'dr_strange', avatar: 'https://picsum.photos/seed/strange/100/100', lastMsg: 'Consult required in ER.', time: '2d', unread: false },
];

interface MessagesProps {
  onBack: () => void;
}

export const Messages: React.FC<MessagesProps> = ({ onBack }) => {
  return (
    <div className="bg-white min-h-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <h1 className="font-bold text-lg flex items-center gap-1">
                Direct 
                <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </h1>
        </div>
        <button>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="bg-gray-100 rounded-lg flex items-center px-3 py-2">
            <svg className="text-gray-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
                type="text" 
                placeholder="Search" 
                className="bg-transparent border-none outline-none text-sm ml-2 flex-1"
            />
        </div>
      </div>

      {/* Messages List */}
      <div className="px-2">
          {CONVERSATIONS.map(chat => (
              <div key={chat.id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer active:bg-gray-100 transition-colors" onClick={() => alert(`Chat with ${chat.username} opened`)}>
                  <div className="relative">
                      <img src={chat.avatar} alt={chat.username} className="w-12 h-12 rounded-full object-cover" />
                      {chat.unread && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                      <h3 className={`text-sm ${chat.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{chat.username}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                          <p className={`truncate ${chat.unread ? 'font-semibold text-gray-900' : ''}`}>{chat.lastMsg}</p>
                          <span>·</span>
                          <span>{chat.time}</span>
                      </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </button>
              </div>
          ))}
      </div>
    </div>
  );
};