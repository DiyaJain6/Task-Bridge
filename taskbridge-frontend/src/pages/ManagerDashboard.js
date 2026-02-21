import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import Logo from "../components/Logo";
import { useSettings } from "../context/SettingsContext";

// Simple Countdown Timer Component
const MissionTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const start = new Date(startTime);
            const now = new Date();
            const diff = Math.floor((now - start) / 1000);

            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;

            setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <div className="mission-timer">
            <div className="timer-dot"></div>
            <span>{elapsed} IN FIELD</span>
        </div>
    );
};

// Revenue Heatmap — driven by real day-of-week counts from the API
const RevenueHeatmap = ({ heatmap }) => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const counts = days.map(d => (heatmap ? (heatmap[d] || 0) : 0));
    const maxCount = Math.max(...counts, 1); // avoid div-by-zero

    return (
        <div className="heatmap-container">
            <h3 style={{ marginBottom: 20, opacity: 0.6, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 2 }}>Tasks Completed — By Day of Week (Last 90 Days)</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
                {days.map((day, i) => (
                    <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.65rem', opacity: 0.7, color: 'var(--accent)' }}>{counts[i]}</span>
                        <div
                            style={{
                                width: '100%',
                                height: `${Math.max(4, (counts[i] / maxCount) * 90)}px`,
                                background: counts[i] === 0
                                    ? 'rgba(255,255,255,0.06)'
                                    : `rgba(99,102,241,${0.3 + 0.7 * (counts[i] / maxCount)})`,
                                borderRadius: '6px 6px 0 0',
                                transition: 'height 0.4s ease'
                            }}
                        />
                        <span style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase' }}>{day}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

function ManagerDashboard() {
    const { settings } = useSettings();
    const [tasks, setTasks] = useState([]);
    const [managerInfo, setManagerInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("missions");
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewingProof, setViewingProof] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [financeStats, setFinanceStats] = useState(null);
    const [financeLoading, setFinanceLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        document.body.className = 'manager-theme';
        fetchData();
        return () => { document.body.className = ''; };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tasksRes, infoRes, usersRes] = await Promise.all([
                api.get("/tasks"),
                api.get("/users/current"),
                api.get("/users")
            ]);
            setTasks(tasksRes.data);
            setManagerInfo(infoRes.data);
            setEmployees(usersRes.data.filter(u => u.role === 'USER' || u.role === 'EMPLOYEE'));
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const claimTask = async (id) => {
        const plan = prompt("Enter your mission To-Do plan:");
        if (plan === null) return;
        try {
            await api.put(`/tasks/${id}/claim`, { toDoPlan: plan });
            fetchData();
        } catch (err) {
            alert("Claim failed");
        }
    };

    const rejectTask = async (id) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            await api.put(`/tasks/${id}/reject`, reason, { headers: { 'Content-Type': 'text/plain' } });
            fetchData();
        } catch (err) {
            alert("Rejection failed");
        }
    };

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData("taskId");
        const task = tasks.find(t => t.id === parseInt(taskId));

        if (!task) return;

        try {
            if (targetStatus === 'IN_PROGRESS' && task.status === 'PENDING') {
                if (!task.assignedTo) {
                    const plan = prompt("Enter mission To-Do plan:");
                    await api.put(`/tasks/${taskId}/claim`, { toDoPlan: plan || "Instant Deployment" });
                }
                await api.put(`/tasks/${taskId}/start`);
            } else if (targetStatus === 'COMPLETED' && (task.status === 'IN_PROGRESS' || task.status === 'PENDING')) {
                const feedback = prompt("Enter mission completion text / results:");
                await api.put(`/tasks/${taskId}/complete`, { feedback: feedback || "Completed via HQ Board" });
            } else if (targetStatus === 'TODO' && !task.assignedTo) {
                const plan = prompt("Enter mission To-Do plan:");
                await api.put(`/tasks/${taskId}/claim`, { toDoPlan: plan || "Planned Assignment" });
            } else if (targetStatus === 'QUEUE' && task.assignedTo?.id === managerInfo?.id) {
                // Return to queue? Maybe not allowed or just unassign. Let's ignore for now.
            }
            fetchData();
        } catch (err) {
            alert("Movement failed: Check permissions");
        }
    };

    const toggleAvailability = async () => {
        if (!managerInfo) return;
        const newStatus = !managerInfo.available;
        try {
            await api.put("/users/availability", {
                available: newStatus,
                status: newStatus ? "Available for missions" : "Directly Offline"
            });
            fetchData();
        } catch (err) {
            alert("Failed to update availability");
        }
    };

    const stats = {
        pending: tasks.filter(t => t.status === 'PENDING' && !t.assignedTo).length,
        todo: tasks.filter(t => t.status === 'PENDING' && t.assignedTo?.id === managerInfo?.id).length,
        active: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
    };

    const fetchFinanceStats = async () => {
        if (financeStats) return; // already loaded
        setFinanceLoading(true);
        try {
            const res = await api.get("/tasks/finance-stats");
            setFinanceStats(res.data);
        } catch (err) {
            console.error("Failed to load finance stats", err);
        } finally {
            setFinanceLoading(false);
        }
    };

    const columns = {
        QUEUE: tasks.filter(t => t.status === 'PENDING' && !t.assignedTo),
        TODO: tasks.filter(t => t.status === 'PENDING' && t.assignedTo?.id === managerInfo?.id),
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS' && t.assignedTo?.id === managerInfo?.id),
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED' && t.assignedTo?.id === managerInfo?.id)
    };

    const completeTaskWithProof = async (taskId) => {
        const feedback = prompt("Enter mission completion text / results:");
        if (feedback === null) return;

        const payload = {
            feedback: feedback || "Extraction successful",
            proof: selectedFile ? `proof_${selectedFile.name}` : "Manual Verification"
        };

        try {
            await api.put(`/tasks/${taskId}/complete`, payload);
            setSelectedFile(null);
            fetchData();
        } catch (err) {
            alert("Completion failed");
        }
    };

    // ── Quality Review Score ────────────────────────────────────────────
    const [pendingScores, setPendingScores] = useState({});

    const setQualityScore = async (taskId, score) => {
        try {
            await api.put(`/tasks/${taskId}/quality-score`, { score });
            fetchData();
        } catch (err) {
            alert("Failed to submit rating");
        }
    };
    // ──────────────────────────────────────────────────────────────────

    // ── Backup Assignee ───────────────────────────────────────────────
    const [backupSelections, setBackupSelections] = useState({});

    const assignBackup = async (taskId) => {
        const backupUserId = backupSelections[taskId];
        if (!backupUserId) { alert("Please select a backup employee first"); return; }
        try {
            await api.put(`/tasks/${taskId}/backup-assignee`, { backupUserId: parseInt(backupUserId) });
            fetchData();
        } catch (err) {
            alert("Failed to assign backup");
        }
    };
    // ──────────────────────────────────────────────────────────────────

    return (
        <div className="dashboard-container">
            {settings.maintenanceMode && (
                <div style={{ background: 'var(--danger)', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '12px', marginBottom: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    PLATFORM UNDER MAINTENANCE - MISSION ACCEPTANCE MAY BE DELAYED
                </div>
            )}
            <header className="dashboard-header" style={{ marginBottom: 40 }}>
                <Logo size={40} />
                <div style={{ display: 'flex', gap: 15 }}>
                    <button className={`btn-premium ${activeTab === 'missions' ? 'btn-primary-manager' : 'btn-outline-glass'}`} onClick={() => setActiveTab('missions')}>Field HQ</button>
                    <button className={`btn-premium ${activeTab === 'schedule' ? 'btn-primary-manager' : 'btn-outline-glass'}`} onClick={() => setActiveTab('schedule')}>Schedule</button>
                    <button className={`btn-premium ${activeTab === 'finance' ? 'btn-primary-manager' : 'btn-outline-glass'}`} onClick={() => { setActiveTab('finance'); fetchFinanceStats(); }}>Finance</button>
                    <button className="btn-premium btn-outline-glass" onClick={() => { localStorage.clear(); window.location.href = '/login'; }} style={{ marginLeft: 10 }}>Logout</button>
                </div>
            </header>

            {activeTab === 'missions' && (
                <>
                    <section className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-value">{stats.pending}</span>
                            <span className="stat-label">Available Queue</span>
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40%', height: 4, background: 'var(--warning)' }}></div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{stats.todo}</span>
                            <span className="stat-label">My To-Do List</span>
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40%', height: 4, background: 'var(--primary)' }}></div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{stats.completed}</span>
                            <span className="stat-label">Successful Ops</span>
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40%', height: 4, background: 'var(--accent)' }}></div>
                        </div>
                    </section>

                    <div className="kanban-board" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {/* Column 1: Queue */}
                        <div
                            className={`kanban-column ${dragOverCol === 'QUEUE' ? 'drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverCol('QUEUE'); }}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={(e) => handleDrop(e, 'QUEUE')}
                        >
                            <div className="column-header">
                                <h3>Available</h3>
                                <span className="task-count">{columns.QUEUE.length}</span>
                            </div>
                            <div className="kanban-tasks">
                                {columns.QUEUE.map(t => (
                                    <div key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} className="kanban-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <span className={`badge badge-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>#{t.id}</span>
                                        </div>
                                        <strong style={{ display: 'block', marginBottom: 5 }}>{t.title}</strong>
                                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7, marginBottom: 15 }}>{t.description}</p>

                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button className="btn-premium btn-primary-manager" onClick={() => claimTask(t.id)} style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>Accept</button>
                                            <button className="btn-premium btn-outline-glass" onClick={() => rejectTask(t.id)} style={{ padding: '8px', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: To-Do */}
                        <div
                            className={`kanban-column ${dragOverCol === 'TODO' ? 'drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverCol('TODO'); }}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={(e) => handleDrop(e, 'TODO')}
                        >
                            <div className="column-header">
                                <h3 style={{ color: 'var(--primary)' }}>To Do</h3>
                                <span className="task-count">{columns.TODO.length}</span>
                            </div>
                            <div className="kanban-tasks">
                                {columns.TODO.map(t => (
                                    <div key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} className="kanban-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                                        <strong style={{ display: 'block', marginBottom: 5 }}>{t.title}</strong>
                                        <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6, fontStyle: 'italic', marginBottom: 15 }}>Plan: {t.toDoPlan || "No plan specificed"}</p>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button className="btn-premium btn-primary-manager" onClick={() => api.put(`/tasks/${t.id}/start`).then(fetchData)} style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>Deploy</button>
                                            <button className="btn-premium btn-outline-glass" onClick={() => completeTaskWithProof(t.id)} style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>Complete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 3: In Progress */}
                        <div
                            className={`kanban-column ${dragOverCol === 'IN_PROGRESS' ? 'drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverCol('IN_PROGRESS'); }}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={(e) => handleDrop(e, 'IN_PROGRESS')}
                        >
                            <div className="column-header">
                                <h3 style={{ color: 'var(--accent)' }}>In Field</h3>
                                <span className="task-count">{columns.IN_PROGRESS.length}</span>
                            </div>
                            <div className="kanban-tasks">
                                {columns.IN_PROGRESS.map(t => (
                                    <div key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} className="kanban-card" style={{ borderLeft: '4px solid var(--accent)' }}>
                                        <strong style={{ display: 'block', marginBottom: 10 }}>{t.title}</strong>
                                        <MissionTimer startTime={t.startedAt || new Date()} />

                                        {/* Backup Assignee */}
                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Backup Assignee</div>
                                            {t.backupAssignee ? (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 8 }}>⛑ {t.backupAssignee.name}</div>
                                            ) : null}
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <select
                                                    value={backupSelections[t.id] || ''}
                                                    onChange={e => setBackupSelections(prev => ({ ...prev, [t.id]: e.target.value }))}
                                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '6px 8px', fontSize: '0.75rem' }}
                                                >
                                                    <option value="">Select employee...</option>
                                                    {employees.map(emp => (
                                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                    ))}
                                                </select>
                                                <button className="btn-premium btn-outline-glass" onClick={() => assignBackup(t.id)} style={{ padding: '6px 10px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Assign</button>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="file-dropzone" onClick={() => fileInputRef.current.click()} style={{ padding: '10px', fontSize: '0.7rem', marginBottom: 10 }}>
                                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files[0])} />
                                                {selectedFile ? `✅ ${selectedFile.name}` : '📎 Attach Proof'}
                                            </div>
                                            <button className="btn-premium btn-outline-glass" onClick={() => completeTaskWithProof(t.id)} style={{ width: '100%', fontSize: '0.8rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                                Finalize Extraction
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 4: Completed */}
                        <div
                            className={`kanban-column ${dragOverCol === 'COMPLETED' ? 'drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverCol('COMPLETED'); }}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={(e) => handleDrop(e, 'COMPLETED')}
                        >
                            <div className="column-header">
                                <h3>Extraction</h3>
                                <span className="task-count">{columns.COMPLETED.length}</span>
                            </div>
                            <div className="kanban-tasks">
                                {columns.COMPLETED.map(t => (
                                    <div key={t.id} className="kanban-card" style={{ opacity: 0.9 }} onClick={() => setViewingProof(t)}>
                                        <strong style={{ display: 'block', marginBottom: 5 }}>{t.title}</strong>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: 10 }}>✅ Verified Ops</div>
                                        {t.completionProof && <div style={{ marginBottom: 10, fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}>View Proof</div>}

                                        {/* Quality Review Score */}
                                        <div onClick={e => e.stopPropagation()} style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Quality Score</div>
                                            {t.qualityScore ? (
                                                <div style={{ fontSize: '1rem', color: '#facc15' }}>
                                                    {'★'.repeat(t.qualityScore)}{'☆'.repeat(5 - t.qualityScore)}
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: 6 }}>{t.qualityScore}/5</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <span
                                                                key={star}
                                                                onClick={() => setPendingScores(prev => ({ ...prev, [t.id]: star }))}
                                                                style={{ fontSize: '1.1rem', cursor: 'pointer', color: (pendingScores[t.id] || 0) >= star ? '#facc15' : 'rgba(255,255,255,0.2)', transition: 'color 0.15s' }}
                                                            >★</span>
                                                        ))}
                                                    </div>
                                                    {pendingScores[t.id] && (
                                                        <button className="btn-premium btn-outline-glass" onClick={() => setQualityScore(t.id, pendingScores[t.id])} style={{ width: '100%', fontSize: '0.7rem', padding: '5px', borderColor: '#facc15', color: '#facc15' }}>
                                                            Submit Rating
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'schedule' && (
                <div className="glass-card">
                    <h2 className="section-title"><span>📅</span> Schedule & Availability</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 20 }}>
                        <div className="empty-state" style={{ padding: '40px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 20 }}>{managerInfo?.available ? '⚡' : '🌙'}</div>
                            <h3>Status: {managerInfo?.available ? 'Active Duty' : 'Standby'}</h3>
                            <button className={`btn-premium ${managerInfo?.available ? 'btn-outline-glass' : 'btn-primary-manager'}`} onClick={toggleAvailability} style={{ marginTop: 20 }}>
                                {managerInfo?.available ? 'Go Offline' : 'Go Online'}
                            </button>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 30, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, opacity: 0.6 }}>Operational Hours</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{day}</span>
                                        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', margin: '0 20px', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: 'var(--manager-primary)', opacity: 0.5 }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>09:00 - 18:00</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="glass-card">
                    <h2 className="section-title"><span>💰</span> Earnings & Performance</h2>
                    {financeLoading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5, fontSize: '0.9rem', letterSpacing: 2 }}>LOADING INTEL…</div>
                    ) : (
                        <>
                            <div className="stats-grid" style={{ marginBottom: 40 }}>
                                <div className="stat-card" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                                    <span className="stat-value">${financeStats ? financeStats.totalEarnings.toLocaleString() : '—'}</span>
                                    <span className="stat-label">Total Revenue</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{financeStats ? `${financeStats.efficiency}%` : '—'}</span>
                                    <span className="stat-label">Ops Efficiency</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{financeStats ? (financeStats.avgHours > 0 ? `${financeStats.avgHours}h` : 'N/A') : '—'}</span>
                                    <span className="stat-label">Avg Extraction Time</span>
                                </div>
                            </div>
                            <div style={{ marginBottom: 30, padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 30, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)', marginRight: 8 }}>
                                        {financeStats ? financeStats.completedCount : '—'}
                                    </span>
                                    Missions Completed
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b', marginRight: 8 }}>
                                        ${financeStats ? (50).toLocaleString() : '—'}
                                    </span>
                                    Per Mission Rate
                                </div>
                            </div>
                            <RevenueHeatmap heatmap={financeStats?.heatmap} />
                        </>
                    )}
                </div>
            )}

            {/* Proof Gallery Modal */}
            {viewingProof && (
                <div className="gallery-overlay" onClick={() => setViewingProof(null)}>
                    <div className="gallery-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'absolute', top: -40, right: 0, color: 'white', cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setViewingProof(null)}>✕ Close</div>
                        <h2 style={{ color: 'white', marginBottom: 20 }}>Mission Proof: {viewingProof.title}</h2>
                        <img
                            src={`https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&w=1000&q=80`}
                            alt="Mission Proof"
                        />
                        <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: 20, textAlign: 'center' }}>
                            <p><strong>Feedback:</strong> {viewingProof.feedback}</p>
                            <p><strong>Completed At:</strong> {new Date(viewingProof.completedAt).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManagerDashboard;
