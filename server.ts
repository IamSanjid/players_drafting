import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@/lib/socketTypes";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const STATE_CHANGED_EMIT_DEBOUNCE_MS = 75;

let pendingStateChangedTimer: NodeJS.Timeout | null = null;

const scheduleStateChangedEmit = (
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
) => {
  if (pendingStateChangedTimer) {
    return;
  }

  pendingStateChangedTimer = setTimeout(() => {
    pendingStateChangedTimer = null;
    io.emit("state_changed");
  }, STATE_CHANGED_EMIT_DEBOUNCE_MS);
};

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Relay events to ALL clients (including sender) so the drafter's own UI refreshes too
    socket.on("state_changed", () => {
      scheduleStateChangedEmit(io);
    });
    
    socket.on("pick_made", (data) => {
      io.emit("pick_made", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  server.once("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
