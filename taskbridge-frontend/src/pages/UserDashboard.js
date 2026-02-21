import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import Logo from "../components/Logo";
import { useSettings } from "../context/SettingsContext";

function UserDashboard() {
    const { settings } = useSettings();
    const [tasks, setTasks] = useState([]);
    const [managers, setManagers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState("requests");
    const [draftSaved, setDraftSaved] = useState(false);
    const [showDraftPanel, setShowDraftPanel] = useState(false);
    const [historyFilter, setHistoryFilter] = useState("ALL"); // ALL | COMPLETED | REJECTED
    const [savedDraftData, setSavedDraftData] = useState(() => {
        try { const s = localStorage.getItem("taskbridge_task_draft"); return s ? JSON.parse(s) : null; } catch { return null; }
    });
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const fileInputRef = useRef(null);

    const DRAFT_KEY = "taskbridge_task_draft";

    const loadDraft = () => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            return saved ? JSON.parse(saved) : { title: "", description: "", category: "IT_SUPPORT", priority: "MEDIUM", deadline: "" };
        } catch { return { title: "", description: "", category: "IT_SUPPORT", priority: "MEDIUM", deadline: "" }; }
    };

    const [form, setForm] = useState({ title: "", description: "", category: "IT_SUPPORT", priority: "MEDIUM", deadline: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document.body.className = 'user-theme';
        fetchTasks();
        fetchManagers();
        fetchNotifications();
        fetchUnreadCount();
        fetchMessages();
        return () => { document.body.className = ''; };
    }, []);

    // Live polling: re-fetch tasks every 15 seconds so history stays up to date
    useEffect(() => {
        const interval = setInterval(() => {
            fetchTasks();
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications");
            setNotifications(res.data);
            fetchUnreadCount(); // Keep count in sync when full list is fetched
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get("/notifications/unread-count");
            setUnreadCount(res.data);
        } catch (err) {
            console.error("Failed to fetch unread count", err);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get("/messages");
            setChatMessages(res.data);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    const fetchManagers = async () => {
        try {
            const res = await api.get("/users");
            setManagers(res.data.filter(u => u.role === 'MANAGER'));
        } catch (err) {
            console.error("Failed to fetch support personnel", err);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await api.get("/tasks");
            setTasks(res.data);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        }
    };

    const addNotification = (title, msg) => {
        const newNotif = {
            id: Date.now(),
            title,
            msg,
            time: "Just now"
        };
        setNotifications(prev => [newNotif, ...prev]);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            addNotification("File Attached", `Selected: ${file.name}`);
        }
    };

    // ── Draft helpers ──────────────────────────────────────────────────
    const saveDraft = () => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setSavedDraftData({ ...form });
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
        setForm({ title: "", description: "", category: "IT_SUPPORT", priority: "MEDIUM", deadline: "" });
        setSelectedFile(null);
        setDraftSaved(false);
        setSavedDraftData(null);
        setShowDraftPanel(false);
    };

    const restoreDraft = () => {
        if (savedDraftData) {
            setForm({ ...savedDraftData });
            setShowDraftPanel(false);
        }
    };
    // ──────────────────────────────────────────────────────────────────

    const createTask = async () => {
        if (!form.title || !form.description || !form.deadline) {
            alert("Please fill all fields including Deadline");
            return;
        }
        setLoading(true);

        try {
            // Mocking file upload progress if file exists
            if (selectedFile) {
                console.log("Simulating upload of:", selectedFile.name);
            }

            await api.post("/tasks", form);
            const taskTitle = form.title;
            localStorage.removeItem(DRAFT_KEY); // clear draft on success
            setForm({ title: "", description: "", category: "IT_SUPPORT", priority: "MEDIUM", deadline: "" });
            setSelectedFile(null);
            fetchTasks();

            // Live notification
            addNotification("Task Created", `Request "${taskTitle}" has been submitted successfully.`);
            alert("Application submitted successfully! 🚀");
        } catch (err) {
            console.error("Task submission error:", err);
            const errorData = err.response?.data;
            const msg = typeof errorData === 'object' ? JSON.stringify(errorData) : (errorData || err.message);
            alert("Failed to submit request: " + msg);
        } finally {
            setLoading(false);
        }
    };

    const completeTask = async (id, title) => {
        try {
            await api.put(`/tasks/${id}/complete`, {}); // Send empty body
            fetchTasks();
            addNotification("Task Completed", `Great! your task "${title}" is now done.`);
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const reRequestTask = async (id, title) => {
        if (!window.confirm("Do you want to re-request this task?")) return;
        try {
            await api.put(`/tasks/${id}/rerequest`);
            fetchTasks();
            addNotification("Task Re-Requested", `Request "${title}" has been reopened.`);
        } catch (err) {
            alert("Failed to re-request");
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        const optimisticMsg = { id: Date.now(), content: newMessage, type: "sent" };
        setChatMessages(prev => [...prev, optimisticMsg]);
        const currentMsg = newMessage;
        setNewMessage("");

        try {
            await api.post("/messages", { content: currentMsg });
            fetchMessages();
            fetchUnreadCount(); // Refresh count for the bot reply
        } catch (err) {
            console.error("Failed to sync message", err);
        }
    };

    const markNotificationAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        active: tasks.filter(t => t.status !== 'COMPLETED').length
    };

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
        <div className="dashboard-container">
            {settings.maintenanceMode && (
                <div style={{ background: 'var(--danger)', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '12px', marginBottom: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    PLATFORM UNDER MAINTENANCE - MISSION REQUESTS ARE TEMPORARILY DISABLED
                </div>
            )}
            <header className="dashboard-header">
                <Logo size={40} />
                <div style={{ display: 'flex', gap: 16 }}>
                    <div className="btn-premium btn-outline-glass" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setActiveTab("inbox"); fetchUnreadCount(); }}>
                        Notifications <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>
                    </div>
                    <button className="btn-premium btn-outline-glass" onClick={() => { const draft = localStorage.getItem(DRAFT_KEY); localStorage.clear(); if (draft) localStorage.setItem(DRAFT_KEY, draft); window.location.href = '/login'; }}>
                        Logout
                    </button>
                </div>
            </header>

            {/* Rank & Achievement Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <div className={`rank-badge rank-${stats.completed > 20 ? 'elite' : stats.completed > 5 ? 'agent' : 'novice'}`}>
                    <div className="rank-icon"></div>
                    LEVEL: {stats.completed > 20 ? 'ELITE OPERATIVE' : stats.completed > 5 ? 'FIELD AGENT' : 'NOVICE UNIT'}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
                <span onClick={() => setActiveTab("requests")} style={{ cursor: 'pointer', fontWeight: 800, color: activeTab === "requests" ? "var(--user-primary)" : "rgba(255,255,255,0.4)", borderBottom: activeTab === "requests" ? "2px solid var(--user-primary)" : "none", paddingBottom: 16 }}>My Requests</span>
                <span onClick={() => setActiveTab("history")} style={{ cursor: 'pointer', fontWeight: 800, color: activeTab === "history" ? "var(--user-primary)" : "rgba(255,255,255,0.4)", borderBottom: activeTab === "history" ? "2px solid var(--user-primary)" : "none", paddingBottom: 16 }}>Task History</span>
                <span onClick={() => setActiveTab("chat")} style={{ cursor: 'pointer', fontWeight: 800, color: activeTab === "chat" ? "var(--user-primary)" : "rgba(255,255,255,0.4)", borderBottom: activeTab === "chat" ? "2px solid var(--user-primary)" : "none", paddingBottom: 16 }}>Support Chat</span>
                <span onClick={() => { setActiveTab("inbox"); fetchUnreadCount(); }} style={{ cursor: 'pointer', fontWeight: 800, color: activeTab === "inbox" ? "var(--user-primary)" : "rgba(255,255,255,0.4)", borderBottom: activeTab === "inbox" ? "2px solid var(--user-primary)" : "none", paddingBottom: 16 }}>Notifications</span>
            </div>

            {loading && tasks.length === 0 ? (
                <div className="dashboard-grid">
                    <div className="glass-card skeleton-box skeleton"></div>
                    <div className="glass-card skeleton-box skeleton"></div>
                </div>
            ) : (
                <>

                    {activeTab === "requests" && (
                        <div className="dashboard-grid">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                <section className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                                    <div className="stat-card">
                                        <span className="stat-value">{stats.active}</span>
                                        <span className="stat-label">Active Requests</span>
                                    </div>
                                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(255,255,255,0.05) 100%)' }}>
                                        <span className="stat-value">{completionRate}%</span>
                                        <span className="stat-label">Success Rate</span>
                                    </div>
                                </section>

                                <div className="glass-card">
                                    <h2 style={{ fontSize: '1.5rem', marginBottom: 24, fontWeight: 800 }}>Create New Request</h2>
                                    <div className="form-group">
                                        <label>Request Title</label>
                                        <input placeholder="e.g. System Access Issue" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    </div>

                                    <div className="form-group">
                                        <label>Description & Evidence</label>
                                        <textarea rows="3" placeholder="Detailed description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
                                    </div>

                                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                                    <div className="file-dropzone" onClick={() => fileInputRef.current.click()}>
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>{selectedFile ? '📄' : '📁'}</div>
                                        <div style={{ fontWeight: 700 }}>{selectedFile ? selectedFile.name : 'Click or Drag files to upload'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{selectedFile ? `Size: ${(selectedFile.size / 1024).toFixed(1)} KB` : 'Support JPG, PNG, PDF (Max 10MB)'}</div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Priority</label>
                                            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="URGENT">Urgent</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Deadline</label>
                                            <input type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                        <button className="btn-premium btn-outline-glass" onClick={saveDraft} style={{ flex: 1, justifyContent: 'center', borderColor: draftSaved ? 'var(--success, #22c55e)' : undefined, color: draftSaved ? 'var(--success, #22c55e)' : undefined }}>
                                            {draftSaved ? '✅ Draft Saved!' : '💾 Save Draft'}
                                        </button>
                                        {savedDraftData && (
                                            <button className="btn-premium btn-outline-glass" onClick={() => setShowDraftPanel(p => !p)} style={{ padding: '0 14px', justifyContent: 'center', borderColor: showDraftPanel ? 'var(--user-primary)' : undefined, color: showDraftPanel ? 'var(--user-primary)' : undefined }} title="View saved draft">
                                                📋
                                            </button>
                                        )}
                                        <button className="btn-premium btn-outline-glass" onClick={clearDraft} style={{ padding: '0 16px', justifyContent: 'center', opacity: 0.6 }} title="Clear form">
                                            🗑
                                        </button>
                                    </div>

                                    {showDraftPanel && savedDraftData && (
                                        <div style={{ marginTop: 12, padding: 16, borderRadius: 12, background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.25)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--user-primary)' }}>📋 Saved Draft</span>
                                                <button onClick={() => setShowDraftPanel(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                                                <div><span style={{ opacity: 0.5, marginRight: 8 }}>Title:</span><span style={{ fontWeight: 700 }}>{savedDraftData.title || '—'}</span></div>
                                                <div><span style={{ opacity: 0.5, marginRight: 8 }}>Description:</span><span style={{ opacity: 0.8 }}>{savedDraftData.description || '—'}</span></div>
                                                <div style={{ display: 'flex', gap: 24 }}>
                                                    <div><span style={{ opacity: 0.5, marginRight: 8 }}>Priority:</span><span>{savedDraftData.priority || '—'}</span></div>
                                                    <div><span style={{ opacity: 0.5, marginRight: 8 }}>Deadline:</span><span>{savedDraftData.deadline ? new Date(savedDraftData.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span></div>
                                                </div>
                                            </div>
                                            <button className="btn-premium btn-primary-user" onClick={restoreDraft} style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: '0.85rem' }}>
                                                ↩ Restore to Form
                                            </button>
                                        </div>
                                    )}
                                    <button className="btn-premium btn-primary-user" onClick={createTask} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                                        {loading ? "Submitting Identity..." : "Finalize Application"}
                                    </button>
                                </div>
                            </div>

                            <div className="glass-card" style={{ maxHeight: '800px', overflowY: 'auto' }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: 24, fontWeight: 800 }}>Request History</h2>
                                {tasks.length === 0 ? <div className="empty-state">No active requests found.</div> : (
                                    <ul className="task-list">
                                        {tasks.map(t => (
                                            <li key={t.id} className="task-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <span className={`badge badge-${t.priority?.toLowerCase() || 'medium'}`}>{t.priority}</span>
                                                        <strong style={{ fontSize: '1.2rem' }}>{t.title}</strong>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                                </div>
                                                <p style={{ margin: 0, opacity: 0.7 }}>{t.description}</p>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', gap: 16, width: '100%', flexDirection: 'column' }}>
                                                        {/* Mission Tracker Component */}
                                                        <div className="mission-tracker">
                                                            <div className="tracker-line">
                                                                <div className="tracker-line-progress" style={{
                                                                    width: t.status === 'PENDING' ? '0%' : t.status === 'IN_PROGRESS' ? '50%' : '100%'
                                                                }}></div>
                                                            </div>
                                                            <div className="tracker-step">
                                                                <div className={`step-dot ${['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(t.status) ? 'active' : ''}`}></div>
                                                                <div className={`step-label ${['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(t.status) ? 'active' : ''}`}>Requested</div>
                                                            </div>
                                                            <div className="tracker-step">
                                                                <div className={`step-dot ${['IN_PROGRESS', 'COMPLETED'].includes(t.status) ? 'active' : ''}`}></div>
                                                                <div className={`step-label ${['IN_PROGRESS', 'COMPLETED'].includes(t.status) ? 'active' : ''}`}>In Progress</div>
                                                            </div>
                                                            <div className="tracker-step">
                                                                <div className={`step-dot ${t.status === 'COMPLETED' ? 'active' : ''}`}></div>
                                                                <div className={`step-label ${t.status === 'COMPLETED' ? 'active' : ''}`}>Verified</div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', gap: 16 }}>
                                                                {t.status === 'COMPLETED' ? (
                                                                    <div className="rating-stars">
                                                                        <span>★</span><span>★</span><span>★</span><span>★</span><span className="star">★</span>
                                                                    </div>
                                                                ) : (
                                                                    <button className="btn-premium btn-outline-glass" onClick={() => { setActiveTab("chat"); window.scrollTo(0, 0); }} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Send Message</button>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                {t.status === 'COMPLETED' ? (
                                                                    <button className="btn-premium btn-primary-user" onClick={() => reRequestTask(t.id, t.title)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Re-Request</button>
                                                                ) : (
                                                                    <button className="btn-premium btn-outline-glass" onClick={() => completeTask(t.id, t.title)} style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--user-primary)', color: 'var(--user-primary)' }}>Mark Done</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "history" && (() => {
                        const historyTasks = tasks
                            .filter(t => t.status === 'COMPLETED' || t.status === 'REJECTED')
                            .filter(t => historyFilter === 'ALL' || t.status === historyFilter)
                            .sort((a, b) => {
                                const dateA = new Date(a.completedAt || a.createdAt || 0);
                                const dateB = new Date(b.completedAt || b.createdAt || 0);
                                return dateB - dateA; // newest first
                            });

                        return (
                            <div className="glass-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Task History</h2>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['ALL', 'COMPLETED', 'REJECTED'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setHistoryFilter(f)}
                                                className={`btn-premium ${historyFilter === f ? 'btn-primary-user' : 'btn-outline-glass'}`}
                                                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                                            >
                                                {f === 'ALL' ? 'All' : f === 'COMPLETED' ? '✓ Completed' : '✕ Rejected'}
                                            </button>
                                        ))}
                                        <button
                                            className="btn-premium btn-outline-glass"
                                            onClick={fetchTasks}
                                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                            title="Refresh"
                                        >↻ Refresh</button>
                                    </div>
                                </div>

                                {historyTasks.length === 0 ? (
                                    <div className="empty-state">No {historyFilter !== 'ALL' ? historyFilter.toLowerCase() : 'completed or rejected'} tasks yet.</div>
                                ) : (
                                    <ul className="task-list">
                                        {historyTasks.map(t => (
                                            <li key={t.id} className="task-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>

                                                {/* Header row: priority badge + title + status chip */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span className={`badge badge-${t.priority?.toLowerCase() || 'medium'}`}>{t.priority}</span>
                                                        <strong style={{ fontSize: '1.1rem' }}>{t.title}</strong>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                                                        background: t.status === 'COMPLETED' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                        color: t.status === 'COMPLETED' ? '#22c55e' : '#ef4444',
                                                        border: `1px solid ${t.status === 'COMPLETED' ? '#22c55e' : '#ef4444'}`
                                                    }}>
                                                        {t.status === 'COMPLETED' ? '✓ Completed' : '✕ Rejected'}
                                                    </span>
                                                </div>

                                                {/* Description */}
                                                <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>{t.description}</p>

                                                {/* Meta row */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, width: '100%', fontSize: '0.78rem', opacity: 0.55 }}>
                                                    <span>Category: <strong style={{ opacity: 1 }}>{t.category || '—'}</strong></span>
                                                    <span>Priority: <strong style={{ opacity: 1 }}>{t.priority || '—'}</strong></span>
                                                    <span>Deadline: <strong style={{ opacity: 1 }}>{t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}</strong></span>
                                                    {t.assignedTo && (
                                                        <span>Handler: <strong style={{ opacity: 1, color: 'var(--user-primary)' }}>{t.assignedTo.name}</strong></span>
                                                    )}
                                                </div>

                                                {/* Timestamps */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, width: '100%', fontSize: '0.75rem', opacity: 0.4 }}>
                                                    {t.createdAt && (
                                                        <span>Submitted: {new Date(t.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                    )}
                                                    {t.startedAt && (
                                                        <span>Started: {new Date(t.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                    )}
                                                    {t.completedAt && (
                                                        <span>{t.status === 'COMPLETED' ? 'Completed' : 'Closed'}: <strong style={{ color: t.status === 'COMPLETED' ? '#22c55e' : '#ef4444', opacity: 1 }}>{new Date(t.completedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                                                    )}
                                                </div>

                                                {/* Feedback / Rejection Reason */}
                                                {t.status === 'COMPLETED' && t.feedback && (
                                                    <div style={{ width: '100%', padding: '10px 14px', background: 'rgba(34,197,94,0.07)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)', fontSize: '0.85rem' }}>
                                                        <span style={{ opacity: 0.5, marginRight: 6 }}>Handler feedback:</span>
                                                        <span style={{ opacity: 0.9 }}>{t.feedback}</span>
                                                    </div>
                                                )}
                                                {t.status === 'REJECTED' && t.rejectionReason && (
                                                    <div style={{ width: '100%', padding: '10px 14px', background: 'rgba(239,68,68,0.07)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem' }}>
                                                        <span style={{ opacity: 0.5, marginRight: 6 }}>Rejection reason:</span>
                                                        <span style={{ opacity: 0.9 }}>{t.rejectionReason}</span>
                                                    </div>
                                                )}

                                                {/* Quality Score */}
                                                {t.qualityScore && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                                                        <span style={{ opacity: 0.5 }}>Quality Score:</span>
                                                        <span style={{ color: '#facc15', fontSize: '1rem', letterSpacing: 2 }}>
                                                            {'★'.repeat(t.qualityScore)}{'☆'.repeat(5 - t.qualityScore)}
                                                        </span>
                                                        <span style={{ opacity: 0.5 }}>{t.qualityScore}/5</span>
                                                    </div>
                                                )}

                                                {/* Re-Request button for completed tasks */}
                                                {t.status === 'COMPLETED' && (
                                                    <button className="btn-premium btn-primary-user" onClick={() => reRequestTask(t.id, t.title)} style={{ padding: '6px 14px', fontSize: '0.75rem' }}>Re-Request</button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === "chat" && (
                        <div className="glass-card">
                            <h2 style={{ marginBottom: 24 }}>Support Intelligence</h2>
                            <div className="chat-container">
                                <div className="chat-messages">
                                    {chatMessages.map(m => (
                                        <div key={m.id} className={`message ${m.type}`}>{m.content}</div>
                                    ))}
                                </div>
                                <div className="chat-input-area">
                                    <input placeholder="Type message to support..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
                                    <button className="btn-premium btn-primary-user" onClick={sendMessage}>Send</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "inbox" && (
                        <div className="glass-card">
                            <h2 style={{ marginBottom: 24 }}>Centralized Notifications</h2>
                            <div className="notification-inbox">
                                <section style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: 16, opacity: 0.7 }}>Support Personnel Status</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                        {managers.map(m => (
                                            <div key={m.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, margin: 0, minWidth: 200 }}>
                                                <div style={{ fontSize: '1.2rem' }}>{m.available ? '⚡' : '🌙'}</div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</div>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{m.available ? 'Active Duty' : 'Offline'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {notifications.length === 0 ? <div className="empty-state">No notifications.</div> : notifications.map(n => (
                                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => markNotificationAsRead(n.id)} style={{ cursor: 'pointer', opacity: n.read ? 0.6 : 1, position: 'relative' }}>
                                        <div style={{ padding: 12, background: !n.read ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 12 }}>🔔</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 800 }}>{n.title} {!n.read && <span style={{ color: 'var(--user-primary)', fontSize: '0.6rem', verticalAlign: 'middle' }}>● NEW</span>}</div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{n.message}</div>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default UserDashboard;
