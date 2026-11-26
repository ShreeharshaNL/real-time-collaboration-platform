// Frontend logic for Synchronize Linear Collab
let currentWorkspaceId = 'ws-core';
let currentBoardId = 'bd-sprint-42';
let currentUser = { id: 'usr-shree', name: 'Shreeharsha N L', role: 'Principal Systems Architect' };
let tasks = [];

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

async function fetchWorkspaces() {
    try {
        const res = await fetch('/api/workspaces');
        const data = await res.json();
        if (data.success && data.workspaces.length) {
            const container = document.getElementById('workspaceList');
            container.innerHTML = data.workspaces.map(ws => `
                <button onclick="selectWorkspace('${ws.id}')" class="w-full text-left px-2 py-1.5 rounded text-xs transition truncate ${ws.id === currentWorkspaceId ? 'bg-zinc-850 text-white font-medium border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}">
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
        }
    } catch (e) {
        console.error("Failed to load tasks:", e);
    }
}

function renderTasks() {
    const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const priorityColors = {
        'URGENT': 'bg-red-500/10 text-red-400 border-red-500/20',
        'HIGH': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'MEDIUM': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'LOW': 'bg-zinc-800 text-zinc-400 border-zinc-700'
    };

    columns.forEach(col => {
        const colTasks = tasks.filter(t => t.status === col);
        document.getElementById(`count-${col}`).innerText = colTasks.length;
        const container = document.getElementById(`col-${col}`);

        if (!colTasks.length) {
            container.innerHTML = `<div class="text-center py-10 text-zinc-600 font-mono text-xs border border-dashed border-zinc-800/80 rounded">Empty</div>`;
            return;
        }

        container.innerHTML = colTasks.map(t => `
            <div class="bg-zinc-950/90 p-3 rounded-lg border border-zinc-800/80 shadow-sm hover:border-zinc-700 transition space-y-2">
                <div class="flex items-center justify-between font-mono text-[10px]">
                    <span class="text-zinc-500 font-semibold">${t.ticket_id}</span>
                    <span class="px-1.5 py-0.5 rounded border ${priorityColors[t.priority] || priorityColors['MEDIUM']}">
                        ${t.priority}
                    </span>
                </div>
                <div class="font-medium text-xs text-white">${t.title}</div>
                ${t.description ? `<p class="text-[11px] text-zinc-400 font-sans leading-relaxed">${t.description}</p>` : ''}
                <div class="flex items-center justify-between pt-2 border-t border-zinc-900 font-mono text-[10px] text-zinc-500">
                    <span class="text-zinc-300">${t.assigned_to}</span>
                    <div class="flex items-center space-x-1">
                        ${col !== 'TODO' ? `<button onclick="moveTask('${t.id}', '${getPrev(col)}')" class="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800">&larr;</button>` : ''}
                        ${col !== 'DONE' ? `<button onclick="moveTask('${t.id}', '${getNext(col)}')" class="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800">&rarr;</button>` : ''}
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
        container.innerHTML = `<div class="text-center py-8 text-zinc-600 font-mono text-xs">No channel updates yet.</div>`;
        return;
    }

    container.innerHTML = messages.map(m => `
        <div class="space-y-1">
            <div class="flex items-baseline space-x-2 font-mono text-[11px]">
                <span class="font-semibold text-zinc-200">${m.user_name}</span>
                <span class="text-zinc-600 text-[10px]">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="text-zinc-300 text-xs bg-zinc-900/70 p-2 rounded border border-zinc-800/80 leading-relaxed font-sans">
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
        console.error("Chat error:", err);
    }
});

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
        console.error("Presence error:", e);
    }
}

async function fetchPresence() {
    try {
        const res = await fetch('/api/presence');
        const data = await res.json();
        if (data.success) {
            const container = document.getElementById('presenceContainer');
            container.innerHTML = data.presence.map(p => `
                <div class="flex items-center space-x-2 text-[11px]">
                    <span class="h-1.5 w-1.5 rounded-full ${p.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
                    <span class="text-zinc-300 font-medium truncate">${p.user_name}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Presence error:", e);
    }
}

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
        alert("Failed to create ticket: " + err.message);
    }
});

setInterval(() => {
    fetchTasks();
    fetchMessages();
    fetchPresence();
}, 4000);

fetchWorkspaces();
fetchTasks();
fetchMessages();
sendHeartbeat();
