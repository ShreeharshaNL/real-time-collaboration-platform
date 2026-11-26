// Kinetic Motion Collaborative Controller
let currentWorkspaceId = 'ws-core';
let currentBoardId = 'bd-sprint-42';
let currentUser = { id: 'usr-shree', name: 'Shreeharsha N L', role: 'Principal Systems Architect' };
let tasks = [];
let taskFilter = 'ALL';

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

async function fetchWorkspaces() {
    try {
        const res = await fetch('/api/workspaces');
        const data = await res.json();
        if (data.success && data.workspaces.length) {
            const container = document.getElementById('workspaceList');
            container.innerHTML = data.workspaces.map(ws => `
                <button onclick="selectWorkspace('${ws.id}')" class="w-full text-left px-3 py-1.5 rounded-lg text-xs transition truncate ${ws.id === currentWorkspaceId ? 'bg-white/10 text-white font-bold' : 'text-[#9e9ea7] hover:text-white hover:bg-white/5'}">
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

function renderTasks() {
    const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const priorityChips = {
        'URGENT': 'chip-pink',
        'HIGH': 'chip-tangerine',
        'MEDIUM': 'chip-lavender',
        'LOW': 'chip-sky'
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
            container.innerHTML = `<div class="text-center py-8 text-[#9e9ea7] font-mono text-xs border border-dashed border-white/10 rounded-xl">No drops in column</div>`;
            return;
        }

        container.innerHTML = colTasks.map(t => `
            <div class="card-kinetic p-4 space-y-3">
                <div class="flex items-center justify-between font-mono text-[11px]">
                    <span class="text-white font-bold">${t.ticket_id}</span>
                    <span class="chip ${priorityChips[t.priority] || 'chip-lavender'}">
                        ${t.priority}
                    </span>
                </div>
                <div class="font-extrabold text-sm text-white leading-snug tracking-tight">${t.title}</div>
                ${t.description ? `<p class="text-xs text-[#9e9ea7] leading-relaxed line-clamp-2">${t.description}</p>` : ''}
                
                <div class="flex items-center justify-between pt-2.5 border-t border-white/10 font-mono text-[11px]">
                    <div class="flex items-center space-x-1.5 text-[#f4f2ec]">
                        <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(t.assigned_to)}" class="h-4 w-4 rounded-full border border-white/20">
                        <span class="truncate max-w-[85px]">${t.assigned_to.split(' ')[0]}</span>
                    </div>

                    <div class="flex items-center space-x-1">
                        <span class="px-2 py-0.5 rounded-full bg-[#222228] text-white border border-white/10 mr-1 font-bold text-[10px]">${t.story_points || 3}pt</span>
                        ${col !== 'TODO' ? `<button onclick="moveTask('${t.id}', '${getPrev(col)}')" title="Move back" class="px-2 py-0.5 bg-[#222228] hover:bg-white/20 text-[#f4f2ec] rounded border border-white/10 transition">&larr;</button>` : ''}
                        ${col !== 'DONE' ? `<button onclick="moveTask('${t.id}', '${getNext(col)}')" title="Move forward" class="px-2 py-0.5 bg-[#222228] hover:bg-[#c8f07a] hover:text-[#0e0e11] text-[#f4f2ec] rounded border border-white/10 transition font-bold">&rarr;</button>` : ''}
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
            btn.className = "task-filter-btn active px-3 py-1 rounded-full bg-[#c8f07a] text-[#0e0e11] font-bold";
        } else {
            btn.className = "task-filter-btn px-3 py-1 rounded-full text-[#9e9ea7] hover:text-white transition";
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
        container.innerHTML = `<div class="text-center py-8 text-[#9e9ea7] font-mono text-xs">No updates in channel.</div>`;
        return;
    }

    container.innerHTML = messages.map(m => `
        <div class="space-y-1">
            <div class="flex items-center space-x-2 font-mono text-[11px]">
                <img src="${m.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(m.user_name)}`}" class="h-4 w-4 rounded-full border border-white/20">
                <span class="font-bold text-[#c8f07a]">${m.user_name}</span>
                <span class="text-[#9e9ea7] text-[10px]">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="text-[#f4f2ec] text-xs bg-[#18181c] p-2.5 rounded-xl border border-white/10 leading-relaxed font-sans">
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
        "Kinetic socket pipeline benchmark: P99 broadcast latency stable at 2.1ms across 48 pods.",
        "Verified Redis cluster failover. Inflight WebSocket sessions transferred without disconnect.",
        "Deployed the optimistic concurrency lock to Sprint 42 board. Replicas in sync."
    ];
    const msg = peerMessages[Math.floor(Math.random() * peerMessages.length)];

    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workspaceId: currentWorkspaceId,
            channel: 'architecture',
            userId: 'usr-marcus',
            userName: 'Marcus Vance',
            content: msg
        })
    });
    await fetchMessages();
};

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
        <img src="${p.avatar}" title="${p.user_name} (${p.status})" class="h-6 w-6 rounded-full border-2 border-[#0e0e11] ring-1 ring-[#c8f07a]">
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

setInterval(sendHeartbeat, 15000);

document.addEventListener('DOMContentLoaded', () => {
    fetchWorkspaces();
    fetchTasks();
    fetchMessages();
    fetchPresence();
});
