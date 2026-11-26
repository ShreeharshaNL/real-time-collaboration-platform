// Frontend logic for Real-Time Collaboration Platform
let currentWorkspaceId = 'ws-1';
let currentBoardId = 'bd-1';
let currentUser = { id: 'usr-1', name: 'Shreeharsha N L', role: 'OWNER' };
let tasks = [];

// Init User Selector
const userSelector = document.getElementById('userSelector');
userSelector.addEventListener('change', (e) => {
    const selected = e.target.options[e.target.selectedIndex];
    currentUser = {
        id: e.target.value,
        name: selected.getAttribute('data-name'),
        role: selected.getAttribute('data-role')
    };
    sendHeartbeat();
});

// Load Workspaces
async function fetchWorkspaces() {
    try {
        const res = await fetch('/api/workspaces');
        const data = await res.json();
        if (data.success && data.workspaces.length) {
            const container = document.getElementById('workspaceList');
            container.innerHTML = data.workspaces.map(ws => `
                <button onclick="selectWorkspace('${ws.id}')" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition truncate ${ws.id === currentWorkspaceId ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}">
                    ${ws.name}
                </button>
            `).join('');
        }
    } catch (e) {
        console.error("Failed to fetch workspaces:", e);
    }
}

window.selectWorkspace = function(id) {
    currentWorkspaceId = id;
    fetchWorkspaces();
    fetchTasks();
    fetchMessages();
};

// Load Tasks
async function fetchTasks() {
    try {
        const res = await fetch(`/api/tasks?boardId=${currentBoardId}`);
        const data = await res.json();
        if (data.success) {
            tasks = data.tasks;
            renderTasks();
        }
    } catch (e) {
        console.error("Failed to load tasks:", e);
    }
}

function renderTasks() {
    const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const priorityColors = {
        'URGENT': 'bg-red-500/20 text-red-400 border-red-500/30',
        'HIGH': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        'MEDIUM': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'LOW': 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };

    columns.forEach(col => {
        const colTasks = tasks.filter(t => t.status === col);
        document.getElementById(`count-${col}`).innerText = colTasks.length;
        const container = document.getElementById(`col-${col}`);

        if (!colTasks.length) {
            container.innerHTML = `<div class="text-center py-8 text-slate-600 text-xs border border-dashed border-slate-800/80 rounded-lg">No tasks</div>`;
            return;
        }

        container.innerHTML = colTasks.map(t => `
            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-sm hover:border-slate-700 transition space-y-2">
                <div class="flex items-start justify-between">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${priorityColors[t.priority] || priorityColors['MEDIUM']}">
                        ${t.priority}
                    </span>
                    <div class="flex items-center space-x-1">
                        ${col !== 'TODO' ? `<button onclick="moveTask('${t.id}', '${getPrevStatus(col)}')" class="text-slate-400 hover:text-white p-1 text-[10px]" title="Move Back"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
                        ${col !== 'DONE' ? `<button onclick="moveTask('${t.id}', '${getNextStatus(col)}')" class="text-slate-400 hover:text-white p-1 text-[10px]" title="Move Forward"><i class="fa-solid fa-arrow-right"></i></button>` : ''}
                    </div>
                </div>
                <div class="font-semibold text-xs text-white">${t.title}</div>
                ${t.description ? `<p class="text-[11px] text-slate-400">${t.description}</p>` : ''}
                <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-500">
                    <span class="flex items-center space-x-1">
                        <i class="fa-regular fa-user text-slate-400"></i>
                        <span class="text-slate-300 font-medium">${t.assigned_to || 'Unassigned'}</span>
                    </span>
                    <span class="font-mono">${t.id}</span>
                </div>
            </div>
        `).join('');
    });
}

function getNextStatus(curr) {
    if (curr === 'TODO') return 'IN_PROGRESS';
    if (curr === 'IN_PROGRESS') return 'REVIEW';
    if (curr === 'REVIEW') return 'DONE';
    return 'DONE';
}

function getPrevStatus(curr) {
    if (curr === 'DONE') return 'REVIEW';
    if (curr === 'REVIEW') return 'IN_PROGRESS';
    if (curr === 'IN_PROGRESS') return 'TODO';
    return 'TODO';
}

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

// Chat Functions
async function fetchMessages() {
    try {
        const res = await fetch(`/api/messages?workspaceId=${currentWorkspaceId}&channel=general`);
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
        container.innerHTML = `<div class="text-center py-8 text-slate-500">No messages yet. Say hi!</div>`;
        return;
    }

    container.innerHTML = messages.map(m => `
        <div class="flex items-start space-x-2.5">
            <img src="${m.avatar}" class="h-6 w-6 rounded-full bg-slate-800 shrink-0 mt-0.5">
            <div class="flex-1">
                <div class="flex items-baseline space-x-2">
                    <span class="font-bold text-xs text-slate-200">${m.user_name}</span>
                    <span class="text-[10px] text-slate-500 font-mono">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="mt-0.5 text-slate-300 text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                    ${m.content}
                </div>
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
                channel: 'general',
                userId: currentUser.id,
                userName: currentUser.name,
                content: content
            })
        });
        await fetchMessages();
    } catch (err) {
        console.error("Chat error:", err);
    }
});

// Presence & Heartbeat
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
        await fetchPresence();
    } catch (e) {
        console.error("Heartbeat error:", e);
    }
}

async function fetchPresence() {
    try {
        const res = await fetch('/api/presence');
        const data = await res.json();
        if (data.success) {
            const container = document.getElementById('presenceContainer');
            container.innerHTML = data.presence.map(p => `
                <div class="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
                    <span class="h-2 w-2 rounded-full ${p.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
                    <span class="text-slate-200 font-medium">${p.user_name}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Presence error:", e);
    }
}

// Modal handling
const modal = document.getElementById('taskModal');
document.getElementById('openNewTaskModalBtn').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('closeModalBtn').addEventListener('click', () => modal.classList.add('hidden'));
document.getElementById('cancelModalBtn').addEventListener('click', () => modal.classList.add('hidden'));

document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('taskTitleInput').value.trim();
    const desc = document.getElementById('taskDescInput').value.trim();
    const priority = document.getElementById('taskPriorityInput').value;
    const assignee = document.getElementById('taskAssigneeInput').value;

    if (!title) return;

    try {
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boardId: currentBoardId,
                title,
                description: desc,
                priority,
                assignedTo: assignee
            })
        });
        modal.classList.add('hidden');
        document.getElementById('createTaskForm').reset();
        await fetchTasks();
    } catch (err) {
        alert("Failed to create task: " + err.message);
    }
});

// Periodic live sync (Simulating WebSockets across tabs)
setInterval(() => {
    fetchTasks();
    fetchMessages();
    fetchPresence();
}, 4000);

// Initial Load
fetchWorkspaces();
fetchTasks();
fetchMessages();
sendHeartbeat();
