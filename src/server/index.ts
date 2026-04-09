import { Server } from "socket.io";
import { createServer } from "http";
import readline from "readline";
import {
  type Message,
  SocketEvents,
  type TopicStore,
  type TopicInfo,
} from "../common/types";
import { randomUUID } from "crypto";

class MessageBrokerServer {
  private io: Server;
  private topics: TopicStore = {};
  private serverPort: number = 3000;

  constructor() {
    const httpServer = createServer();
    this.io = new Server(httpServer, {
      cors: { origin: "*" },
      transports: ["websocket"],
    });

    this.setupSocketHandlers();
    this.setupCLI();
    this.startServer();
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      socket.emit(SocketEvents.TOPICS_LIST, this.getTopicsList());

      socket.on(SocketEvents.CHECK_TOPIC, (topicName: string, callback) => {
        const exists = !!this.topics[topicName];
        callback({ exists });
      });

      socket.on(SocketEvents.GET_TOPICS, () => {
        socket.emit(SocketEvents.TOPICS_LIST, this.getTopicsList());
      });

      socket.on(SocketEvents.CREATE_TOPIC, (topicName: string) => {
        if (!this.topics[topicName]) {
          this.topics[topicName] = {
            subscribers: new Set(),
            messages: [],
          };
          console.log(`📁 Topic created via socket: ${topicName}`);

          this.io.emit(SocketEvents.TOPIC_CREATED, {
            topic: topicName,
            message: `Topic "${topicName}" created successfully`,
          });

          socket.emit(SocketEvents.TOPIC_CREATED, {
            topic: topicName,
            message: `Topic "${topicName}" created successfully`,
          });
        } else {
          socket.emit(
            SocketEvents.ERROR,
            `Topic "${topicName}" already exists`,
          );
        }
      });

      socket.on(SocketEvents.SUBSCRIBE, (topicName: string) => {
        if (!this.topics[topicName]) {
          socket.emit(
            SocketEvents.ERROR,
            `Topic "${topicName}" doesn't exist. Create it using service terminal.`,
          );
          return;
        }

        socket.join(topicName);
        this.topics[topicName]?.subscribers.add(socket.id);

        console.log(`📡 Socket ${socket.id} subscribed to ${topicName}`);
        console.log(
          `   Total subscribers: ${this.topics[topicName]?.subscribers.size}`,
        );

        const lastMessages = this.topics[topicName]?.messages.slice(-5);
        if (lastMessages && lastMessages.length > 0) {
          socket.emit(SocketEvents.MESSAGE, {
            type: "history",
            messages: lastMessages,
          });
        }

        socket.emit(SocketEvents.MESSAGE, {
          type: "subscribed",
          topic: topicName,
          message: `✅ Successfully subscribed to "${topicName}"`,
        });
      });

      socket.on(
        SocketEvents.PUBLISH,
        (data: { topic: string; content: string }) => {
          const { topic, content } = data;

          if (!this.topics[topic]) {
            socket.emit(SocketEvents.ERROR, `Topic "${topic}" doesn't exist`);
            return;
          }

          const message: Message = {
            id: randomUUID(),
            topic: topic,
            content: content,
            timestamp: new Date(),
            publisherId: socket.id,
          };

          this.topics[topic]?.messages.push(message);

          this.io.to(topic).emit(SocketEvents.MESSAGE, {
            type: "new_message",
            message: message,
          });

          console.log(`📨 Message published to "${topic}": ${content}`);
          console.log(
            `   Subscribers notified: ${this.topics[topic]?.subscribers.size}`,
          );
        },
      );

      socket.on(SocketEvents.UNSUBSCRIBE, (topicName: string) => {
        if (this.topics[topicName]) {
          socket.leave(topicName);
          this.topics[topicName]?.subscribers.delete(socket.id);
          console.log(`🔌 Socket ${socket.id} unsubscribed from ${topicName}`);
        }
      });

      socket.on("disconnect", () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        for (const topic in this.topics) {
          this.topics[topic]?.subscribers.delete(socket.id);
        }
      });
    });
  }

  private getTopicsList(): TopicInfo[] {
    return Object.entries(this.topics).map(([name, data]) => ({
      name: name,
      subscriberCount: data?.subscribers.size,
      messageCount: data?.messages.length,
    }));
  }

  private setupCLI() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n🎯 Message Broker CLI Commands:");
    console.log("  • create <topic_name>  - Create new topic");
    console.log("  • list                 - Show all topics");
    console.log("  • stats <topic_name>   - Show topic statistics");
    console.log("  • exit                 - Stop server\n");

    rl.on("line", (input) => {
      const [command, ...args] = input.trim().split(" ");

      switch (command) {
        case "create":
          const topicName = args[0];
          if (!topicName) {
            console.log("❌ Usage: create <topic_name>");
            break;
          }
          if (!this.topics[topicName]) {
            this.topics[topicName] = {
              subscribers: new Set(),
              messages: [],
            };
            console.log(`✅ Topic "${topicName}" created via CLI`);

            this.io.emit(SocketEvents.TOPIC_CREATED, {
              topic: topicName,
              message: `Topic "${topicName}" created successfully`,
            });

            this.io.emit(SocketEvents.TOPICS_LIST, this.getTopicsList());
          } else {
            console.log(`⚠️ Topic "${topicName}" already exists`);
          }
          break;

        case "list":
          console.log("\n📋 Available Topics:");
          if (Object.keys(this.topics).length === 0) {
            console.log("  No topics created yet");
          } else {
            Object.entries(this.topics).forEach(([name, data]) => {
              console.log(
                `  • ${name} - ${data?.subscribers.size} subscribers, ${data?.messages.length} messages`,
              );
            });
          }
          console.log("");
          break;

        case "stats":
          const topic = args[0];
          if (topic && this.topics[topic]) {
            const data = this.topics[topic];
            console.log(`\n📊 Stats for "${topic}":`);
            console.log(`  Subscribers: ${data?.subscribers.size}`);
            console.log(`  Total messages: ${data?.messages.length}`);
            console.log(
              `  Last message: ${data?.messages[data.messages.length - 1]?.content || "None"}`,
            );
            console.log("");
          } else {
            console.log(`❌ Topic "${topic}" not found`);
          }
          break;

        case "exit":
          console.log("Shutting down server...");
          process.exit(0);
          break;

        default:
          if (command) console.log(`❌ Unknown command: ${command}`);
      }
    });
  }

  private startServer() {
    const httpServer = (this.io as any).httpServer;
    httpServer.listen(this.serverPort, () => {
      console.log(
        `\n🚀 Message Broker Server running on port ${this.serverPort}`,
      );
      console.log(`📡 Socket.IO server ready for connections\n`);
    });
  }
}

new MessageBrokerServer();
