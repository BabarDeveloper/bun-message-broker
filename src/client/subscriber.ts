import { io, Socket } from "socket.io-client";
import readline from "readline";
import { SocketEvents, type Message, type TopicInfo } from "../common/types";

class Subscriber {
  private socket: Socket;
  private subscriberId: string;
  private subscribedTopics: Map<string, TopicInfo> = new Map();
  private availableTopics: Map<string, TopicInfo> = new Map();

  constructor(serverUrl: string = "http://localhost:3000") {
    this.subscriberId = `subscriber_${Date.now()}`;
    this.socket = io(serverUrl, {
      transports: ["websocket"],
    });

    this.setupSocketListeners();
    this.setupCLI();
  }

  private setupSocketListeners() {
    this.socket.on("connect", () => {
      console.log(`✅ Connected to broker as ${this.subscriberId}`);
      console.log(`📡 Socket ID: ${this.socket.id}\n`);
      this.showHelp();
    });

    this.socket.on(SocketEvents.TOPICS_LIST, (topics: TopicInfo[]) => {
      this.availableTopics.clear();
      topics.forEach((topic) => {
        this.availableTopics.set(topic.name, topic);
        if (this.subscribedTopics.has(topic.name)) {
          this.subscribedTopics.set(topic.name, topic);
        }
      });
    });

    this.socket.on(SocketEvents.TOPIC_CREATED, (data) => {
      this.availableTopics.set(data.topic, {
        name: data.topic,
        subscriberCount: 0,
        messageCount: 0,
      });
      console.log(`📢 New topic created: ${data.topic}`);
      console.log(`💡 Use 'sub ${data.topic}' to subscribe\n`);
    });

    this.socket.on(SocketEvents.MESSAGE, (data: any) => {
      if (data.type === "new_message") {
        const msg: Message = data.message;
        console.log(`\n📨 [${msg.topic}] New message: ${msg.content}`);
        console.log(
          `   Received at: ${new Date(msg.timestamp).toLocaleString()}`,
        );
        console.log(`   From publisher: ${msg.publisherId.substring(0, 8)}...`);
        console.log("\n💬 Enter command (or 'help'): ");
      } else if (data.type === "subscribed") {
        console.log(`\n✅ ${data.message}\n`);
      } else if (data.type === "history") {
        console.log(
          `\n📜 Last ${data.messages.length} messages in this topic:`,
        );
        data.messages.forEach((msg: Message) => {
          console.log(
            `   • ${msg.content} (${new Date(msg.timestamp).toLocaleString()})`,
          );
        });
        console.log("");
      }
    });

    this.socket.on(SocketEvents.ERROR, (error: string) => {
      console.log(`\n❌ Error: ${error}\n`);
    });

    this.socket.on("disconnect", () => {
      console.log(`❌ Disconnected from broker`);
    });
  }

  private showHelp() {
    console.log("📚 Subscriber Commands:");
    console.log("  • sub <topic_name>     - Subscribe to a topic");
    console.log("  • unsub <topic_name>   - Unsubscribe from topic");
    console.log("  • list                 - Show subscribed topics");
    console.log("  • topics               - Show all available topics");
    console.log("  • help                 - Show this help");
    console.log("  • exit                 - Exit subscriber\n");
  }

  private setupCLI() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("line", (input) => {
      const [command, ...args] = input.trim().split(" ");
      const topicName = args[0];

      switch (command) {
        case "sub":
          if (!topicName) {
            console.log("❌ Usage: sub <topic_name>");
            break;
          }

          if (!this.availableTopics.has(topicName)) {
            console.log(`❌ Topic "${topicName}" does not exist`);
            console.log(
              `💡 Available topics: ${Array.from(this.availableTopics.keys()).join(", ") || "none"}`,
            );
            console.log(`💡 Create topic using SERVICE TERMINAL first\n`);
            break;
          }

          this.socket.emit(SocketEvents.SUBSCRIBE, topicName);
          this.subscribedTopics.set(
            topicName,
            this.availableTopics.get(topicName)!,
          );
          console.log(`🔔 Subscribing to topic: ${topicName}...`);
          break;

        case "unsub":
          if (!topicName) {
            console.log("❌ Usage: unsub <topic_name>");
            break;
          }

          this.socket.emit(SocketEvents.UNSUBSCRIBE, topicName);
          this.subscribedTopics.delete(topicName);
          console.log(`🔕 Unsubscribed from: ${topicName}`);
          break;

        case "list":
          if (this.subscribedTopics.size === 0) {
            console.log("📭 Not subscribed to any topics yet");
            console.log("   Use 'sub <topic_name>' to subscribe");
          } else {
            console.log(
              `\n📑 Subscribed topics (${this.subscribedTopics.size}):`,
            );
            Array.from(this.subscribedTopics.values()).forEach((topic) => {
              console.log(`  • ${topic.name}`);
            });
            console.log("");
          }
          break;

        case "topics":
          if (this.availableTopics.size === 0) {
            console.log("📭 No topics available on server");
            console.log("💡 Create a topic using SERVICE TERMINAL first:");
            console.log("   Command: create <topic_name>\n");
          } else {
            console.log(
              `\n📋 Available topics (${this.availableTopics.size}):`,
            );
            Array.from(this.availableTopics.values()).forEach((topic) => {
              console.log(
                `  • ${topic.name} - ${topic.subscriberCount} subscribers, ${topic.messageCount} messages`,
              );
            });
            console.log("");
          }
          break;

        case "help":
          this.showHelp();
          break;

        case "exit":
          console.log("👋 Goodbye!");
          this.socket.disconnect();
          process.exit(0);
          break;

        default:
          if (command)
            console.log(
              `❌ Unknown command: ${command}. Type 'help' for commands.`,
            );
      }
    });
  }
}

console.log("\n👂 Subscriber Client Starting...\n");
new Subscriber();
