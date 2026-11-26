// Frontend interactive logic for Synchronize Linear Collaboration Platform
let currentWorkspaceId = 'ws-core';
let currentBoardId = 'bd-sprint-42';
let currentUser = { id: 'usr-shree', name: 'Shreeharsha N L', role: 'Principal Systems Architect' };
let tasks = [];
let taskFilter = 'ALL';

// User selector change
const userSelector = document.getElementById('userSelector');
userSelector.addEventListener('change', (e) => {
    const selected = e.target.options[e.target.selectedIndex];
    currentUser = {
        id: e.target.value,
        name: selected.getAttribute('data-name'),
        role: selected.getAttribute('data-role')
    };
    sendHeartbeat();
    renderTasks();
});

// Fetch Workspaces
async function fetchWorkspaces() {
    try {
        const res = await fetch('/api/workspaces');
        const data = await res.json();
        if (data.success && data.workspaces.length) {
            const container = document.getElementById('workspaceList');
            container.innerHTML = data.workspaces.map(ws => `
                <button onclick="selectWorkspace('${ws.id}')" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition truncate ${ws.id === currentWorkspaceId ? 'bg-violet-600/30 text-violet-200 font-bold border border-violet-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-cosmic-900'}">
                    ${ws.name}
                </button>
            `).join('');
        }
    } catch (e) {
        console.error("Failed to load workspaces:", e);
    }
}

window.selectWorkspace = function(id) {
    currentWorkspaceId = id;
    fetchWorkspaces();
    fetchTasks();
    fetchMessages();
};

// Fetch Tasks
async function fetchTasks() {
    try {
        const res = await fetch(`/api/tasks?boardId=${currentBoardId}`);
        const data = await res.json();
        if (data.success) {
            tasks = data.tasks;
            renderTasks();
            updateSprintVelocity();
        }
    } catch (e) {
        console.error("Failed to load tasks:", e);
    }
}

// Render Tasks with Filters
function renderTasks() {
    const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const priorityColors = {
        'URGENT': 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 font-bold',
        'HIGH': 'bg-orange-500/20 text-orange-300 border-orange-500/30 font-semibold',
        'MEDIUM': 'bg-violet-500/20 text-violet-300 border-violet-500/30 font-medium',
        'LOW': 'bg-slate-800 text-slate-400 border-slate-700'
    };

    let filtered = tasks;
    if (taskFilter === 'MY') {
        filtered = tasks.filter(t => t.assigned_to.includes(currentUser.name.split(' ')[0]));
    } else if (taskFilter === 'HIGH') {
        filtered = tasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH');
    }

    columns.forEach(col => {
        const colTasks = filtered.filter(t => t.status === col);
        document.getElementById(`count-${col}`).innerText = colTasks.length;
        const container = document.getElementById(`col-${col}`);

        if (!colTasks.length) {
            container.innerHTML = `<div class="text-center py-10 text-slate-500 font-mono text-xs border border-dashed border-violet-500/20 rounded-xl">No issues</div>`;
            return;
        }

        container.innerHTML = colTasks.map(t => `
            <div class="glass-card p-3.5 space-y-2.5 cursor-grab">
                <div class="flex items-center justify-between font-mono text-[10px]">
                    <span class="text-violet-400 font-bold">${t.ticket_id}</span>
                    <span class="px-2 py-0.5 rounded-full border ${priorityColors[t.priority] || priorityColors['MEDIUM']}">
                        ${t.priority}
                    </span>
                </div>
                <div class="font-bold text-xs text-white leading-snug">${t.title}</div>
                ${t.description ? `<p class="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-2">${t.description}</p>` : ''}
                
                <div class="flex items-center justify-between pt-2 border-t border-violet-500/15 font-mono text-[10px]">
                    <div class="flex items-center space-x-1.5 text-slate-300">
                        <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(t.assigned_to)}" class="h-4 w-4 rounded-full border border-violet-500/40">
                        <span class="truncate max-w-[90px]">${t.assigned_to.split(' ')[0]}</span>
                    </div>

                    <div class="flex items-center space-x-1">
                        <span class="px-1.5 py-0.5 rounded bg-cosmic-950 text-slate-400 border border-violet-500/20 mr-1 font-bold">${t.story_points || 3}pt</span>
                        ${col !== 'TODO' ? `<button onclick="moveTask('${t.id}', '${getPrev(col)}')" title="Move backward" class="px-2 py-0.5 bg-cosmic-900 hover:bg-violet-600 text-slate-300 hover:text-white rounded border border-violet-500/30 transition">&larr;</button>` : ''}
                        ${col !== 'DONE' ? `<button onclick="moveTask('${t.id}', '${getNext(col)}')" title="Move forward" class="px-2 py-0.5 bg-cosmic-900 hover:bg-violet-600 text-slate-300 hover:text-white rounded border border-violet-500/30 transition">&rarr;</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    });
}

function getNext(c) {
    if (c === 'TODO') return 'IN_PROGRESS';
    if (c === 'IN_PROGRESS') return 'REVIEW';
    return 'DONE';
}
function getPrev(c) {
    if (c === 'DONE') return 'REVIEW';
    if (c === 'REVIEW') return 'IN_PROGRESS';
    return 'TODO';
}

window.filterTasks = function(filter) {
    taskFilter = filter;
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        if ((filter === 'ALL' && btn.innerText.includes('All')) ||
            (filter === 'MY' && btn.innerText.includes('My')) ||
            (filter === 'HIGH' && btn.innerText.includes('Urgent'))) {
            btn.className = "task-filter-btn active px-2.5 py-1 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold";
        } else {
            btn.className = "task-filter-btn px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition";
        }
    });
    renderTasks();
};

