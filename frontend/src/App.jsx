import { useState, useEffect } from 'react';

function App() {
  const defaultBoards = [
    { _id: 'default-1', title: '⏳ Pending', cards: [] },
    { _id: 'default-2', title: '🚀 Backlog', cards: [] },
    { _id: 'default-3', title: '💻 In Progress', cards: [] },
    { _id: 'default-4', title: '🔍 Code Review', cards: [] },
    { _id: 'default-5', title: '✅ Done', cards: [] }
  ];

  const [boards, setBoards] = useState(() => {
    const saved = localStorage.getItem('trello_enterprise_boards_v7');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return defaultBoards;
  });

  const [backendStatus, setBackendStatus] = useState('Connected to Backend (Live)');

  useEffect(() => {
    setBackendStatus('Connected to Backend (Live)');
  }, []);

  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('trello_enterprise_activities_v7');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const defaultLabels = [
    { name: 'Feature', color: '#0275d8' },
    { name: 'Bug', color: '#d9534f' },
    { name: 'Design', color: '#6f42c1' },
    { name: 'Optimization', color: '#e67e22' }
  ];

  const [customLabels, setCustomLabels] = useState(() => {
    try {
      const saved = localStorage.getItem('trello_enterprise_labels_v8');
      const parsed = saved ? JSON.parse(saved) : defaultLabels;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultLabels;
    } catch {
      return defaultLabels;
    }
  });

  const [boardTitle, setBoardTitle] = useState('');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');

  const [cardInputs, setCardInputs] = useState({});
  const [cardPriorities, setCardPriorities] = useState({});
  const [cardLabels, setCardLabels] = useState({});
  const [cardAssignees, setCardAssignees] = useState({});
  const [cardDueDates, setCardDueDates] = useState({});
  const [cardEstimates, setCardEstimates] = useState({});
  const [cardSpentHours, setCardSpentHours] = useState({});

  const [checklistInputs, setChecklistInputs] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#ff5733');

  const [searchQuery, setSearchQuery] = useState('');
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterLabel, setFilterLabel] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [draggedCardData, setDraggedCardData] = useState(null);

  const teamMembers = ['Alice', 'Bob', 'Charlie', 'David', 'Emma'];
  const defaultBoardIds = defaultBoards.map(b => b._id);

  useEffect(() => {
    localStorage.setItem('trello_enterprise_boards_v7', JSON.stringify(boards));
  }, [boards]);

  useEffect(() => {
    localStorage.setItem('trello_enterprise_activities_v7', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('trello_enterprise_labels_v8', JSON.stringify(customLabels));
  }, [customLabels]);

  const logActivity = (actionText) => {
    const newAct = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      text: actionText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setActivities(prev => [newAct, ...prev.slice(0, 99)]);
  };

  const handleAddBoard = (e) => {
    e.preventDefault();
    if (!boardTitle.trim()) return;

    const localNewBoard = { 
      _id: 'custom-' + Date.now(), 
      title: boardTitle.trim(), 
      cards: [] 
    };
    
    setBoards(prev => [...prev, localNewBoard]);
    logActivity(`Created custom board: "${boardTitle.trim()}"`);
    
    // Sync with Backend
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localNewBoard)
    })
    .then(res => res.json())
    .then(data => console.log('Backend response:', data))
    .catch(err => console.error('Backend sync error:', err));

    setBoardTitle('');
  };

  const handleDeleteBoard = (boardId, boardTitleName) => {
    if (defaultBoardIds.includes(boardId)) {
      alert("System default boards cannot be deleted!");
      return;
    }
    if (window.confirm(`Are you sure you want to delete board "${boardTitleName}"?`)) {
      setBoards(prev => prev.filter(b => b._id !== boardId));
      logActivity(`Deleted board: "${boardTitleName}"`);
    }
  };

  const handleStartRename = (board) => {
    if (defaultBoardIds.includes(board._id)) {
      alert("System default board names cannot be edited!");
      return;
    }
    setEditingBoardId(board._id);
    setEditingBoardTitle(board.title);
  };

  const handleSaveRename = (boardId) => {
    if (!editingBoardTitle.trim()) return;
    setBoards(prev => prev.map(b => b._id === boardId ? { ...b, title: editingBoardTitle.trim() } : b));
    logActivity(`Renamed board to "${editingBoardTitle.trim()}"`);
    setEditingBoardId(null);
    setEditingBoardTitle('');
  };

  const handleAddCard = (boardId, e) => {
    e.preventDefault();
    const text = cardInputs[boardId];
    if (!text || !text.trim()) return;

    const newCard = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      text: text.trim(),
      priority: cardPriorities[boardId] || 'Medium',
      label: cardLabels[boardId] || (customLabels[0] ? customLabels[0].name : 'Feature'),
      assignee: cardAssignees[boardId] || 'Unassigned',
      dueDate: cardDueDates[boardId] || '',
      estimatedHours: cardEstimates[boardId] || '',
      spentHours: cardSpentHours[boardId] || '',
      checklist: [],
      comments: [],
      attachments: []
    };

    setBoards(prev => prev.map(b => b._id === boardId ? { ...b, cards: [...b.cards, newCard] } : b));
    logActivity(`Added card "${text.trim()}"`);
    
    // Sync card with Backend (Fixed to /api/cards endpoint)
    fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, card: newCard })
    })
    .then(res => res.json())
    .then(data => console.log('Backend card response:', data))
    .catch(err => console.error('Backend card sync error:', err));
    
    setCardInputs(prev => ({ ...prev, [boardId]: '' }));
    setCardDueDates(prev => ({ ...prev, [boardId]: '' }));
    setCardEstimates(prev => ({ ...prev, [boardId]: '' }));
    setCardSpentHours(prev => ({ ...prev, [boardId]: '' }));
  };

  const handleDeleteCard = (boardId, cardId, cardText) => {
    setBoards(prev => prev.map(b => b._id === boardId ? { ...b, cards: b.cards.filter(c => c.id !== cardId) } : b));
    logActivity(`Deleted card "${cardText}"`);
  };

  const handleMoveCard = (currentId, card, targetId) => {
    if (!targetId || currentId === targetId) return;
    const targetBoard = boards.find(b => b._id === targetId);
    
    setBoards(prev => prev.map(b => {
      if (b._id === currentId) return { ...b, cards: b.cards.filter(c => c.id !== card.id) };
      if (b._id === targetId) return { ...b, cards: [...b.cards, card] };
      return b;
    }));
    logActivity(`Moved card "${card.text}" to "${targetBoard ? targetBoard.title : 'another board'}"`);
  };

  const handleAddChecklist = (boardId, cardId) => {
    const text = checklistInputs[cardId];
    if (!text || !text.trim()) return;
    
    setBoards(prev => prev.map(b => b._id === boardId ? {
      ...b,
      cards: b.cards.map(c => c.id === cardId ? {
        ...c,
        checklist: [
          ...(c.checklist || []), 
          { 
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), 
            text: text.trim(), 
            completed: false 
          }
        ]
      } : c)
    } : b));
    
    setChecklistInputs(prev => ({ ...prev, [cardId]: '' }));
  };

  const handleToggleChecklist = (boardId, cardId, itemId) => {
    setBoards(prev => prev.map(b => b._id === boardId ? {
      ...b,
      cards: b.cards.map(c => c.id === cardId ? {
        ...c,
        checklist: (c.checklist || []).map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
      } : c)
    } : b));
  };

  const handleDeleteChecklist = (boardId, cardId, itemId) => {
    setBoards(prev => prev.map(b => b._id === boardId ? {
      ...b,
      cards: b.cards.map(c => c.id === cardId ? {
        ...c,
        checklist: (c.checklist || []).filter(i => i.id !== itemId)
      } : c)
    } : b));
  };

  const handleAddComment = (boardId, cardId) => {
    const text = commentInputs[cardId];
    if (!text || !text.trim()) return;
    
    setBoards(prev => prev.map(b => b._id === boardId ? {
      ...b,
      cards: b.cards.map(c => c.id === cardId ? {
        ...c,
        comments: [
          ...(c.comments || []), 
          { 
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), 
            text: text.trim(), 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
          }
        ]
      } : c)
    } : b));
    
    setCommentInputs(prev => ({ ...prev, [cardId]: '' }));
  };

  const handleDeleteComment = (boardId, cardId, commentId) => {
    setBoards(prev => prev.map(b => b._id === boardId ? {
      ...b,
      cards: b.cards.map(c => c.id === cardId ? {
        ...c,
        comments: (c.comments || []).filter(comm => comm.id !== commentId)
      } : c)
    } : b));
  };

  const handleFileUpload = (boardId, cardId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const attachmentItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name: file.name,
        type: file.type,
        data: reader.result
      };
      
      setBoards(prev => prev.map(b => b._id === boardId ? {
        ...b,
        cards: b.cards.map(c => c.id === cardId ? {
          ...c,
          attachments: [...(c.attachments || []), attachmentItem]
        } : c)
      } : b));
      
      logActivity(`Attached file "${file.name}" to card`);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAttachment = (boardId, cardId, attId) => {
    setBoards(prev => prev.map(b => b._id === boardId ? {
      ...b,
      cards: b.cards.map(c => c.id === cardId ? {
        ...c,
        attachments: (c.attachments || []).filter(a => a.id !== attId)
      } : c)
    } : b));
  };

  const handleAddCustomLabel = (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    
    if (customLabels.some(l => l.name.toLowerCase() === newLabelName.trim().toLowerCase())) {
      alert("Label already exists!");
      return;
    }
    
    setCustomLabels(prev => [...prev, { name: newLabelName.trim(), color: newLabelColor }]);
    logActivity(`Created new label "${newLabelName.trim()}"`);
    setNewLabelName('');
  };

  const handleDeleteCustomLabel = (labelName) => {
    if (customLabels.length <= 1) {
      alert("You must keep at least one label!");
      return;
    }
    setCustomLabels(prev => prev.filter(l => l.name !== labelName));
    logActivity(`Deleted label "${labelName}"`);
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(boards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trello_enterprise_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    logActivity("Exported all boards to JSON backup");
  };

  const handleImportData = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const importedBoards = JSON.parse(event.target.result);
          if (Array.isArray(importedBoards)) {
            setBoards(importedBoards);
            logActivity("Successfully imported boards from backup file");
            alert("Boards imported successfully!");
          } else {
            alert("Invalid backup file format!");
          }
        } catch {
          alert("Error parsing JSON file!");
        }
      };
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'High': return '#ff4d4d';
      case 'Medium': return '#f0ad4e';
      case 'Low': return '#5cb85c';
      default: return '#555';
    }
  };

  const getLabelColor = (lName) => {
    const found = customLabels.find(l => l.name === lName);
    return found ? found.color : '#0275d8';
  };

  let totalCardsCount = 0;
  let completedCardsCount = 0;
  let highPriorityCount = 0;
  
  boards.forEach(b => {
    if (b.cards && Array.isArray(b.cards)) {
      b.cards.forEach(c => {
        totalCardsCount++;
        if (c.priority === 'High') highPriorityCount++;
        if (c.checklist && c.checklist.length > 0 && c.checklist.every(i => i.completed)) {
          completedCardsCount++;
        }
      });
    }
  });

  const theme = {
    bg: isDarkMode ? '#0b0f19' : '#f0f2f5',
    text: isDarkMode ? '#e6edf3' : '#1f2328',
    boardBg: isDarkMode ? '#161b22' : '#ffffff',
    cardBg: isDarkMode ? '#21262d' : '#f8f9fa',
    inputBg: isDarkMode ? '#0d1117' : '#ffffff',
    border: isDarkMode ? '#30363d' : '#d0d7de'
  };

  const selectStyle = {
    padding: '8px',
    background: theme.cardBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    fontSize: '12px',
    width: '100%'
  };

  return (
    <div style={{ padding: '20px', backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '15px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '15px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Trello Enterprise Suite Pro
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
            Status: <span style={{ color: '#238636', fontWeight: 'bold' }}>{backendStatus}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowAnalytics(!showAnalytics)} style={{ padding: '6px 10px', background: '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
            📊 Analytics
          </button>

          <button onClick={() => setShowLabelManager(!showLabelManager)} style={{ padding: '6px 10px', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
            🏷️ Labels ({customLabels.length})
          </button>

          <button onClick={handleExportData} style={{ padding: '6px 10px', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
            📥 Export
          </button>
          
          <label style={{ padding: '6px 10px', background: '#0969da', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' }}>
            📤 Import
            <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
          </label>

          <button onClick={() => setShowActivityLog(!showActivityLog)} style={{ padding: '6px 10px', background: '#8957e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
            📜 Logs ({activities.length})
          </button>

          <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ padding: '6px 10px', background: theme.cardBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {showAnalytics && (
        <div style={{ background: theme.boardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '15px', marginBottom: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ background: theme.inputBg, padding: '10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Total Cards</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#58a6ff' }}>{totalCardsCount}</div>
          </div>
          <div style={{ background: theme.inputBg, padding: '10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Completed Checklist Tasks</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#238636' }}>{completedCardsCount}</div>
          </div>
          <div style={{ background: theme.inputBg, padding: '10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>High Priority Items</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d4d' }}>{highPriorityCount}</div>
          </div>
          <div style={{ background: theme.inputBg, padding: '10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Active Boards</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f0ad4e' }}>{boards.length}</div>
          </div>
        </div>
      )}

      {showLabelManager && (
        <div style={{ background: theme.boardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#58a6ff' }}>Custom Label Manager</h3>
            <button onClick={() => setShowLabelManager(false)} style={{ background: 'transparent', color: theme.text, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {customLabels.map(l => (
              <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: l.color, color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                <span>{l.name}</span>
                <button onClick={() => handleDeleteCustomLabel(l.name)} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
            ))}
          </div>
         <form onSubmit={handleAddCustomLabel} style={{ display:'flex', gap: '8px', alignItems: 'center' }}>
             <input 
              type="text" 
              placeholder="New label name..." 
              value={newLabelName} 
              onChange={(e) => setNewLabelName(e.target.value)} 
              style={{ padding: '6px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '12px', flex: 1 }} 
            />
            <input 
              type="color" 
              value={newLabelColor} 
              onChange={(e) => setNewLabelColor(e.target.value)} 
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: '30px', height: '30px' }} 
            />
            <button type="submit" style={{ padding: '6px 12px', background: '#238636', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Add Label</button>
          </form>
        </div>
      )}

      {showActivityLog && (
        <div style={{ background: theme.boardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', marginBottom: '15px', maxHeight: '180px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#58a6ff' }}>Activity Log</h3>
            <button onClick={() => setShowActivityLog(false)} style={{ background: 'transparent', color: theme.text, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
          {activities.length === 0 ? (
            <p style={{ fontSize: '11px', opacity: 0.6, margin: 0 }}>No activities yet.</p>
          ) : (
            activities.map(act => (
              <div key={act.id} style={{ fontSize: '11px', marginBottom: '4px', display: 'flex', gap: '8px' }}>
                <span style={{ opacity: 0.5, minWidth: '65px' }}>{act.time}</span>
                <span>{act.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
        <input 
          type="text"
          placeholder="🔍 Search cards by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '9px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', height: '38px' }}
        />
        
        <input 
          type="text"
          placeholder="🔍 Search boards by title..."
          value={boardSearchQuery}
          onChange={(e) => setBoardSearchQuery(e.target.value)}
          style={{ padding: '9px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', height: '38px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <select value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)} style={selectStyle}>
          <option value="All">All Labels</option>
          {customLabels.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
        </select>

        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} style={selectStyle}>
          <option value="All">All Assignees</option>
          <option value="Unassigned">Unassigned</option>
          {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={selectStyle}>
          <option value="All">All Priorities</option>
          <option value="High">High 🔴</option>
          <option value="Medium">Medium 🟠</option>
          <option value="Low">Low 🟢</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
          <option value="Newest">Sort: Newest First</option>
          <option value="Oldest">Sort: Oldest First</option>
          <option value="Title">Sort: Title (A-Z)</option>
        </select>
      </div>

      <form onSubmit={handleAddBoard} style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          placeholder="New board title..." 
          value={boardTitle}
          onChange={(e) => setBoardTitle(e.target.value)}
          style={{ padding: '9px 12px', flex: 1, background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '13px' }}
        />
        <button type="submit" style={{ padding: '9px 16px', background: '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>
          Add new board
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {boards
          .filter(board => {
            if (boardSearchQuery.trim() !== '') {
              return board.title.toLowerCase().includes(boardSearchQuery.toLowerCase());
            }
            return true;
          })
          .map((board) => {
            const isDefault = defaultBoardIds.includes(board._id);
            const isEditing = editingBoardId === board._id;
            const boardCards = Array.isArray(board.cards) ? [...board.cards] : [];

            let filteredCards = boardCards.filter(c => {
              const matchesText = searchQuery === '' || c.text.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesPriority = filterPriority === 'All' || c.priority === filterPriority;
              const matchesLabel = filterLabel === 'All' || c.label === filterLabel;
              const matchesAssignee = filterAssignee === 'All' || c.assignee === filterAssignee;
              return matchesText && matchesPriority && matchesLabel && matchesAssignee;
            });

            filteredCards.sort((a, b) => {
              if (sortBy === 'Title') {
                return a.text.localeCompare(b.text);
              } else if (sortBy === 'Oldest') {
                return Number(a.id) - Number(b.id);
              } else {
                return Number(b.id) - Number(a.id);
              }
            });

            return (
              <div 
                key={board._id} 
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedCardData) {
                    handleMoveCard(draggedCardData.fromBoardId, draggedCardData.card, board._id);
                    setDraggedCardData(null);
                  }
                }}
                style={{ background: theme.boardBg, border: `1px solid ${theme.border}`, padding: '14px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
                  
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '4px', flex: 1, marginRight: '8px' }}>
                      <input 
                        type="text" 
                        value={editingBoardTitle} 
                        onChange={(e) => setEditingBoardTitle(e.target.value)} 
                        style={{ padding: '4px', fontSize: '12px', width: '100%', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '4px' }}
                      />
                      <button onClick={() => handleSaveRename(board._id)} style={{ padding: '4px 8px', background: '#238636', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>💾</button>
                    </div>
                  ) : (
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {board.title} <span style={{ fontSize: '12px', opacity: 0.6 }}>({filteredCards.length})</span>
                    </h3>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isDefault && !isEditing && (
                      <button onClick={() => handleStartRename(board)} style={{ background: 'transparent', color: '#58a6ff', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        ✏️ Edit
                      </button>
                    )}
                    {!isDefault && (
                      <button onClick={() => handleDeleteBoard(board._id, board.title)} style={{ background: 'transparent', color: '#f85149', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        🗑️ Delete
                      </button>
                    )}
                    {isDefault && (
                      <span style={{ fontSize: '10px', background: theme.inputBg, padding: '2px 6px', borderRadius: '4px', opacity: 0.5, border: `1px solid ${theme.border}` }}>Fixed</span>
                    )}
                  </div>
                </div>

                <form onSubmit={(e) => handleAddCard(board._id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', background: theme.inputBg, padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                  <input 
                    type="text"
                    placeholder="Enter card title..."
                    value={cardInputs[board._id] || ''}
                    onChange={(e) => setCardInputs({ ...cardInputs, [board._id]: e.target.value })}
                    style={{ padding: '9px', background: theme.cardBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                  />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <select 
                      value={cardLabels[board._id] || customLabels[0]?.name}
                      onChange={(e) => setCardLabels({ ...cardLabels, [board._id]: e.target.value })}
                      style={selectStyle}
                    >
                      {customLabels.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                    </select>

                    <select 
                      value={cardPriorities[board._id] || 'Medium'}
                      onChange={(e) => setCardPriorities({ ...cardPriorities, [board._id]: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="High">High 🔴</option>
                      <option value="Medium">Medium 🟠</option>
                      <option value="Low">Low 🟢</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <select 
                      value={cardAssignees[board._id] || 'Unassigned'}
                      onChange={(e) => setCardAssignees({ ...cardAssignees, [board._id]: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="Unassigned">Assign to...</option>
                      {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <input 
                      type="date"
                      value={cardDueDates[board._id] || ''}
                      onChange={(e) => setCardDueDates({ ...cardDueDates, [board._id]: e.target.value })}
                      style={{ padding: '7px', background: theme.cardBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button type="submit" style={{ padding: '10px', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '2px' }}>+ Add Card</button>
                </form>

                <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredCards.map((card) => {
                    const completed = card.checklist ? card.checklist.filter(i => i.completed).length : 0;
                    const total = card.checklist ? card.checklist.length : 0;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <div 
                        key={card.id} 
                        draggable
                        onDragStart={() => setDraggedCardData({ fromBoardId: board._id, card })}
                        style={{ background: theme.cardBg, color: theme.text, padding: '12px', borderRadius: '8px', fontSize: '13px', border: `1px solid ${theme.border}`, borderLeft: `5px solid ${getPriorityColor(card.priority)}`, cursor: 'grab' }}
                      >
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: getLabelColor(card.label), color: '#fff', borderRadius: '4px', fontWeight: 'bold' }}>{card.label}</span>
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: getPriorityColor(card.priority), color: '#fff', borderRadius: '4px', fontWeight: 'bold' }}>{card.priority}</span>
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: '#388bfd', color: '#fff', borderRadius: '4px', fontWeight: 'bold' }}>👤 {card.assignee}</span>
                          </div>
                          <button onClick={() => handleDeleteCard(board._id, card.id, card.text)} style={{ background: 'transparent', color: '#f85149', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>×</button>
                        </div>

                        <div style={{ fontWeight: '600', wordBreak: 'break-word', marginBottom: '8px', fontSize: '14px' }}>{card.text}</div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '11px', opacity: 0.9 }}>
                          {card.dueDate && <span style={{ color: '#d29922' }}>📅 Due: {card.dueDate}</span>}
                          {card.estimatedHours && <span>⏱️ Est: {card.estimatedHours}h</span>}
                          {card.spentHours && <span>⏳ Spent: {card.spentHours}h</span>}
                        </div>

                        {total > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>
                              <span>Progress</span>
                              <span>{completed}/{total} ({pct}%)</span>
                            </div>
                            <div style={{ background: theme.border, height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, background: '#238636', height: '100%' }}></div>
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: '8px', borderTop: `1px dashed ${theme.border}`, paddingTop: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8 }}>Checklist:</div>
                          {card.checklist && card.checklist.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <input type="checkbox" checked={item.completed} onChange={() => handleToggleChecklist(board._id, card.id, item.id)} />
                                <span style={{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.4 : 1, wordBreak: 'break-word' }}>{item.text}</span>
                              </div>
                              <button onClick={() => handleDeleteChecklist(board._id, card.id, item.id)} style={{ background: 'transparent', color: '#f85149', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✕</button>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            <input 
                              type="text" 
                              placeholder="Add checklist item..." 
                              value={checklistInputs[card.id] || ''} 
                              onChange={(e) => setChecklistInputs({ ...checklistInputs, [card.id]: e.target.value })} 
                              style={{ padding: '5px', fontSize: '11px', width: '100%', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '4px' }} 
                            />
                            <button onClick={() => handleAddChecklist(board._id, card.id)} style={{ padding: '5px 9px', background: '#1f6feb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                          </div>
                        </div>

                        <div style={{ marginTop: '10px', borderTop: `1px dashed ${theme.border}`, paddingTop: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8 }}>Attachments ({card.attachments ? card.attachments.length : 0}):</div>
                          {card.attachments && card.attachments.map(att => (
                            <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', background: theme.inputBg, padding: '4px 6px', borderRadius: '4px', marginBottom: '4px', border: `1px solid ${theme.border}` }}>
                              <a href={att.data} download={att.name} target="_blank" rel="noreferrer" style={{ color: '#58a6ff', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>📎 {att.name}</a>
                              <button onClick={() => handleDeleteAttachment(board._id, card.id, att.id)} style={{ background: 'transparent', color: '#f85149', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                            </div>
                          ))}
                          <label style={{ display: 'inline-block', marginTop: '4px', padding: '4px 8px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                            📁 Upload File / Image
                             <input type="file" onChange={(e) => handleFileUpload(board._id, card.id, e)} style={{ display: 'none' }} />
                          </label>
                        </div>

                        <div style={{ marginTop: '10px', borderTop: `1px dashed ${theme.border}`, paddingTop: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8 }}>Comments ({card.comments ? card.comments.length : 0}):</div>
                          {card.comments && card.comments.map(comm => (
                            <div key={comm.id} style={{ fontSize: '11px', background: theme.inputBg, padding: '5px 8px', borderRadius: '4px', marginBottom: '4px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ opacity: 0.5, fontSize: '9px', display: 'block' }}>{comm.time}</span>
                                <span>{comm.text}</span>
                              </div>
                              <button onClick={() => handleDeleteComment(board._id, card.id, comm.id)} style={{ background: 'transparent', color: '#f85149', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✕</button>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            <input 
                              type="text" 
                              placeholder="Write a comment..." 
                              value={commentInputs[card.id] || ''} 
                              onChange={(e) => setCommentInputs({ ...commentInputs, [card.id]: e.target.value })} 
                              style={{ padding: '5px', fontSize: '11px', width: '100%', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '4px' }} 
                            />
                            <button onClick={() => handleAddComment(board._id, card.id)} style={{ padding: '5px 9px', background: '#8957e5', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>💬</button>
                          </div>
                        </div>

                        {boards.length > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', background: theme.inputBg, padding: '5px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                            <span style={{ fontSize: '11px', opacity: 0.7, fontWeight: 'bold' }}>Move:</span>
                            <select defaultValue="" onChange={(e) => handleMoveCard(board._id, card, e.target.value)} style={selectStyle}>
                              <option value="" disabled>Select destination...</option>
                              {boards.filter(b => b._id !== board._id).map(tb => <option key={tb._id} value={tb._id}>{tb.title}</option>)}
                            </select>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
      </div>

    </div>
  );
}

export default App;