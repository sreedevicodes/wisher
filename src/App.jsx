import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, LogOut, ArrowLeft, Edit2, Trash2, ExternalLink, Lock, GripVertical } from 'lucide-react';

const EMOJIS = ['🦊', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦉', '🦄', '🐝', '🐛', '🦋', '🐌', '🐙'];
const COLORS = ['#e8a4a4', '#a4c4a4', '#a4c4e8', '#c4a4e8', '#e8c4a4', '#e8e4a4', '#e8b4a0', '#a4e8d4'];
const CATEGORIES = ['Tech', 'Fashion', 'Books', 'Food', 'Travel', 'Hobby', 'Beauty', 'Home', 'Music', 'Other'];
const PRIORITIES = ['Must Have', 'Would Love', 'Nice to Have'];

// Simple lightweight PIN hashing function
const hashPin = (pin) => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString();
};

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewedUser, setViewedUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pinModalUser, setPinModalUser] = useState(null);

  useEffect(() => {
    // Real-time listener for users
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const u = [];
      snap.forEach(d => u.push({ username: d.id, ...d.data() }));
      u.sort((a, b) => a.createdAt - b.createdAt);
      setUsers(u);
    });

    const saved = localStorage.getItem('wishr_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    return unsub;
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('wishr_session', JSON.stringify(user));
    setViewedUser(user);
    setPinModalUser(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setViewedUser(null);
    localStorage.removeItem('wishr_session');
  };

  if (viewedUser) {
    return (
      <WishlistView 
        user={viewedUser} 
        currentUser={currentUser}
        isOwner={currentUser?.username === viewedUser.username}
        onBack={() => setViewedUser(currentUser ? currentUser : null)}
        onLogout={handleLogout}
        onLoginClick={() => setPinModalUser(viewedUser)}
      />
    );
  }

  return (
    <div className="app">
      <div className="flex justify-between items-center" style={{marginBottom: '2.5rem'}}>
        <h1 style={{fontSize: '2.5rem', color: '#e8a4a4'}}>✨ Wishr</h1>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {users.map(u => (
          <div key={u.username} className="card relative" style={{'--user-color': u.accentColor}}>
            <button 
              className="icon-btn" 
              style={{position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.7)', width: 32, height: 32}}
              onClick={(e) => { e.stopPropagation(); setPinModalUser(u); }}
              title="Log in to edit"
            >
              <Lock size={14} />
            </button>
            <div className="w-full text-center" onClick={() => setViewedUser(u)} style={{marginTop: '0.5rem'}}>
              <div className="avatar mx-auto">{u.avatar}</div>
              <h2 className="mt-4">{u.name}</h2>
            </div>
          </div>
        ))}
        {users.length < 8 && (
          <div className="card" style={{'--user-color': '#f0f0f0', justifyContent: 'center'}} onClick={() => setShowCreate(true)}>
            <div className="avatar mx-auto" style={{background: '#fff'}}><Plus size={32} /></div>
            <h2 className="mt-4 text-center" style={{color: '#888'}}>New Profile</h2>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} users={users} onLogin={handleLogin} />}
      {pinModalUser && <PinModal user={pinModalUser} onClose={() => setPinModalUser(null)} onSuccess={() => handleLogin(pinModalUser)} />}
    </div>
  );
}

function WishlistView({ user, currentUser, isOwner, onBack, onLogout, onLoginClick }) {
  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const q = collection(db, `wishlists/${user.username}/items`);
    const unsub = onSnapshot(q, (snap) => {
      let list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.order - b.order);
      setItems(list);
    });
    return unsub;
  }, [user.username]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      
      newItems.forEach((item, index) => {
        if (item.order !== index) {
          updateDoc(doc(db, `wishlists/${user.username}/items`, item.id), { order: index });
        }
      });
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm('Delete this wish forever?')) {
      await deleteDoc(doc(db, `wishlists/${user.username}/items`, id));
    }
  };

  return (
    <div style={{
      '--user-color': user.accentColor, 
      minHeight: '100vh', 
      background: `linear-gradient(to bottom, ${user.accentColor}33, var(--bg) 400px)`,
    }}>
      <div className="app">
        <div className="flex justify-between items-center" style={{marginBottom: '2.5rem'}}>
          <div className="flex items-center gap-4">
            <button className="icon-btn" onClick={onBack}><ArrowLeft size={20} /></button>
            <div className="avatar" style={{width: 60, height: 60, fontSize: '2.5rem'}}>{user.avatar}</div>
            <h1 style={{fontSize: '1.8rem'}}>{user.name}'s List</h1>
          </div>
          {isOwner && (
            <button className="icon-btn" onClick={onLogout} title="Logout"><LogOut size={20} /></button>
          )}
        </div>

        {!isOwner && !currentUser && (
          <div style={{background: '#fff', padding: '1.25rem', borderRadius: '20px', marginBottom: '2rem', textAlign: 'center', boxShadow: '0 4px 12px var(--shadow)'}}>
            <p style={{marginBottom: '0.75rem', fontWeight: 700}}>Are you {user.name}?</p>
            <button className="btn-primary" style={{padding: '0.6rem 1.5rem', width: 'auto'}} onClick={onLoginClick}>Log in to edit</button>
          </div>
        )}

        {isOwner && (
          <button className="btn-primary" style={{marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}} onClick={() => { setEditingItem(null); setShowItemModal(true); }}>
            <Plus size={20} /> Add a Wish
          </button>
        )}

        {items.length === 0 ? (
          <div className="text-center" style={{padding: '4rem 1rem', color: '#888'}}>
            <div style={{fontSize: '4rem', marginBottom: '1rem'}}>✨</div>
            <h3 style={{color: 'var(--text)'}}>It's a little empty here</h3>
            <p>{isOwner ? "Add your first wish to get started!" : `${user.name} hasn't added any wishes yet.`}</p>
          </div>
        ) : (
          isOwner ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {items.map(item => <SortableItem key={item.id} item={item} isOwner={isOwner} onEdit={() => { setEditingItem(item); setShowItemModal(true); }} onDelete={() => deleteItem(item.id)} />)}
              </SortableContext>
            </DndContext>
          ) : (
            <div>
              {items.map(item => <WishItemCard key={item.id} item={item} isOwner={false} />)}
            </div>
          )
        )}

        {showItemModal && <ItemModal user={user} item={editingItem} itemsCount={items.length} onClose={() => setShowItemModal(false)} />}
      </div>
    </div>
  );
}

