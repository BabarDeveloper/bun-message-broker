export enum SocketEvents {
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
  PUBLISH = "publish",
  MESSAGE = "message",
  CREATE_TOPIC = "create_topic",
  TOPIC_CREATED = "topic_created",
  GET_TOPICS = "get_topics",
  TOPICS_LIST = "topics_list",
  CHECK_TOPIC = "check_topic",
  ERROR = "error",
}

export interface Message {
  id: string;
  topic: string;
  content: string;
  timestamp: Date;
  publisherId: string;
}

export interface TopicStore {
  [topicName: string]:
    | {
        subscribers: Set<string>;
        messages: Message[];
      }
    | undefined;
}

export interface TopicInfo {
  name: string;
  subscriberCount: number | undefined;
  messageCount: number | undefined;
}
