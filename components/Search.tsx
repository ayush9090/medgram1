import React from 'react';

const CATEGORIES = ['Cardiology', 'Neurology', 'Pathology', 'Surgery', 'Pediatrics', 'Radiology', 'Oncology', 'Emergency'];
const EXPLORE_IMAGES = [
    'https://picsum.photos/seed/med1/300/300', 'https://picsum.photos/seed/med2/300/300', 
    'https://picsum.photos/seed/med3/300/300', 'https://picsum.photos/seed/med4/300/300',
    'https://picsum.photos/seed/med5/300/300', 'https://picsum.photos/seed/med6/300/300',
    'https://picsum.photos/seed/med7/300/300', 'https://picsum.photos/seed/med8/300/300',
    'https://picsum.photos/seed/med9/300/300', 'https://picsum.photos/seed/med10/300/300',
    'https://picsum.photos/seed/med11/300/300', 'https://picsum.photos/seed/med12/300/300',
];

export const Search: React.FC = () => {
  return (
    <div className="bg-white min-h-full pb-20">
      {/* Search Input */}
      <div className="p-3 sticky top-0 bg-white z-10">
        <div className="bg-gray-100 rounded-lg flex items-center px-3 py-2">
            <svg className="text-gray-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
                type="text" 
                placeholder="Search" 
                className="bg-transparent border-none outline-none text-sm ml-2 flex-1"
                onClick={() => {}} 
            />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto px-3 pb-3 no-scrollbar">
        {CATEGORIES.map(cat => (
            <button key={cat} className="whitespace-nowrap px-4 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50 active:bg-gray-100">
                {cat}
            </button>
        ))}
      </div>

      {/* Explore Grid */}
      <div className="grid grid-cols-3 gap-0.5">
          {EXPLORE_IMAGES.map((img, idx) => (
             <div key={idx} className={`relative bg-gray-200 cursor-pointer ${idx % 7 === 0 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1 aspect-square'}`}>
                 <img src={img} alt="explore" className="w-full h-full object-cover" loading="lazy" />
                 {idx % 7 === 0 && (
                     <div className="absolute top-2 right-2 text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                     </div>
                 )}
             </div>
          ))}
      </div>
    </div>
  );
};