window.moveTask = async function(taskId, newStatus) {
    try {
        await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        await fetchTasks();
    } catch (e) {
        console.error("Failed to move task:", e);
    }
};

function updateSprintVelocity() {
    const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 3), 0);
    const donePoints = tasks.filter(t => t.status === 'DONE').reduce((sum, t) => sum + (t.story_points || 3), 0);
    const pct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

    document.getElementById('velocityPercentage').innerText = `${pct}%`;
    document.getElementById('velocityProgressBar').style.width = `${pct}%`;
    document.getElementById('velocityPointsDisplay').innerText = `${donePoints} / ${totalPoints} SP`;
}

// Fetch Messages
async function fetchMessages() {
    try {
        const res = await fetch(`/api/messages?workspaceId=${currentWorkspaceId}&channel=architecture`);
        const data = await res.json();
        if (data.success) {
            renderMessages(data.messages);
        }
    } catch (e) {
        console.error("Failed to fetch messages:", e);
    }
}

function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!messages.length) {
        container.innerHTML = `<div class="text-center py-8 text-slate-500 font-mono text-xs">No channel updates yet.</div>`;
        return;
    }

    container.innerHTML = messages.map(m => `
        <div class="space-y-1">
            <div class="flex items-center space-x-2 font-mono text-[11px]">
                <img src="${m.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(m.user_name)}`}" class="h-4 w-4 rounded-full border border-violet-500/30">
                <span class="font-bold text-violet-200">${m.user_name}</span>
                <span class="text-slate-500 text-[10px]">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="text-slate-200 text-xs bg-cosmic-900/80 p-2.5 rounded-xl border border-violet-500/20 leading-relaxed font-sans shadow-sm">
                ${m.content}
            </div>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    try {
        await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspaceId: currentWorkspaceId,
                channel: 'architecture',
                userId: currentUser.id,
                userName: currentUser.name,
                content
            })
        });
        await fetchMessages();
    } catch (err) {
        console.error("Failed to post message:", err);
    }
});

window.simulatePeerMessage = async function() {
    const peerMessages = [
        "Running performance validation on the Redis adapter. P99 broadcast lag is at 2.1ms across 48 sockets.",
        "PR #42 for distributed lock leasing passed automated integration tests in CI.",
        "Kafka consumer lag is fully zeroed out on the production partition mesh.",
        "Merged the optimistic lock migration. D1 replica sync is executing nominally."
    ];
    const randomMsg = peerMessages[Math.floor(Math.random() * peerMessages.length)];

    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workspaceId: currentWorkspaceId,
            channel: 'architecture',
            userId: 'usr-marcus',
            userName: 'Marcus Vance',
            content: randomMsg
        })
    });
    await fetchMessages();
};

// Fetch Presence
async function fetchPresence() {
    try {
        const res = await fetch('/api/presence');
        const data = await res.json();
        if (data.success) {
            renderPresence(data.presence);
        }
    } catch (e) {
        console.error("Failed to load presence:", e);
    }
}

function renderPresence(presence) {
    const container = document.getElementById('presenceAvatars');
    container.innerHTML = presence.map(p => `
        <img src="${p.avatar}" title="${p.user_name} (${p.status})" class="h-6 w-6 rounded-full border-2 border-cosmic-950 ring-1 ring-violet-500/40">
    `).join('');
}

async function sendHeartbeat() {
    try {
        await fetch('/api/presence/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                userName: currentUser.name,
                status: 'ONLINE'
            })
        });
        fetchPresence();
    } catch (e) {
        console.error("Heartbeat error:", e);
    }
}

// Modal handling
const modal = document.getElementById('newTaskModal');
document.getElementById('openNewTaskModalBtn').onclick = () => modal.classList.remove('hidden');
document.getElementById('closeModalBtn').onclick = () => modal.classList.add('hidden');
document.getElementById('cancelModalBtn').onclick = () => modal.classList.add('hidden');

document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('taskTitleInput').value.trim();
    const description = document.getElementById('taskDescInput').value.trim();
    const priority = document.getElementById('taskPriorityInput').value;
    const storyPoints = parseInt(document.getElementById('taskPointsInput').value, 10);
    const assignedTo = document.getElementById('taskAssigneeInput').value;

    if (!title) return;

    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boardId: currentBoardId,
                title,
                description,
                status: 'TODO',
                priority,
                storyPoints,
                assignedTo
            })
        });
        const data = await res.json();
        if (data.success) {
            modal.classList.add('hidden');
            document.getElementById('createTaskForm').reset();
            await fetchTasks();
        }
    } catch (err) {
        console.error("Failed to create task:", err);
    }
});

// Periodic Heartbeat
setInterval(sendHeartbeat, 15000);

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    fetchWorkspaces();
    fetchTasks();
    fetchMessages();
    fetchPresence();
});
