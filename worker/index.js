// Cloudflare Edge Worker for Real-Time Collaboration Platform
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (path.startsWith('/api/')) {
            const apiPath = path.replace(/^\/api/, '');
            const db = env.DB;
            if (!db) {
                return new Response(JSON.stringify({ error: "D1 database 'DB' not bound" }), { status: 500, headers: corsHeaders });
            }

            try {
                // GET /api/health
                if (apiPath === '/health') {
                    return new Response(JSON.stringify({
                        status: "UP",
                        service: "Real-Time Collaboration Edge API",
                        redisPubSub: "SYNC_ENABLED",
                        database: "D1_CONNECTED",
                        timestamp: new Date().toISOString()
                    }), { headers: corsHeaders });
                }

                // GET /api/workspaces
                if (apiPath === '/workspaces' && method === 'GET') {
                    const { results } = await db.prepare("SELECT * FROM workspaces ORDER BY created_at ASC").all();
                    return new Response(JSON.stringify({ success: true, workspaces: results }), { headers: corsHeaders });
                }

                // GET /api/boards?workspaceId=...
                if (apiPath.startsWith('/boards') && method === 'GET') {
                    const wsId = url.searchParams.get('workspaceId') || 'ws-1';
                    const { results } = await db.prepare("SELECT * FROM boards WHERE workspace_id = ?").bind(wsId).all();
                    return new Response(JSON.stringify({ success: true, boards: results }), { headers: corsHeaders });
                }

                // GET /api/tasks?boardId=...
                if (apiPath.startsWith('/tasks') && method === 'GET') {
                    const boardId = url.searchParams.get('boardId') || 'bd-1';
                    const { results } = await db.prepare("SELECT * FROM tasks WHERE board_id = ? ORDER BY position ASC, created_at ASC").bind(boardId).all();
                    return new Response(JSON.stringify({ success: true, tasks: results }), { headers: corsHeaders });
                }

                // POST /api/tasks (Create task)
                if (apiPath === '/tasks' && method === 'POST') {
                    const body = await request.json();
                    const { boardId = 'bd-1', title, description = '', status = 'TODO', priority = 'MEDIUM', assignedTo = 'Shreeharsha N L' } = body;
                    if (!title) {
                        return new Response(JSON.stringify({ error: "Task title is required" }), { status: 400, headers: corsHeaders });
                    }
                    const taskId = 'tsk-' + crypto.randomUUID().substring(0, 8);
                    await db.prepare("INSERT INTO tasks (id, board_id, title, description, status, priority, assigned_to, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                        .bind(taskId, boardId, title, description, status, priority, assignedTo, Date.now() % 1000).run();
                    
                    const { results } = await db.prepare("SELECT * FROM tasks WHERE id = ?").bind(taskId).all();
                    return new Response(JSON.stringify({ success: true, task: results[0] }), { headers: corsHeaders });
                }

                // PUT /api/tasks/:id/status (Move task between columns)
                if (apiPath.startsWith('/tasks/') && apiPath.endsWith('/status') && method === 'PUT') {
                    const taskId = apiPath.split('/')[2];
                    const { status } = await request.json();
                    await db.prepare("UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, taskId).run();
                    return new Response(JSON.stringify({ success: true, taskId, status }), { headers: corsHeaders });
                }

                // GET /api/messages?workspaceId=...
                if (apiPath.startsWith('/messages') && method === 'GET') {
                    const wsId = url.searchParams.get('workspaceId') || 'ws-1';
                    const channel = url.searchParams.get('channel') || 'general';
                    const { results } = await db.prepare("SELECT * FROM messages WHERE workspace_id = ? AND channel = ? ORDER BY created_at ASC LIMIT 50")
                        .bind(wsId, channel).all();
                    return new Response(JSON.stringify({ success: true, messages: results }), { headers: corsHeaders });
                }

                // POST /api/messages (Send chat message)
                if (apiPath === '/messages' && method === 'POST') {
                    const body = await request.json();
                    const { workspaceId = 'ws-1', channel = 'general', userId = 'usr-1', userName = 'Shreeharsha N L', content, avatar } = body;
                    if (!content) {
                        return new Response(JSON.stringify({ error: "Message content required" }), { status: 400, headers: corsHeaders });
                    }
                    const msgId = 'msg-' + crypto.randomUUID().substring(0, 8);
                    const userAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`;
                    await db.prepare("INSERT INTO messages (id, workspace_id, channel, user_id, user_name, avatar, content) VALUES (?, ?, ?, ?, ?, ?, ?)")
                        .bind(msgId, workspaceId, channel, userId, userName, userAvatar, content).run();

                    // Update user presence
                    await db.prepare("INSERT OR REPLACE INTO presence (user_id, user_name, avatar, status, last_seen) VALUES (?, ?, ?, 'ONLINE', CURRENT_TIMESTAMP)")
                        .bind(userId, userName, userAvatar).run();

                    const { results } = await db.prepare("SELECT * FROM messages WHERE id = ?").bind(msgId).all();
                    return new Response(JSON.stringify({ success: true, message: results[0] }), { headers: corsHeaders });
                }

                // GET /api/presence
                if (apiPath === '/presence' && method === 'GET') {
                    const { results } = await db.prepare("SELECT * FROM presence ORDER BY last_seen DESC LIMIT 20").all();
                    return new Response(JSON.stringify({ success: true, presence: results }), { headers: corsHeaders });
                }

                // POST /api/presence/heartbeat
                if (apiPath === '/presence/heartbeat' && method === 'POST') {
                    const { userId, userName, status = 'ONLINE' } = await request.json();
                    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`;
                    await db.prepare("INSERT OR REPLACE INTO presence (user_id, user_name, avatar, status, last_seen) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)")
                        .bind(userId, userName, avatar, status).run();
                    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
                }

                return new Response(JSON.stringify({ error: "Route not found: " + apiPath }), { status: 404, headers: corsHeaders });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
            }
        }

        // Serve frontend assets
        if (env.ASSETS) {
            return env.ASSETS.fetch(request);
        }
        return new Response("Not Found", { status: 404 });
    }
};
