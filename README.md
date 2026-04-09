# Bun Message Broker
Bun Message Broker - Real-time CLI Pub/Sub System with Socket.IO

A lightweight, real-time publish-subscribe (Pub/Sub) message broker built with [Bun](https://bun.sh/) and [Socket.IO](https://socket.io/). This system consists of a central broker server, a publisher client, and a subscriber client, all running directly from your terminal.

## Prerequisites
- [Bun](https://bun.sh/) installed on your machine.

## Installation

1. Navigate to the project directory.
2. Install dependencies:
   ```bash
   bun install
   ```

## How to Start the Project

The system requires you to run the Broker Server, along with at least one Publisher and one Subscriber. You should open **three separate terminals** for the best experience.

### 1. Start the Broker Server
Run the broker server, which acts as the central hub for topics and messages.
```bash
bun run start
# or 
bun run src/server/index.ts
```
**Broker Server Commands:**
- `create <topic_name>` - Create a new topic
- `list` - Show all topics
- `stats <topic_name>` - Show topic statistics
- `exit` - Stop server

---

### 2. Start a Subscriber Client
In a new terminal window, start the subscriber to listen for messages on specific topics.
```bash
bun run src/client/subscriber.ts
```
**Subscriber Commands:**
- `sub <topic_name>` - Subscribe to a topic
- `unsub <topic_name>` - Unsubscribe from topic
- `list` - Show subscribed topics
- `topics` - Show all available topics
- `exit` - Exit subscriber

---

### 3. Start a Publisher Client
In another terminal window, start the publisher to send messages to topics.
```bash
bun run src/client/publisher.ts
```
**Publisher Commands:**
- `use <topic_name>` - Select existing topic to publish
- `send <message>` - Send message to current topic
- `topics` - Show available topics
- `current` - Show current topic
- `refresh` - Refresh topics from server
- `exit` - Exit publisher

## How It Works in the Terminal (Example Flow)

1. **Start the Server** (`bun run start`).
2. From the *Server Terminal*, create a topic:
   ```text
   create tech-news
   ```
3. **Start the Subscriber** (`bun run src/client/subscriber.ts`). Then subscribe to the topic:
   ```text
   sub tech-news
   ```
4. **Start the Publisher** (`bun run src/client/publisher.ts`). Set the active topic and send a message:
   ```text
   use tech-news
   send Hello Subscribing World!
   ```
5. You will see the message immediately appear in the **Subscriber** terminal!
