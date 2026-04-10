import { io, Socket } from "socket.io-client";
import readline from "readline";
import { SocketEvents, type TopicInfo } from "../common/types";

class Publisher {
  private socket: Socket;
  private publisherId: string;
  private currentTopic: string | null = null;
  private existingTopics: Map<string, TopicInfo> = new Map();

  constructor(serverUrl: string = "http://localhost:3000") {
    this.publisherId = `publisher_${Date.now()}`;
    this.socket = io(serverUrl, {
      transports: ["websocket"],
    });

    this.setupSocketListeners();
    this.setupCLI();
  }

  private setupSocketListeners() {
    this.socket.on("connect", () => {
      console.log(`✅ Connected to broker as ${this.publisherId}`);
      console.log(`📡 Socket ID: ${this.socket.id}\n`);
      this.showHelp();
    });

    this.socket.on(SocketEvents.TOPICS_LIST, (topics: TopicInfo[]) => {
      this.existingTopics.clear();
      topics.forEach((topic) => {
        this.existingTopics.set(topic.name, topic);
      });
    });

    this.socket.on(SocketEvents.TOPIC_CREATED, (data) => {
      this.existingTopics.set(data.topic, {
        name: data.topic,
        subscriberCount: 0,
        messageCount: 0,
      });
      console.log(`✅ ${data.message}`);
    });

    this.socket.on(SocketEvents.ERROR, (error: string) => {
      console.log(`❌ Error: ${error}`);
    });

    this.socket.on("disconnect", () => {
      console.log(`❌ Disconnected from broker`);
    });
  }

  private showHelp() {
    console.log("📚 Publisher Commands:");
    console.log("  • use <topic_name>     - Select existing topic to publish");
    console.log("  • send <message>       - Send message to current topic");
    console.log("  • topics               - Show available topics");
    console.log("  • current              - Show current topic");
    console.log("  • refresh              - Refresh topics from server");
    console.log("  • help                 - Show this help");
    console.log("  • exit                 - Exit publisher\n");
  }

  private setupCLI() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("line", async (input) => {
      const [command, ...args] = input.trim().split(" ");
      const message = args.join(" ");

      switch (command) {
        case "use":
          const topicName = args[0];
          if (!topicName) {
            console.log("❌ Usage: use <topic_name>");
            break;
          }

          if (!this.existingTopics.has(topicName)) {
            console.log(`❌ Topic "${topicName}" does not exist on server`);
            console.log(
              `💡 First create topic using SERVICE TERMINAL: create ${topicName}`,
            );
            console.log(
              `💡 Then use 'refresh' command to update topics list\n`,
            );
            break;
          }

          this.currentTopic = topicName;
          console.log(`📌 Now publishing to topic: ${topicName}`);
          break;

        case "send":
          if (!this.currentTopic) {
            console.log("❌ No topic selected. Use 'use <topic_name>' first");
            break;
          }
          if (!message) {
            console.log("❌ Usage: send <message>");
            break;
          }

          if (!this.existingTopics.has(this.currentTopic)) {
            console.log(
              `❌ Topic "${this.currentTopic}" no longer exists on server`,
            );
            this.currentTopic = null;
            break;
          }

          this.socket.emit(SocketEvents.PUBLISH, {
            topic: this.currentTopic,
            content: message,
          });
          console.log(`📤 Published to "${this.currentTopic}": ${message}`);
          break;

        case "topics":
          if (this.existingTopics.size === 0) {
            console.log("📭 No topics available on server");
            console.log("💡 Create a topic using SERVICE TERMINAL first:");
            console.log("   Command: create <topic_name>");
            console.log("💡 Then use 'refresh' command to update\n");
          } else {
            console.log(`\n📋 Available topics (${this.existingTopics.size}):`);
            Array.from(this.existingTopics.values()).forEach((topic) => {
              console.log(
                `  • ${topic.name} - ${topic.subscriberCount} subscribers, ${topic.messageCount} messages`,
              );
            });
            console.log("");
          }
          break;

        case "refresh":
          console.log("🔄 Refreshing topics from server...");
          this.socket.emit(SocketEvents.GET_TOPICS);
          break;

        case "current":
          if (this.currentTopic) {
            const topicInfo = this.existingTopics.get(this.currentTopic);
            console.log(`📍 Current topic: ${this.currentTopic}`);
            if (topicInfo) {
              console.log(`   Subscribers: ${topicInfo.subscriberCount}`);
              console.log(`   Total messages: ${topicInfo.messageCount}`);
            }
          } else {
            console.log("📍 No topic selected. Use 'use <topic_name>'");
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

console.log("\n🎙️ Publisher Client Starting...\n");
new Publisher();
