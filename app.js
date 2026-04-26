const { useState, useEffect, useMemo, useRef } = React;
const { Lock, Plus, ArrowLeft, Trash2, Camera, Smile, Heart, ExternalLink, Link, Gift } = lucideReact;

const CATEGORIES = ['Tech', 'Fashion', 'Books', 'Food', 'Travel', 'Hobby', 'Beauty', 'Home', 'Music', 'Other'];
const PRIORITIES = ['Must have', 'Would love', 'Nice to have'];

const generateUniqueColor = (existingUsers) => {
    let hue;
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
        hue = Math.floor(Math.random() * 360);
        valid = true;
        for (const user of existingUsers) {
            const match = user.color.match(/hsl\((\d+)/);
            if (match) {
                const existingHue = parseInt(match[1]);
                let diff = Math.abs(existingHue - hue);
                if (diff > 180) diff = 360 - diff;
                if (diff < 30) {
                    valid = false;
                    break;
                }
            }
        }
        attempts++;
    }
    return `hsl(${hue}, 75%, 85%)`;
};

const resizeImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
    };
});

// Components
const Home = ({ users, onCreateClick, onViewFriend }) => (
    <div style={{ animation: 'fadeIn 0.3s' }}>
        <div className="header">
            <h1>Wishlists</h1>
            <button className="add-profile-btn" onClick={onCreateClick}>
                <Plus size={18} /> New Profile
            </button>
        </div>
        {users.length === 0 ? (
            <div className="empty-state">
                <Gift size={48} />
                <h3>No profiles yet</h3>
                <p>Create one to start adding your wishes!</p>
            </div>
        ) : (
            <div className="user-grid">
                {users.map(user => (
                    <div key={user.id} className="user-card" style={{ backgroundColor: user.color }} onClick={() => onViewFriend(user)}>
                        <div className="avatar">
                            {user.avatarType === 'photo' ? (
                                <img src={user.avatarValue} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                user.avatarValue
                            )}
                        </div>
                        <h3>{user.name}</h3>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const PinPad = ({ correctPin, onSuccess, onCancel }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (pin.length === 4) {
            if (pin === correctPin) {
                setTimeout(() => onSuccess(), 200);
            } else {
                setError(true);
                setTimeout(() => {
                    setPin('');
                    setError(false);
                }, 500);
            }
        }
    }, [pin, correctPin, onSuccess]);

    const handlePress = (num) => {
        if (pin.length < 4 && !error) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        if (!error) {
            setPin(prev => prev.slice(0, -1));
        }
    };

    return (
        <div className="pin-view" style={{ animation: 'fadeIn 0.3s' }}>
            <h2>Enter PIN</h2>
            <div className={`pin-dots ${error ? 'error' : ''}`}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
                ))}
            </div>
            <div className="numpad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} className="num-key" onClick={() => handlePress(num.toString())}>{num}</button>
                ))}
                <button className="num-key action" onClick={onCancel}>Cancel</button>
                <button className="num-key" onClick={() => handlePress('0')}>0</button>
                <button className="num-key action" onClick={handleDelete}>Del</button>
            </div>
        </div>
    );
};

const CreateProfile = ({ onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [avatarType, setAvatarType] = useState('emoji');
    const [avatarValue, setAvatarValue] = useState('😊');
    const [pin, setPin] = useState('');

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await resizeImage(file);
                setAvatarValue(base64);
            } catch (err) {
                console.error('Error reading file', err);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !pin || pin.length !== 4) {
            alert('Please fill out all fields and ensure PIN is 4 digits.');
            return;
        }
        onSave({ name, avatarType, avatarValue, pin });
    };

    return (
        <div className="form-container" style={{ animation: 'slideUp 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                <button className="back-btn" style={{ position: 'relative', top: 0, left: 0, marginRight: '15px' }} onClick={onCancel} type="button">
                    <ArrowLeft size={24} />
                </button>
                <h2>Create Profile</h2>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Name / Nickname</label>
                    <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Avatar</label>
                    <div className="avatar-picker">
                        <div className={`avatar-option ${avatarType === 'emoji' ? 'selected' : ''}`} onClick={() => { setAvatarType('emoji'); setAvatarValue('😊'); }}>
                            <Smile size={24} style={{ marginBottom: '8px' }} />
                            <div>Emoji</div>
                        </div>
                        <div className={`avatar-option ${avatarType === 'photo' ? 'selected' : ''}`} onClick={() => { setAvatarType('photo'); setAvatarValue(''); }}>
                            <Camera size={24} style={{ marginBottom: '8px' }} />
                            <div>Photo</div>
                        </div>
                    </div>
                    {avatarType === 'emoji' ? (
                        <input type="text" className="form-control" value={avatarValue} onChange={e => setAvatarValue(e.target.value)} placeholder="Enter an emoji" maxLength="2" />
                    ) : (
                        <input type="file" className="form-control" accept="image/*" onChange={handlePhotoUpload} required={avatarType === 'photo' && !avatarValue} />
                    )}
                    {avatarType === 'photo' && avatarValue && avatarValue.startsWith('data:') && (
                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                            <img src={avatarValue} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
                        </div>
                    )}
                </div>
                <div className="form-group">
                    <label>4-Digit PIN</label>
                    <input type="password" pattern="\d*" inputMode="numeric" maxLength="4" className="form-control" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} required />
                </div>
                <button type="submit" className="btn-primary">Create Profile</button>
            </form>
        </div>
    );
};

