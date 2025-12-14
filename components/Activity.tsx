import React from 'react';

const NOTIFICATIONS = [
    { id: 1, type: 'like', user: 'dr.cardio', avatar: 'https://picsum.photos/seed/cardio/100/100', text: 'liked your video.', time: '2m' },
    { id: 2, type: 'follow', user: 'neuro_nomad', avatar: 'https://picsum.photos/seed/neuro/100/100', text: 'started following you.', time: '1h' },
    { id: 3, type: 'comment', user: 'anatomy_pro', avatar: 'https://picsum.photos/seed/ana/100/100', text: 'commented: "Great insight!"', time: '3h' },
    { id: 4, type: 'like', user: 'pathology_lab', avatar: 'https://picsum.photos/seed/path/100/100', text: 'liked your thread.', time: '5h' },
    { id: 5, type: 'like', user: 'er_life', avatar: 'https://picsum.photos/seed/er/100/100', text: 'liked your video.', time: '1d' },
    { id: 6, type: 'follow', user: 'med_student_101', avatar: 'https://picsum.photos/seed/student/100/100', text: 'started following you.', time: '2d' },
];

export const Activity: React.FC = () => {
  return (
    <div className="bg-white min-h-full pb-20">
      <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h1 className="font-bold text-xl">Activity</h1>
      </div>

      <div className="mt-2">
        {NOTIFICATIONS.map(notif => (
            <div key={notif.id} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <div className="relative">
                     <img src={notif.avatar} alt={notif.user} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                     {notif.type === 'like' && <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>}
                     {notif.type === 'follow' && <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>}
                     {notif.type === 'comment' && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>}
                </div>
                <div className="ml-3 flex-1 text-sm">
                    <span className="font-semibold text-gray-900">{notif.user}</span>
                    <span className="text-gray-600"> {notif.text}</span>
                    <span className="text-gray-400 text-xs ml-1">{notif.time}</span>
                </div>
                {notif.type === 'follow' ? (
                    <button className="ml-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded-lg">
                        Following
                    </button>
                ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg ml-2"></div> // Placeholder for post thumb
                )}
            </div>
        ))}
      </div>
    </div>
  );
};