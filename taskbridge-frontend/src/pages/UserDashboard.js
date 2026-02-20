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
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "IT_SUPPORT",
        priority: "MEDIUM",
        deadline: ""
    });
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
                    <button className="btn-premium btn-outline-glass" onClick={() => { localStorage.clear(); window.location.href = '/login'; }}>
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

                                    <button className="btn-premium btn-primary-user" onClick={createTask} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
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
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date().toLocaleDateString()}</span>
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
