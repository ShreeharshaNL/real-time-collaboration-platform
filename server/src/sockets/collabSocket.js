module.exports = function(io) {
    const activeUsers = new Map();

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('user:join', ({ user, workspaceId }) => {
            activeUsers.set(socket.id, { ...user, workspaceId, socketId: socket.id });
            socket.join(`workspace:${workspaceId}`);
            
            // Broadcast active members in this workspace
            const workspaceMembers = Array.from(activeUsers.values()).filter(u => u.workspaceId === workspaceId);
            io.to(`workspace:${workspaceId}`).emit('presence:update', workspaceMembers);
        });

        socket.on('task:move', (data) => {
            socket.to(`workspace:${data.workspaceId}`).emit('task:moved', data);
        });

        socket.on('chat:message', (data) => {
            io.to(`workspace:${data.workspaceId}`).emit('chat:received', data);
        });

        socket.on('chat:typing', ({ workspaceId, user, isTyping }) => {
            socket.to(`workspace:${workspaceId}`).emit('chat:userTyping', { user, isTyping });
        });

        socket.on('disconnect', () => {
            const user = activeUsers.get(socket.id);
            if (user) {
                activeUsers.delete(socket.id);
                const remaining = Array.from(activeUsers.values()).filter(u => u.workspaceId === user.workspaceId);
                io.to(`workspace:${user.workspaceId}`).emit('presence:update', remaining);
            }
        });
    });
};