function SortableItem({ item, isOwner, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 1
  };

  return (
    <div ref={setNodeRef} style={style}>
      <WishItemCard item={item} isOwner={isOwner} onEdit={onEdit} onDelete={onDelete} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

function WishItemCard({ item, isOwner, onEdit, onDelete, dragListeners, dragAttributes }) {
  return (
    <div className="wish-item">
      {isOwner && (
        <div className="flex items-center justify-center" style={{cursor: 'grab', color: '#ccc', marginRight: '0.5rem'}} {...dragListeners} {...dragAttributes}>
          <GripVertical size={20} />
        </div>
      )}
      <div className="wish-content">
        <div className="flex items-center gap-2">
          <div className="wish-title">{item.title}</div>
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{width: 28, height: 28, minWidth: 28}} onPointerDown={e => e.stopPropagation()}>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        {item.note && <p style={{color: '#666', fontSize: '0.9rem', marginTop: '0.25rem', whiteSpace: 'pre-wrap'}}>{item.note}</p>}
        <div className="wish-meta">
          {item.category && <span className="badge">{item.category}</span>}
          {item.priority && <span className="badge" style={{
            background: item.priority === 'Must Have' ? '#ffebee' : item.priority === 'Would Love' ? '#fff3e0' : '#f0f0f0',
            color: item.priority === 'Must Have' ? '#c62828' : item.priority === 'Would Love' ? '#ef6c00' : '#4a4a4a'
          }}>{item.priority}</span>}
        </div>
      </div>
      {isOwner && (
        <div className="wish-actions" onPointerDown={e => e.stopPropagation()}>
          <button className="icon-btn" onClick={onEdit} title="Edit"><Edit2 size={16} /></button>
          <button className="icon-btn" onClick={onDelete} title="Delete"><Trash2 size={16} /></button>
        </div>
      )}
    </div>
  );
}

function ItemModal({ user, item, itemsCount, onClose }) {
  const [title, setTitle] = useState(item?.title || '');
  const [link, setLink] = useState(item?.link || '');
  const [note, setNote] = useState(item?.note || '');
  const [category, setCategory] = useState(item?.category || '');
  const [priority, setPriority] = useState(item?.priority || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;

    const data = { title, link, note, category, priority, updatedAt: Date.now() };

    if (item) {
      await updateDoc(doc(db, `wishlists/${user.username}/items`, item.id), data);
    } else {
      data.createdAt = Date.now();
      data.order = itemsCount;
      await setDoc(doc(collection(db, `wishlists/${user.username}/items`)), data);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 100}}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{'--user-color': user.accentColor}}>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <h2 style={{marginBottom: '1.5rem'}}>{item ? 'Edit Wish' : 'Add a Wish'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>What do you wish for? *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. A new bicycle" />
          </div>
          <div className="input-group">
            <label>Link (optional)</label>
            <input className="input" type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="input-group">
            <label>Note (optional)</label>
            <textarea className="textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Size, color, etc." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label>Category</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Priority</label>
              <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="">Select...</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{marginTop: '1rem'}}>Save Wish</button>
        </form>
      </div>
    </div>
  );
}

