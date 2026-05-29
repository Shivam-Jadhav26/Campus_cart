let io;

export const setIO = (socketIOInstance) => {
  io = socketIOInstance;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
