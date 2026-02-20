import { useState, useEffect } from "react";
import api from "../api/axios";
import Logo from "../components/Logo";
import { useSettings } from "../context/SettingsContext";

function AdminDashboard() {
    const { settings, refreshSettings: refreshGlobal } = useSettings();
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [activeTab, setActiveTab] = useState("analytics"); // analytics, directory, logs, disputes, settings
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "MANAGER" });
    const [systemSettings, setSystemSettings] = useState({
        platformName: "TaskBridge Enterprise",
        defaultPriority: "MEDIUM",
        requireMFA: true,
        autoArchive: true,
        maintenanceMode: false
    });
    const [saveStatus, setSaveStatus] = useState("");

    useEffect(() => {
        document.body.className = 'admin-theme';
        fetchData();
        return () => { document.body.className = ''; };
    }, []);

    useEffect(() => {
        if (activeTab === "logs") {
            fetchLogs();
        }
        if (activeTab === "disputes") {
            fetchDisputes();
        }
        if (activeTab === "settings") {
            fetchSettings();
        }
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            const res = await api.get("/admin/settings");
            const settingsMap = {};
            res.data.forEach(s => {
                let val = s.settingValue;
                if (val === "true") val = true;
                if (val === "false") val = false;
                settingsMap[s.settingKey] = val;
            });
            if (Object.keys(settingsMap).length > 0) {
                setSystemSettings(prev => ({ ...prev, ...settingsMap }));
            }
        } catch (err) {
            console.error("Failed to fetch settings", err);
        }
    };

    const saveSetting = async (key, value) => {
        try {
            await api.post("/admin/settings", { settingKey: key, settingValue: String(value) });
        } catch (err) {
            console.error("Failed to save setting", err);
            throw err;
        }
    };

    const handleApplyChanges = async () => {
        setLoading(true);
        try {
            // Save all current settings values
            await Promise.all(Object.entries(systemSettings).map(([key, value]) =>
                saveSetting(key, value)
            ));
            setSaveStatus("System configurations updated successfully.");
            refreshGlobal();
            setTimeout(() => setSaveStatus(""), 3000);
            fetchLogs(); // Refresh logs to show the update
        } catch (err) {
            alert("Failed to apply some changes.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDisputes = () => {
        // Filter tasks that might represent disputes (e.g., REJECTED tasks with specific notes)
        setDisputes(tasks.filter(t => t.status === 'REJECTED'));
    };

    const fetchData = async () => {
        try {
            const [usersRes, tasksRes] = await Promise.all([
                api.get("/users"),
                api.get("/tasks")
            ]);
            setUsers(usersRes.data);
            setTasks(tasksRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.get("/admin/logs");
            setAuditLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/users/${id}`);
            fetchData();
        } catch (err) {
            alert("Failed to delete user");
        }
    };

    const toggleSuspension = async (id) => {
        try {
            await api.put(`/users/${id}/status`);
            fetchData();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const changeRole = async (id, newRole) => {
        try {
            await api.put(`/users/${id}/role`, newRole, { headers: { 'Content-Type': 'text/plain' } });
            fetchData();
        } catch (err) {
            alert("Failed to update role");
        }
    };

    const createUser = async () => {
        if (!form.name || !form.email || !form.password) return alert("Fill all fields");
        setLoading(true);
        try {
            await api.post("/auth/register", form);
            setForm({ name: "", email: "", password: "", role: "MANAGER" });
            fetchData();
        } catch (err) {
            alert(err.response?.data || "Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    // Analytics Helper
    const stats = {
        totalUsers: users.length,
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        todoList: tasks.filter(t => (t.status === 'PENDING' && t.assignedTo != null) || t.status === 'IN_PROGRESS').length,
        availableQueue: tasks.filter(t => t.status === 'PENDING' && !t.assignedTo).length,
        rejected: tasks.filter(t => t.status === 'REJECTED').length,
        successRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100) : 0,
        managers: users.filter(u => u.role === 'MANAGER').length,
        admins: users.filter(u => u.role === 'ADMIN').length,
        clients: users.filter(u => u.role === 'USER').length,
    };

    return (
        <div className="dashboard-container">
            {settings.maintenanceMode && (
                <div style={{ background: 'var(--danger)', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '12px', marginBottom: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    SYSTEM MAINTENANCE MODE ACTIVE - SOME FEATURES MAY BE LIMITED
                </div>
            )}
            <header className="dashboard-header">
                <Logo size={40} />
                <div style={{ display: 'flex', gap: 16 }}>
                    <nav style={{ display: 'flex', gap: 10 }}>
                        <button className={`btn-premium ${activeTab === 'analytics' ? 'btn-primary-admin' : 'btn-outline-glass'}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
                        <button className={`btn-premium ${activeTab === 'directory' ? 'btn-primary-admin' : 'btn-outline-glass'}`} onClick={() => setActiveTab('directory')}>Directory</button>
                        <button className={`btn-premium ${activeTab === 'logs' ? 'btn-primary-admin' : 'btn-outline-glass'}`} onClick={() => setActiveTab('logs')}>Audit Logs</button>
                        <button className={`btn-premium ${activeTab === 'disputes' ? 'btn-primary-admin' : 'btn-outline-glass'}`} onClick={() => setActiveTab('disputes')}>Disputes</button>
                        <button className={`btn-premium ${activeTab === 'settings' ? 'btn-primary-admin' : 'btn-outline-glass'}`} onClick={() => setActiveTab('settings')}>Settings</button>
                    </nav>
                    <button className="btn-premium btn-outline-glass" onClick={() => { localStorage.clear(); window.location.href = '/login'; }} style={{ marginLeft: 20 }}>
                        Logout
                    </button>
                </div>
            </header>

            {activeTab === 'analytics' && (
                <>
                    <section className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-value">{stats.totalUsers}</span>
                            <span className="stat-label">Total Personnel</span>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 4, background: 'var(--admin-primary)' }}></div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{stats.totalTasks}</span>
                            <span className="stat-label">Total Missions</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{stats.successRate}%</span>
                            <span className="stat-label">Completion Efficiency</span>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 4, background: 'var(--accent)' }}></div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{stats.availableQueue}</span>
                            <span className="stat-label">System Backlog</span>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 4, background: 'var(--warning)' }}></div>
                        </div>
                    </section>

                    <div className="dashboard-grid">
                        <div className="glass-card">
                            <h2 className="section-title">Mission Breakdown</h2>
                            <div style={{ padding: '20px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span>Completed</span>
                                    <span>{stats.completed}</span>
                                </div>
                                <div className="progress-bar-bg" style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                                    <div style={{ width: `${(stats.completed / stats.totalTasks) * 100}%`, height: '100%', background: 'var(--accent)' }}></div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span>To-Do List</span>
                                    <span>{stats.todoList}</span>
                                </div>
                                <div className="progress-bar-bg" style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                                    <div style={{ width: `${(stats.todoList / stats.totalTasks) * 100}%`, height: '100%', background: 'var(--info)' }}></div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span>Available Queue</span>
                                    <span>{stats.availableQueue}</span>
                                </div>
                                <div className="progress-bar-bg" style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${(stats.availableQueue / stats.totalTasks) * 100}%`, height: '100%', background: 'var(--warning)' }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card">
                            <h2 className="section-title">Role Distribution</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--admin-primary)' }}></div>
                                    <span style={{ flex: 1 }}>Administrators</span>
                                    <strong>{stats.admins}</strong>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--manager-primary)' }}></div>
                                    <span style={{ flex: 1 }}>Mission Managers</span>
                                    <strong>{stats.managers}</strong>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--user-primary)' }}></div>
                                    <span style={{ flex: 1 }}>Field Agents / Users</span>
                                    <strong>{stats.clients}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'directory' && (
                <div className="dashboard-grid">
                    <div className="glass-card">
                        <h2 className="section-title">Directory Management</h2>
                        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                            <ul className="task-list">
                                {users.map(u => (
                                    <li key={u.id} className="task-item" style={{ flexDirection: 'column', alignItems: 'flex-start', borderLeft: u.suspended ? '4px solid var(--danger)' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: '1.2rem', color: u.suspended ? 'rgba(255,255,255,0.3)' : 'inherit' }}>
                                                    {u.name} {u.role === 'MANAGER' && (u.available ? '⚡' : '🌙')}
                                                    {u.suspended && <span style={{ marginLeft: 10, fontSize: '0.7rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 900 }}>[Suspended]</span>}
                                                </strong>
                                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>{u.email}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => changeRole(u.id, e.target.value)}
                                                    className="select-premium"
                                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                >
                                                    <option value="ADMIN">ADMIN</option>
                                                    <option value="MANAGER">MANAGER</option>
                                                    <option value="USER">USER</option>
                                                </select>
                                                <button onClick={() => toggleSuspension(u.id)} className={`btn-premium ${u.suspended ? 'btn-primary-admin' : 'btn-outline-glass'}`} style={{ padding: '4px 12px', fontSize: '0.8rem', borderColor: u.suspended ? 'transparent' : 'var(--danger)', color: u.suspended ? 'white' : 'var(--danger)' }}>
                                                    {u.suspended ? 'Unsuspend' : 'Suspend'}
                                                </button>
                                                {u.role !== 'ADMIN' && (
                                                    <button className="btn-premium btn-outline-glass" onClick={() => deleteUser(u.id)}
                                                        style={{ padding: '4px 12px', fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.1)' }}>
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="glass-card">
                        <h2 className="section-title">Provision New Identity</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Full Name</label>
                                <input placeholder="Legal Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Corporate Email</label>
                                <input placeholder="name@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>System Password</label>
                                <input placeholder="••••••••" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Access Role</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="MANAGER">Manager</option>
                                    <option value="USER">User (Field Agent)</option>
                                    <option value="ADMIN">Administrator</option>
                                </select>
                            </div>
                            <button className="btn-premium btn-primary-admin" onClick={createUser} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                                {loading ? "Communicating..." : "Finalize Provisioning"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="glass-card">
                    <h2 className="section-title">System Audit Trails</h2>
                    <div style={{ maxHeight: 700, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: 15, opacity: 0.6 }}>Timestamp</th>
                                    <th style={{ padding: 15, opacity: 0.6 }}>Action</th>
                                    <th style={{ padding: 15, opacity: 0.6 }}>Operator</th>
                                    <th style={{ padding: 15, opacity: 0.6 }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.length === 0 ? (
                                    <tr><td colSpan="4" style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>No audit records found.</td></tr>
                                ) : auditLogs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 15, fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                        <td style={{ padding: 15 }}><span className="badge" style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>{log.action}</span></td>
                                        <td style={{ padding: 15, fontSize: '0.85rem' }}>{log.performedBy}</td>
                                        <td style={{ padding: 15, fontSize: '0.85rem', opacity: 0.7 }}>{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'disputes' && (
                <div className="glass-card">
                    <h2 className="section-title">Dispute Resolution Center</h2>
                    <div style={{ maxHeight: 600, overflowY: 'auto', marginTop: 20 }}>
                        {disputes.length === 0 ? <div className="empty-state">No active disputes detected in the system.</div> : (
                            <ul className="task-list">
                                {disputes.map(d => (
                                    <li key={d.id} className="task-item" style={{ borderLeft: '4px solid var(--danger)' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <span className="badge badge-urgent">DISPUTED</span>
                                                <strong>{d.title}</strong>
                                            </div>
                                            <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: '10px 0' }}>Rejection Reason: {d.rejectionReason || "No reason provided."}</p>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Assigned To: {d.assignedTo?.name || "Unassigned"} | Created By: {d.assignedBy?.email}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button className="btn-premium btn-primary-admin" style={{ padding: '6px 15px' }} onClick={async () => {
                                                const newId = prompt("Enter User ID to re-assign to:");
                                                if (newId) {
                                                    try {
                                                        await api.put(`/tasks/${d.id}/reassign`, newId, { headers: { 'Content-Type': 'application/json' } });
                                                        fetchData();
                                                        fetchDisputes();
                                                        alert("Mission re-assigned successfully.");
                                                    } catch (err) {
                                                        alert("Re-assignment failed.");
                                                    }
                                                }
                                            }}>Re-assign</button>
                                            <button className="btn-premium btn-outline-glass" style={{ padding: '6px 15px', color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={async () => {
                                                if (window.confirm("Resolve this dispute and mark mission as completed?")) {
                                                    try {
                                                        await api.put(`/tasks/${d.id}/resolve`);
                                                        fetchData();
                                                        fetchDisputes();
                                                        alert("Dispute resolved.");
                                                    } catch (err) {
                                                        alert("Resolution failed.");
                                                    }
                                                }
                                            }}>Resolve</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="glass-card">
                    <h2 className="section-title">System Configuration</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40 }}>
                        <div>
                            <h3 style={{ marginBottom: 20 }}>General Defaults</h3>
                            <div className="form-group" style={{ maxWidth: 300 }}>
                                <label>Platform Name</label>
                                <input value={systemSettings.platformName} onChange={e => {
                                    setSystemSettings({ ...systemSettings, platformName: e.target.value });
                                }} />
                            </div>
                            <div className="form-group" style={{ maxWidth: 300 }}>
                                <label>Default Mission Priority</label>
                                <select value={systemSettings.defaultPriority} onChange={e => {
                                    setSystemSettings({ ...systemSettings, defaultPriority: e.target.value });
                                }}>
                                    <option>MEDIUM</option><option>LOW</option><option>HIGH</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <h3 style={{ marginBottom: 20 }}>Security Policy</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="switch-group">
                                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Require multi-factor for Admins</span>
                                    <label className="premium-switch">
                                        <input type="checkbox" checked={systemSettings.requireMFA} onChange={e => {
                                            setSystemSettings({ ...systemSettings, requireMFA: e.target.checked });
                                        }} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="switch-group">
                                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Auto-archive completed missions (30 days)</span>
                                    <label className="premium-switch">
                                        <input type="checkbox" checked={systemSettings.autoArchive} onChange={e => {
                                            setSystemSettings({ ...systemSettings, autoArchive: e.target.checked });
                                        }} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="switch-group">
                                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Maintenance Mode</span>
                                    <label className="premium-switch">
                                        <input type="checkbox" checked={systemSettings.maintenanceMode} onChange={e => {
                                            setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked });
                                        }} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    {saveStatus && <div style={{ marginTop: 20, color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem' }}>{saveStatus}</div>}
                    <button className="btn-premium btn-primary-admin" onClick={handleApplyChanges} disabled={loading} style={{ marginTop: 40, width: 250, justifyContent: 'center' }}>
                        {loading ? "Applying..." : "Apply System Changes"}
                    </button>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