const AddWishForm = ({ onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('');
    const [priority, setPriority] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave({ title, link, note, category, priority });
    };

    return (
        <div className="add-wish-card" style={{ animation: 'fadeIn 0.3s' }}>
            <h3 style={{ marginBottom: '20px' }}>Add New Wish</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Title *</label>
                    <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required placeholder="What do you want?" />
                </div>
                <div className="form-group">
                    <label>Link (optional)</label>
                    <input type="url" className="form-control" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
                </div>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: '1 1 150px' }}>
                        <label>Category (optional)</label>
                        <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="">Select...</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: '1 1 150px' }}>
                        <label>Priority (optional)</label>
                        <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                            <option value="">Select...</option>
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Note (optional)</label>
                    <textarea className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="Why do you want this? Size, color, etc."></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 2 }}>Save Wish</button>
                    <button type="button" className="btn-primary" style={{ flex: 1, background: '#f0f0f0', color: '#333' }} onClick={onCancel}>Cancel</button>
                </div>
            </form>
        </div>
    );
};

const Wishlist = ({ user, isOwner, onBack, onAdd, onDelete, onUnlockRequest }) => {
    const [showAddForm, setShowAddForm] = useState(false);

    return (
        <div className="profile-view">
            <div className="profile-header" style={{ backgroundColor: user.color }}>
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>
                {!isOwner && (
                    <button className="unlock-profile-btn" onClick={() => onUnlockRequest(user)}>
                        <Lock size={16} /> Edit
                    </button>
                )}
                <div className="avatar">
                    {user.avatarType === 'photo' ? (
                        <img src={user.avatarValue} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        user.avatarValue
                    )}
                </div>
                <h2>{isOwner ? 'My Wishlist' : `${user.name}'s Wishlist`}</h2>
            </div>
            
            <div className="wishes-container">
                {isOwner && !showAddForm && (
                    <button className="btn-primary" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setShowAddForm(true)}>
                        <Plus size={20} /> Add a Wish
                    </button>
                )}

                {isOwner && showAddForm && (
                    <AddWishForm onSave={(wish) => { onAdd(wish); setShowAddForm(false); }} onCancel={() => setShowAddForm(false)} />
                )}

                {user.wishes.length === 0 && !showAddForm ? (
                    <div className="empty-state">
                        <Gift size={48} />
                        <h3>{isOwner ? "Your wishlist is empty" : "No wishes yet"}</h3>
                        <p>{isOwner ? "Add something you'd love to have!" : "Check back later."}</p>
                    </div>
                ) : (
                    user.wishes.map(wish => (
                        <div key={wish.id} className="wish-card" style={{ animation: 'slideUp 0.3s' }}>
                            {isOwner && (
                                <button className="delete-btn" onClick={() => onDelete(wish.id)}>
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <div className="wish-header">
                                <h3 className="wish-title">{wish.title}</h3>
                            </div>
                            <div className="wish-tags">
                                {wish.priority && (
                                    <span className={`wish-priority priority-${wish.priority === 'Must have' ? 'must' : wish.priority === 'Would love' ? 'love' : 'nice'}`}>
                                        {wish.priority}
                                    </span>
                                )}
                                {wish.category && <span className="wish-tag">{wish.category}</span>}
                            </div>
                            {wish.link && (
                                <a href={wish.link.startsWith('http') ? wish.link : `https://${wish.link}`} target="_blank" rel="noopener noreferrer" className="wish-link">
                                    <Link size={14} /> View Item <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                                </a>
                            )}
                            {wish.note && (
                                <p className="wish-note">{wish.note}</p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const App = () => {
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('wishlist_users');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [view, setView] = useState('home');
    const [activeUser, setActiveUser] = useState(null); 
    const [currentUser, setCurrentUser] = useState(null); 

    useEffect(() => {
        localStorage.setItem('wishlist_users', JSON.stringify(users));
    }, [users]);

    const handleCreateProfile = (newUser) => {
        newUser.color = generateUniqueColor(users);
        newUser.id = Date.now().toString();
        newUser.wishes = [];
        setUsers([...users, newUser]);
        setView('home');
    };

    const handleUnlock = (user) => {
        setActiveUser(user);
        setView('pinEntry');
    };

    const handleViewFriend = (user) => {
        setActiveUser(user);
        setView('friendProfile');
    };

    const handlePinSuccess = () => {
        setCurrentUser(activeUser);
        setView('myList');
    };

    const handleAddWish = (wish) => {
        const updatedUsers = users.map(u => {
            if (u.id === currentUser.id) {
                return { ...u, wishes: [{...wish, id: Date.now().toString()}, ...u.wishes] };
            }
            return u;
        });
        setUsers(updatedUsers);
        setCurrentUser(updatedUsers.find(u => u.id === currentUser.id));
    };

    const handleDeleteWish = (wishId) => {
        const updatedUsers = users.map(u => {
            if (u.id === currentUser.id) {
                return { ...u, wishes: u.wishes.filter(w => w.id !== wishId) };
            }
            return u;
        });
        setUsers(updatedUsers);
        setCurrentUser(updatedUsers.find(u => u.id === currentUser.id));
    };

    const renderView = () => {
        switch(view) {
            case 'home':
                return <Home users={users} onCreateClick={() => setView('createProfile')} onViewFriend={handleViewFriend} />;
            case 'createProfile':
                return <CreateProfile onSave={handleCreateProfile} onCancel={() => setView('home')} />;
            case 'pinEntry':
                return <PinPad correctPin={activeUser.pin} onSuccess={handlePinSuccess} onCancel={() => setView('friendProfile')} />;
            case 'myList':
                return <Wishlist user={currentUser} isOwner={true} onBack={() => { setView('home'); setCurrentUser(null); }} onAdd={handleAddWish} onDelete={handleDeleteWish} />;
            case 'friendProfile':
                return <Wishlist user={activeUser} isOwner={false} onBack={() => setView('home')} onUnlockRequest={handleUnlock} />;
            default:
                return <Home users={users} />;
        }
    };

    return (
        <div className="app-container">
            {renderView()}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
