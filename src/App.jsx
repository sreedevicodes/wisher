import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Search, Plus, X, LogOut, ArrowLeft, Edit2, Trash2, ExternalLink, GripVertical } from 'lucide-react';

// Exactly 50 Emojis across Animals, Flowers, Food, Objects
const EMOJIS = [
  '🐱','🐶','🦊','🐼','🐸','🐨','🐯','🦋','🐢','🦄','🐧','🦁','🐻','🐰','🐮',
  '🌸','🌺','🌻','🌹','🌷','💐','🌼','🪷',
  '🍓','🍰','🧁','🍩','🍦','🍒','🍪','🎂','🍫','🍬','🍭','🍇',
  '🎸','🎨','🎮','⭐','🌙','🎀','🔮','🪄','🎯','🎪','🎡','🎁','🏆','🎵','🪩'
];

const COLORS = ['#e8a4a4', '#a4c4a4', '#a4c4e8', '#c4a4e8', '#e8c4a4', '#e8e4a4', '#e8b4a0', '#a4e8d4'];
const CATEGORIES = ['Tech', 'Fashion', 'Books', 'Food', 'Travel', 'Hobby', 'Beauty', 'Home', 'Music', 'Other'];
const PRIORITIES = ['Must Have', 'Would Love', 'Nice to Have'];

const hashPin = (pin) => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString();
};

const GlobalStyles = () => (
  <style>{`
    :root { --bg: #fdfcf9; --text: #111; --shadow: rgba(0,0,0,0.06); }
    body { 
      margin: 0; padding: 0; background: var(--bg); color: var(--text); 
      font-family: 'Space Grotesk', sans-serif; -webkit-font-smoothing: antialiased; 
      background-image: linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
      background-size: 40px 40px; min-height: 100vh;
    }
    * { box-sizing: border-box; }
    button, input, select, textarea { font-family: inherit; }
    button { cursor: pointer; border: none; background: none; }
    a { color: inherit; text-decoration: none; }

    .navbar { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 2rem; background: rgba(253,252,249,0.9); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100; border-bottom: 2px solid rgba(0,0,0,0.05); gap: 1rem; flex-wrap: wrap; }
    .nav-tabs { display: flex; gap: 2rem; }
    .nav-tab { font-weight: 700; font-size: 1.1rem; color: #a0a0a0; transition: color 0.2s; padding: 0.5rem; }
    .nav-tab.active { color: #111; }
    .nav-tab:hover { color: #555; }
    
    .pill-btn { border-radius: 999px; padding: 0.75rem 1.5rem; font-weight: 700; font-size: 1.1rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; border: 2px solid transparent; }
    .pill-btn-outline { border: 2px solid #000; background: #fff; color: #000; box-shadow: 4px 4px 0 #000; }
    .pill-btn-outline:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #000; }
    .pill-btn-filled { background: var(--btn-color, #000); color: #fff; }
    .pill-btn-filled:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    
    .input-field { width: 100%; padding: 1rem 1.5rem; border-radius: 20px; border: 2px solid #eee; background: #f9f9f9; font-size: 1.1rem; transition: all 0.2s; outline: none; }
    .input-field:focus { border-color: #000; background: #fff; box-shadow: 4px 4px 0 #eee; }
    
    .editorial-header { font-size: 4rem; font-weight: 800; letter-spacing: -2px; text-align: center; margin-bottom: 3rem; margin-top: 2rem; color: #111; }
    
    .wish-card { background: #fff; border-radius: 24px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.05); border: 2px solid rgba(0,0,0,0.05); display: flex; gap: 1rem; transition: transform 0.2s; }
    .wish-card:hover { box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
    
    .user-card { background: #fff; border-radius: 32px; padding: 2.5rem 1rem; box-shadow: 0 12px 32px rgba(0,0,0,0.05); cursor: pointer; display: flex; flex-direction: column; align-items: center; transition: all 0.2s; border: 2px solid rgba(0,0,0,0.03); }
    .user-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); border-color: rgba(0,0,0,0.08); }
    
    .numpad-dot { width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ccc; transition: all 0.2s; }
    .numpad-dot.filled { background: #000; border-color: #000; transform: scale(1.2); }
    .num-key { width: 80px; height: 80px; border-radius: 50%; font-size: 2rem; font-weight: 700; background: #fff; border: 2px solid #eee; display: flex; align-items: center; justify-content: center; margin: 0 auto; transition: all 0.1s; color: #000; }
    .num-key:active { background: #f0f0f0; transform: scale(0.9); border-color: #ccc; }
    .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    @keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-6px, 0, 0); } 40%, 60% { transform: translate3d(6px, 0, 0); } }
    
    .modal-backdrop { position: fixed; inset: 0; background: rgba(253,252,249,0.95); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; overflow-y: auto; }
    .modal-content { background: #fff; border-radius: 40px; padding: 3rem; width: 100%; max-width: 440px; box-shadow: 0 24px 48px rgba(0,0,0,0.1); position: relative; border: 2px solid rgba(0,0,0,0.05); margin: auto; }
    
    .settings-card { background: #fff; border-radius: 32px; padding: 2rem; box-shadow: 0 12px 32px rgba(0,0,0,0.05); border: 2px solid rgba(0,0,0,0.03); margin-bottom: 2rem; }

    /* Mobile Responsive Overrides */
    @media (max-width: 768px) {
      .navbar { padding: 1rem; flex-direction: column; }
      .nav-tabs { width: 100%; justify-content: space-around; order: 3; margin-top: 0.5rem; gap: 0.5rem; }
      .nav-right { position: absolute; top: 1rem; right: 1rem; }
      .nav-logo { position: absolute; top: 1rem; left: 1rem; }
      .editorial-header { font-size: 2.5rem; margin-bottom: 2rem; }
      .pill-btn { padding: 0.6rem 1.2rem; font-size: 1rem; }
      .wish-card { padding: 1.25rem; flex-direction: column; }
      .wish-card h3 { font-size: 1.25rem; }
      .user-card { padding: 1.5rem 1rem; }
      .user-card h2 { font-size: 1.1rem; }
      .num-key { width: 70px; height: 70px; font-size: 1.75rem; }
      .modal-content { padding: 2rem; }
      .settings-card { padding: 1.5rem; }
    }
  `}</style>
);