function PinModal({ user, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleNum = (n) => {
    if (pin.length < 4) {
      const newPin = pin + n;
      setPin(newPin);
      if (newPin.length === 4) {
        if (hashPin(newPin) === user.pin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 400);
        }
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 100}}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{'--user-color': user.accentColor}}>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <div className="text-center" style={{marginBottom: '1rem'}}>
          <div className="avatar mx-auto" style={{marginBottom: '1rem'}}>{user.avatar}</div>
          <h2>Welcome back, {user.name}</h2>
          <p style={{color: '#666', marginTop: '0.5rem'}}>Enter your 4-digit PIN</p>
        </div>
        
        <div className={`pin-dots ${error ? 'shake' : ''}`}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="numpad">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="num-key" onClick={() => handleNum(n.toString())}>{n}</button>
          ))}
          <div></div>
          <button className="num-key" onClick={() => handleNum('0')}>0</button>
          <div></div>
        </div>
      </div>
    </div>
  )
}

function CreateUserModal({ onClose, users, onLogin }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !avatar || pin.length !== 4) return;
    
    const username = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random()*1000);
    const accentColor = COLORS[users.length % COLORS.length];

    const newUser = {
      name,
      avatar,
      pin: hashPin(pin),
      accentColor,
      createdAt: Date.now()
    };

    await setDoc(doc(db, 'users', username), newUser);
    onLogin({ username, ...newUser });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <h2 style={{marginBottom: '1.5rem'}}>Create Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="What's your name?" maxLength={20} required />
          </div>
          <div className="input-group">
            <label>Pick an Avatar</label>
            <div className="emoji-grid">
              {EMOJIS.map(e => (
                <button key={e} type="button" className={`emoji-btn ${avatar === e ? 'selected' : ''}`} onClick={() => setAvatar(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label>4-Digit PIN</label>
            <input className="input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Enter 4 numbers" required />
          </div>
          <button type="submit" className="btn-primary" style={{marginTop: '1rem', '--user-color': '#a4c4e8'}} disabled={!name || !avatar || pin.length !== 4}>Create Profile</button>
        </form>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
