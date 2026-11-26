// Kinetic Motion Platform Controller
let currentBoardId = 'bd-sprint-42';
let currentUser = { id: 'usr-shree', name: 'Shreeharsha N L', role: 'Principal Systems Architect' };
let tasks = [];
let taskFilter = 'ALL';

async function fetchTasks() {
    try {
        const res = await fetch(`/api/tasks?boardId=${currentBoardId}`);
        const data = await res.json();
        if (data.success) {
            tasks = data.tasks;
            renderTasks();
        }
    } catch (e) {
        console.error("Failed to load tasks from D1:", e);
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
            container.innerHTML = `<div class="text-center py-12 text-[#8e8e96] font-mono text-xs border border-dashed border-white/10 rounded-2xl">Empty</div>`;
            return;
        }

        container.innerHTML = colTasks.map(t => `
            <div class="card-task p-5 space-y-3">
                <div class="flex items-center justify-between font-mono text-xs">
                    <span class="text-white font-bold">${t.ticket_id}</span>
                    <span class="chip ${priorityChips[t.priority] || 'chip-lavender'}">
                        ${t.priority}
                    </span>
                </div>
                <h4 class="font-extrabold text-base text-white leading-snug tracking-tight">${t.title}</h4>
                ${t.description ? `<p class="text-sm text-[#8e8e96] leading-relaxed line-clamp-2">${t.description}</p>` : ''}
                
                <div class="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono">
                    <div class="flex items-center space-x-2 text-[#f4f2ec]">
                        <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(t.assigned_to)}" class="h-5 w-5 rounded-full border border-white/20">
                        <span class="font-medium truncate max-w-[100px]">${t.assigned_to.split(' ')[0]}</span>
                    </div>

                    <div class="flex items-center space-x-1.5">
                        <span class="px-2 py-0.5 rounded-full bg-[#27272e] text-white border border-white/10 font-bold text-[11px]">${t.story_points || 3}pt</span>
                        ${col !== 'TODO' ? `<button onclick="moveTask('${t.id}', '${getPrev(col)}')" title="Move back" class="px-2.5 py-1 bg-[#27272e] hover:bg-white/20 text-[#f4f2ec] rounded-lg border border-white/10 transition">&larr;</button>` : ''}
                        ${col !== 'DONE' ? `<button onclick="moveTask('${t.id}', '${getNext(col)}')" title="Move forward" class="px-2.5 py-1 bg-[#27272e] hover:bg-[#c8f07a] hover:text-[#0a0a0c] text-[#f4f2ec] rounded-lg border border-white/10 transition font-bold">&rarr;</button>` : ''}
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
            btn.className = "task-filter-btn active chip chip-lime";
        } else {
            btn.className = "task-filter-btn chip bg-white/10 text-white";
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

async function fetchMessages() {
    try {
        const res = await fetch(`/api/messages?workspaceId=ws-core&channel=architecture`);
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
        container.innerHTML = `<div class="text-center py-8 text-[#8e8e96] font-mono text-sm">No socket messages yet.</div>`;
        return;
    }

    container.innerHTML = messages.map(m => `
        <div class="space-y-1">
            <div class="flex items-center space-x-2 font-mono text-xs">
                <img src="${m.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(m.user_name)}`}" class="h-5 w-5 rounded-full border border-white/20">
                <span class="font-bold text-[#c8f07a]">${m.user_name}</span>
                <span class="text-[#8e8e96] text-[11px]">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="text-[#f4f2ec] text-sm bg-[#1a1a1f] p-3 rounded-2xl border border-white/10 leading-relaxed font-sans">
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
                workspaceId: 'ws-core',
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
        "Kinetic socket benchmark: P99 broadcast latency at 2.1ms across 48 pods.",
        "Verified Redis cluster failover. Inflight WebSocket sessions transferred without disconnect.",
        "Deployed the optimistic concurrency lock to Sprint 42 board. Replicas in sync."
    ];
    const msg = peerMessages[Math.floor(Math.random() * peerMessages.length)];

    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workspaceId: 'ws-core',
            channel: 'architecture',
            userId: 'usr-marcus',
            userName: 'Marcus Vance',
            content: msg
        })
    });
    await fetchMessages();
};

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
        console.error("Failed to create task in D1:", err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    fetchMessages();
});