export default function App() {
  const [users, setUsers] = useState([]);
  const [itemCounts, setItemCounts] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [viewedUser, setViewedUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const u = [];
      snap.forEach(d => u.push({ username: d.id, ...d.data() }));
      u.sort((a, b) => a.createdAt - b.createdAt);
      setUsers(u);
    });
    const saved = localStorage.getItem('wishr_session');
    if (saved) setCurrentUser(JSON.parse(saved));
    setIsReady(true);
    return unsub;
  }, []);

  useEffect(() => {
    const unsubs = users.map(u => 
      onSnapshot(collection(db, `wishlists/${u.username}/items`), snap => {
        setItemCounts(prev => ({...prev, [u.username]: snap.size}));
      })
    );
    return () => unsubs.forEach(fn => fn());
  }, [users]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('wishr_session', JSON.stringify(user));
    setActiveTab('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('wishr_session');
    setActiveTab('home');
  };

  if (!isReady) return null;

  if (!currentUser) {
    return (
      <>
        <GlobalStyles />
        <LandingScreen users={users} onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      
      {!viewedUser && (
        <Navbar 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          users={users} setViewedUser={setViewedUser} 
          currentUser={currentUser} onLogout={handleLogout} 
        />
      )}

      {viewedUser ? (
        <WishlistView user={viewedUser} onBack={() => setViewedUser(null)} />
      ) : (
        <main style={{minHeight: 'calc(100vh - 80px)', paddingBottom: '4rem'}}>
          {activeTab === 'home' && <HomeTab users={users.filter(u => u.username !== currentUser.username)} setViewedUser={setViewedUser} counts={itemCounts} />}
          {activeTab === 'my-wishes' && <MyWishesTab currentUser={currentUser} />}
          {activeTab === 'settings' && <SettingsTab currentUser={currentUser} users={users} onLogout={handleLogout} />}
        </main>
      )}
    </>
  );
}

// ---------------------- LANDING / ONBOARDING ----------------------
const LandingScreen = ({ users, onLogin }) => {
  const [view, setView] = useState('landing');
  const [targetUser, setTargetUser] = useState(null);

  if (view === 'create') {
    return (
      <div style={{minHeight: '100vh', padding: '2rem 1rem', display: 'flex', flexDirection: 'column'}}>
        <button onClick={() => setView('landing')} className="pill-btn pill-btn-outline" style={{alignSelf: 'flex-start', marginBottom: '2rem'}}><ArrowLeft size={16}/> Back</button>
        <div className="settings-card" style={{maxWidth: '500px', margin: '0 auto', width: '100%'}}>
           <h2 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center'}}>Create Profile</h2>
           <CreateProfileForm users={users} onSuccess={onLogin} />
        </div>
      </div>
    );
  }

  if (view === 'login-select') {
    return (
      <div style={{minHeight: '100vh', padding: '4rem 1rem'}}>
        <button onClick={() => setView('landing')} className="pill-btn pill-btn-outline" style={{marginBottom: '2rem', marginLeft: 'auto', marginRight: 'auto', display: 'block'}}><ArrowLeft size={16}/> Back</button>
        <h1 className="editorial-header" style={{marginTop: 0}}>Pick your profile</h1>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem', maxWidth: '800px', margin: '0 auto'}}>
           {users.map(u => (
             <div key={u.username} onClick={() => { setTargetUser(u); setView('login-pin'); }} className="user-card" style={{borderColor: u.accentColor}}>
               <div style={{fontSize: '3.5rem', marginBottom: '1rem', background: '#f9f9f9', width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{u.avatar}</div>
               <h2 style={{fontSize: '1.25rem', fontWeight: 800, margin: 0}}>{u.name}</h2>
             </div>
           ))}
           {users.length === 0 && (
             <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#888', fontWeight: 600, fontSize: '1.25rem'}}>No profiles exist yet. Please create one!</div>
           )}
        </div>
      </div>
    );
  }

  if (view === 'login-pin') {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'}}>
        <div className="settings-card" style={{maxWidth: '440px', width: '100%', position: 'relative'}}>
          <button onClick={() => setView('login-select')} style={{position: 'absolute', top: '1.5rem', left: '1.5rem', background: '#f5f5f5', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><ArrowLeft size={20}/></button>
          <PinAuth targetPin={targetUser.pin} title={`Welcome back, ${targetUser.name}`} subtitle="Enter your 4-digit PIN" onSuccess={() => onLogin(targetUser)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center'}}>
      <div style={{fontSize: '5rem', fontWeight: 800, letterSpacing: '-3px', color: '#111', lineHeight: 1}}>wishr.</div>
      <p style={{fontSize: '1.25rem', color: '#666', fontWeight: 600, marginTop: '1rem', marginBottom: '4rem'}}>your little corner for everything you want 🎁</p>
      <div style={{display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '280px'}}>
        <button onClick={() => setView('create')} className="pill-btn pill-btn-filled" style={{justifyContent: 'center', padding: '1.25rem', fontSize: '1.25rem', '--btn-color': '#111'}}>Create Profile</button>
        <button onClick={() => setView('login-select')} className="pill-btn pill-btn-outline" style={{justifyContent: 'center', padding: '1.25rem', fontSize: '1.25rem'}}>Log In</button>
      </div>
    </div>
  );
}

// ---------------------- NAVBAR ----------------------
const Navbar = ({ activeTab, setActiveTab, users, setViewedUser, currentUser, onLogout }) => {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const filteredUsers = search.trim() ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) && u.username !== currentUser.username) : [];

  return (
    <>
      {(showSearch || showProfile) && <div onClick={() => { setShowSearch(false); setShowProfile(false); }} style={{position: 'fixed', inset: 0, zIndex: 90}} />}
      <nav className="navbar">
        <div className="nav-logo" style={{fontWeight: 800, fontSize: '2rem', letterSpacing: '-1.5px', color: '#111'}}>wishr.</div>
        
        <div className="nav-tabs">
          <button className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Home</button>
          <button className={`nav-tab ${activeTab === 'my-wishes' ? 'active' : ''}`} onClick={() => setActiveTab('my-wishes')}>My Wishes</button>
          <button className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>

        <div className="nav-right" style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div style={{position: 'relative', zIndex: 100}}>
            <div style={{display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '24px', padding: '0.5rem 1rem', border: '2px solid #eee'}}>
              <Search size={18} color="#888" />
              <input 
                value={search} onChange={e => { setSearch(e.target.value); setShowSearch(true); }} onFocus={() => setShowSearch(true)}
                placeholder="Search friends..." 
                style={{border: 'none', outline: 'none', background: 'transparent', marginLeft: '0.5rem', fontFamily: 'inherit', fontWeight: 600, width: '120px'}} 
              />
            </div>
            {showSearch && search.trim() !== '' && (
              <div style={{position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, right: 0, background: '#fff', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', overflow: 'hidden', border: '2px solid #eee'}}>
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <div key={u.username} onClick={() => { setViewedUser(u); setShowSearch(false); setSearch(''); }} style={{display: 'flex', alignItems: 'center', padding: '1rem', cursor: 'pointer', borderBottom: '1px solid #f9f9f9'}}>
                    <div style={{fontSize: '1.5rem', marginRight: '1rem', background: u.accentColor, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{u.avatar}</div>
                    <span style={{fontWeight: 700}}>{u.name}</span>
                  </div>
                )) : <div style={{padding: '1.5rem', color: '#888', textAlign: 'center', fontWeight: 600}}>No users found</div>}
              </div>
            )}
          </div>

          <div style={{position: 'relative', zIndex: 100}}>
            <button onClick={() => setShowProfile(!showProfile)} style={{width: 48, height: 48, borderRadius: '50%', background: '#fff', border: `3px solid ${currentUser.accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s'}}>
              {currentUser.avatar}
            </button>
            {showProfile && (
              <div style={{position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, background: '#fff', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', overflow: 'hidden', border: '2px solid #eee', minWidth: '160px'}}>
                <button onClick={() => { onLogout(); setShowProfile(false); }} style={{width: '100%', padding: '1rem', textAlign: 'left', fontWeight: 700, color: '#e53935', display: 'flex', alignItems: 'center', gap: '0.75rem'}}><LogOut size={18}/> Log out</button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}

// ---------------------- TABS ----------------------
const HomeTab = ({ users, setViewedUser, counts }) => (
  <div style={{padding: '2rem'}}>
    <h1 className="editorial-header">Explore Wishes</h1>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto'}}>
      {users.map(u => (
        <div key={u.username} onClick={() => setViewedUser(u)} className="user-card" style={{background: `linear-gradient(to bottom, #fff, ${u.accentColor}15)`}}>
          <div style={{fontSize: '4rem', marginBottom: '1rem', background: '#fff', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${u.accentColor}40`, border: `4px solid ${u.accentColor}`}}>{u.avatar}</div>
          <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: 0}}>{u.name}</h2>
          <p style={{color: '#666', fontWeight: 600, marginTop: '0.5rem', fontSize: '1rem', background: '#fff', padding: '0.25rem 0.75rem', borderRadius: '12px'}}>{counts[u.username] || 0} wishes</p>
        </div>
      ))}
      {users.length === 0 && (
        <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#888'}}>
          <div style={{fontSize: '4rem', marginBottom: '1rem'}}>👋</div>
          <h3 style={{fontSize: '1.5rem'}}>You're the first one here!</h3>
        </div>
      )}
    </div>
  </div>
);

const MyWishesTab = ({ currentUser }) => {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, `wishlists/${currentUser.username}/items`), snap => {
      let list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a,b) => a.order - b.order);
      setItems(list);
    });
    return unsub;
  }, [currentUser]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = async ({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      newItems.forEach((item, index) => {
        if (item.order !== index) updateDoc(doc(db, `wishlists/${currentUser.username}/items`, item.id), { order: index });
      });
    }
  };

  return (
    <div style={{maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem'}}>
        <h1 className="editorial-header" style={{margin: 0, textAlign: 'left'}}>My Wishes</h1>
        <button onClick={() => setEditingItem({})} className="pill-btn pill-btn-filled" style={{'--btn-color': currentUser.accentColor, color: '#111'}}>
          <Plus size={20}/> Add Wish
        </button>
      </div>

      {items.length === 0 ? (
         <div style={{textAlign: 'center', padding: '6rem 2rem', color: '#888'}}>
            <div style={{fontSize: '6rem', marginBottom: '1.5rem'}}>✨</div>
            <h3 style={{fontSize: '2rem', fontWeight: 800, color: '#111'}}>Your wishlist is empty</h3>
            <p style={{fontSize: '1.25rem'}}>Time to dream big! Click the button above to add your first wish.</p>
         </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <SortableItem key={item.id} item={item} isOwner onEdit={() => setEditingItem(item)} onDelete={async () => {
                if (window.confirm('Delete this wish forever?')) await deleteDoc(doc(db, `wishlists/${currentUser.username}/items`, item.id));
              }} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {editingItem && <WishItemModal item={editingItem} currentUser={currentUser} itemsCount={items.length} onClose={() => setEditingItem(null)} />}
    </div>
  );
}

const SettingsTab = ({ users, currentUser, onLogout }) => {
  const [view, setView] = useState('menu');

  const goMenu = () => setView('menu');

  if (view === 'menu') {
    return (
      <div style={{maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem'}}>
         <h1 className="editorial-header">Settings</h1>
         <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <button onClick={() => setView('create')} className="pill-btn pill-btn-outline" style={{width: '100%', justifyContent: 'center', padding: '1.5rem', fontSize: '1.25rem'}}>Create Profile</button>
            <button onClick={() => setView('edit-auth')} className="pill-btn pill-btn-outline" style={{width: '100%', justifyContent: 'center', padding: '1.5rem', fontSize: '1.25rem'}}>Edit Profile</button>
            <button onClick={() => setView('delete-auth')} className="pill-btn pill-btn-outline" style={{width: '100%', justifyContent: 'center', padding: '1.5rem', fontSize: '1.25rem', borderColor: '#e53935', color: '#e53935'}}>Delete Profile</button>
         </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div style={{maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem'}}>
        <button onClick={goMenu} className="pill-btn pill-btn-outline" style={{marginBottom: '2rem'}}><ArrowLeft size={16}/> Back</button>
        <div className="settings-card">
          <h2 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem'}}>Create New Profile</h2>
          <CreateProfileForm users={users} onSuccess={() => { alert('Profile created!'); goMenu(); }} />
        </div>
      </div>
    );
  }

  if (view === 'edit-auth' || view === 'delete-auth') {
    return (
      <div style={{maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem'}}>
        <button onClick={goMenu} className="pill-btn pill-btn-outline" style={{marginBottom: '2rem'}}><ArrowLeft size={16}/> Back</button>
        <div className="settings-card">
          <PinAuth 
            targetPin={currentUser.pin} 
            title="Verify Identity" 
            subtitle="Enter your current PIN to continue" 
            onSuccess={() => setView(view === 'edit-auth' ? 'edit-form' : 'delete-confirm')} 
          />
        </div>
      </div>
    );
  }

  if (view === 'edit-form') {
    return (
      <div style={{maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem'}}>
        <button onClick={goMenu} className="pill-btn pill-btn-outline" style={{marginBottom: '2rem'}}><ArrowLeft size={16}/> Back</button>
        <div className="settings-card">
          <h2 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem'}}>Edit Profile</h2>
          <EditProfileForm targetUser={currentUser} onSuccess={() => { alert('Profile updated!'); goMenu(); }} />
        </div>
      </div>
    );
  }

  if (view === 'delete-confirm') {
    return (
      <div style={{maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem'}}>
        <button onClick={goMenu} className="pill-btn pill-btn-outline" style={{marginBottom: '2rem'}}><ArrowLeft size={16}/> Back</button>
        <div className="settings-card" style={{borderColor: '#ffebee', background: '#fffafa', textAlign: 'center'}}>
          <h2 style={{color: '#c62828', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem'}}>Delete Profile</h2>
          <p style={{fontSize: '1.1rem', color: '#666', marginBottom: '2rem', fontWeight: 500}}>Are you sure you want to permanently delete {currentUser.name}'s profile and all wishes? This cannot be undone.</p>
          <button onClick={async () => {
            const qs = await getDocs(collection(db, `wishlists/${currentUser.username}/items`));
            qs.forEach(d => deleteDoc(d.ref));
            await deleteDoc(doc(db, 'users', currentUser.username));
            onLogout();
          }} className="pill-btn pill-btn-filled" style={{'--btn-color': '#e53935', width: '100%', justifyContent: 'center'}}>
            <Trash2 size={20} /> Yes, Delete Forever
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------- COMPONENTS ----------------------
const PinAuth = ({ targetPin, title, subtitle, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleNum = (n) => {
    if (pin.length < 4) {
      const newPin = pin + n;
      setPin(newPin);
      if (newPin.length === 4) {
        if (hashPin(newPin) === targetPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => { setPin(''); setError(false); }, 400);
        }
      }
    }
  };

  return (
    <div style={{textAlign: 'center', paddingTop: '1rem'}}>
      <h2 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-1px'}}>{title}</h2>
      {subtitle && <p style={{color: '#666', fontWeight: 500, fontSize: '1.1rem', marginBottom: '2rem'}}>{subtitle}</p>}
      <div className={`shake ${error ? 'shake' : ''}`} style={{display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '2.5rem'}}>
        {[...Array(4)].map((_, i) => <div key={i} className={`numpad-dot ${i < pin.length ? 'filled' : ''}`} />)}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', maxWidth: '300px', margin: '0 auto'}}>
        {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} className="num-key" onClick={() => handleNum(n.toString())}>{n}</button>)}
        <div></div>
        <button className="num-key" onClick={() => handleNum('0')}>0</button>
        <button className="num-key" onClick={() => setPin(pin.slice(0, -1))} style={{fontSize: '1.5rem', background: 'transparent', border: 'none', boxShadow: 'none'}}>⌫</button>
      </div>
    </div>
  );
}

const CreateProfileForm = ({ users, onSuccess }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [pin, setPin] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !avatar || pin.length !== 4) return;
    const username = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random()*1000);
    const accentColor = COLORS[users.length % COLORS.length];
    const newUser = { name, avatar, pin: hashPin(pin), accentColor, createdAt: Date.now() };
    await setDoc(doc(db, 'users', username), newUser);
    onSuccess(newUser);
  };

  return (
    <form onSubmit={submit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div>
        <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Name</label>
        <input className="input-field" value={name} onChange={e=>setName(e.target.value)} required maxLength={20} />
      </div>
      <div>
        <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Pick an Emoji</label>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', background: '#f9f9f9', padding: '1rem', borderRadius: '20px', border: '2px solid #eee', maxHeight: '200px', overflowY: 'auto'}}>
          {EMOJIS.map(e => (
            <button key={e} type="button" onClick={() => setAvatar(e)} style={{fontSize: '2rem', padding: '0.5rem', borderRadius: '16px', background: avatar === e ? '#fff' : 'transparent', boxShadow: avatar === e ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', transform: avatar === e ? 'scale(1.1)' : 'none', transition: 'all 0.2s'}}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>4-Digit PIN</label>
        <input className="input-field" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/[^0-9]/g, ''))} required />
      </div>
      <button type="submit" className="pill-btn pill-btn-filled" style={{'--btn-color': '#111', justifyContent: 'center', marginTop: '1rem', padding: '1rem'}} disabled={!name || !avatar || pin.length !== 4}>Create Profile</button>
    </form>
  )
}

const EditProfileForm = ({ targetUser, onSuccess }) => {
  const [name, setName] = useState(targetUser.name);
  const [avatar, setAvatar] = useState(targetUser.avatar);
  const [newPin, setNewPin] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !avatar) return;
    const updates = { name, avatar };
    if (newPin.length === 4) updates.pin = hashPin(newPin);
    await updateDoc(doc(db, 'users', targetUser.username), updates);
    onSuccess();
  };

  return (
    <form onSubmit={submit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div>
        <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Name</label>
        <input className="input-field" value={name} onChange={e=>setName(e.target.value)} required maxLength={20} />
      </div>
      <div>
        <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Pick an Emoji</label>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', background: '#f9f9f9', padding: '1rem', borderRadius: '20px', border: '2px solid #eee', maxHeight: '200px', overflowY: 'auto'}}>
          {EMOJIS.map(e => (
            <button key={e} type="button" onClick={() => setAvatar(e)} style={{fontSize: '2rem', padding: '0.5rem', borderRadius: '16px', background: avatar === e ? '#fff' : 'transparent', boxShadow: avatar === e ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', transform: avatar === e ? 'scale(1.1)' : 'none', transition: 'all 0.2s'}}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>New 4-Digit PIN (Leave blank to keep current)</label>
        <input className="input-field" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/[^0-9]/g, ''))} />
      </div>
      <button type="submit" className="pill-btn pill-btn-filled" style={{'--btn-color': '#111', justifyContent: 'center', marginTop: '1rem', padding: '1rem'}}>Save Changes</button>
    </form>
  )
}

const WishlistView = ({ user, onBack }) => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, `wishlists/${user.username}/items`), snap => {
      let list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a,b) => a.order - b.order);
      setItems(list);
    });
    return unsub;
  }, [user.username]);

  return (
    <div style={{minHeight: '100vh', background: user.accentColor, position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto', padding: '0'}}>
      <div style={{background: 'rgba(253,252,249,0.98)', minHeight: '100vh', borderTopLeftRadius: '60px', borderTopRightRadius: '60px', marginTop: '120px', padding: '4rem 1.5rem', position: 'relative', boxShadow: '0 -20px 60px rgba(0,0,0,0.1)'}}>
        <button onClick={onBack} className="pill-btn pill-btn-filled" style={{position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', '--btn-color': '#111'}}><ArrowLeft size={20}/> Back</button>
        
        <div style={{textAlign: 'center', marginTop: '-100px', marginBottom: '3rem'}}>
          <div style={{fontSize: '5rem', background: '#fff', width: 140, height: 140, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: `0 12px 32px ${user.accentColor}80`, border: `8px solid ${user.accentColor}`}}>{user.avatar}</div>
          <h1 className="editorial-header" style={{marginTop: '1.5rem', marginBottom: '1rem'}}>{user.name}'s List</h1>
        </div>

        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          {items.map(item => <WishItemCard key={item.id} item={item} />)}
          {items.length === 0 && (
            <div style={{textAlign: 'center', padding: '4rem', color: '#888'}}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>🌱</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: 600}}>No wishes here yet.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PriorityBadge = ({ priority }) => {
  const style = priority === 'Must Have' ? { bg: '#ffeb3b', rotate: '-3deg' } : priority === 'Would Love' ? { bg: '#e1bee7', rotate: '2deg' } : { bg: '#bbdefb', rotate: '-1deg' };
  return (
    <span style={{background: style.bg, color: '#111', transform: `rotate(${style.rotate})`, padding: '0.4rem 0.8rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block', border: '2px solid #111', boxShadow: '2px 2px 0 #111'}}>
      {priority}
    </span>
  )
}

const SortableItem = ({ item, isOwner, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative', zIndex: isDragging ? 10 : 1 };
  return <div ref={setNodeRef} style={style}><WishItemCard item={item} isOwner={isOwner} onEdit={onEdit} onDelete={onDelete} dragListeners={listeners} dragAttributes={attributes} /></div>
}

const WishItemCard = ({ item, isOwner, onEdit, onDelete, dragListeners, dragAttributes }) => {
  return (
    <div className="wish-card" style={{borderLeft: `8px solid ${item.priority === 'Must Have' ? '#ffeb3b' : item.priority === 'Would Love' ? '#e1bee7' : item.priority === 'Nice to Have' ? '#bbdefb' : '#eee'}`}}>
      {isOwner && (
        <div style={{display: 'flex', alignItems: 'center', padding: '0 0.5rem', cursor: 'grab', color: '#ccc'}} {...dragListeners} {...dragAttributes}>
          <GripVertical size={24} />
        </div>
      )}
      <div style={{flex: 1}}>
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap'}}>
          <h3 style={{fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', wordBreak: 'break-word', color: '#111'}}>{item.title}</h3>
          {item.priority && <PriorityBadge priority={item.priority} />}
        </div>
        {item.note && <p style={{color: '#555', margin: '0 0 1rem 0', whiteSpace: 'pre-wrap', fontSize: '1.05rem', lineHeight: 1.5, fontWeight: 500}}>{item.note}</p>}
        <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem'}}>
          {item.category && <span style={{background: '#f0f0f0', color: '#111', padding: '0.4rem 1rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem'}}>{item.category}</span>}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="pill-btn-outline" style={{padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '999px'}}>
              <ExternalLink size={14} /> Link
            </a>
          )}
        </div>
      </div>
      {isOwner && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}} onPointerDown={e => e.stopPropagation()}>
          <button onClick={onEdit} style={{width: 44, height: 44, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'}}><Edit2 size={18} color="#111" /></button>
          <button onClick={onDelete} style={{width: 44, height: 44, borderRadius: '50%', background: '#ffebee', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'}}><Trash2 size={18} color="#e53935" /></button>
        </div>
      )}
    </div>
  )
}

const WishItemModal = ({ item, currentUser, itemsCount, onClose }) => {
  const [title, setTitle] = useState(item.title || '');
  const [link, setLink] = useState(item.link || '');
  const [note, setNote] = useState(item.note || '');
  const [category, setCategory] = useState(item.category || '');
  const [priority, setPriority] = useState(item.priority || '');

  const save = async (e) => {
    e.preventDefault();
    if (!title) return;
    const data = { title, link, note, category, priority, updatedAt: Date.now() };
    if (item.id) {
      await updateDoc(doc(db, `wishlists/${currentUser.username}/items`, item.id), data);
    } else {
      data.createdAt = Date.now();
      data.order = itemsCount;
      await setDoc(doc(collection(db, `wishlists/${currentUser.username}/items`)), data);
    }
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
         <button onClick={onClose} style={{position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f5f5f5', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><X size={20}/></button>
         <h2 style={{fontSize: '2rem', fontWeight: 800, margin: '0 0 2rem 0', letterSpacing: '-1px'}}>{item.id ? 'Edit Wish' : 'Add a Wish'}</h2>
         <form onSubmit={save} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <div>
              <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>What do you wish for? *</label>
              <input className="input-field" value={title} onChange={e=>setTitle(e.target.value)} required placeholder="e.g. A new bicycle" />
            </div>
            <div>
              <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Link (optional)</label>
              <input className="input-field" type="url" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Note (optional)</label>
              <textarea className="input-field" value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Size, color, preference..." />
            </div>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
               <div style={{flex: 1, minWidth: '140px'}}>
                 <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Category</label>
                 <select className="input-field" value={category} onChange={e=>setCategory(e.target.value)}>
                   <option value="">Select...</option>
                   {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <div style={{flex: 1, minWidth: '140px'}}>
                 <label style={{fontWeight: 700, display: 'block', marginBottom: '0.5rem'}}>Priority</label>
                 <select className="input-field" value={priority} onChange={e=>setPriority(e.target.value)}>
                   <option value="">Select...</option>
                   {PRIORITIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
            </div>
            <button type="submit" className="pill-btn pill-btn-filled" style={{'--btn-color': '#111', justifyContent: 'center', marginTop: '1rem', width: '100%', fontSize: '1.25rem', padding: '1rem'}}>Save Wish</button>
         </form>
      </div>
    </div>
  )
}

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
