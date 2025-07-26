'use client';

import { DiscordServer } from '@/app/page';
import { MemberRequest, StreamVideoClient } from '@stream-io/video-client';
import { createContext, useCallback, useContext, useState } from 'react';
import { Channel, ChannelFilters, StreamChat } from 'stream-chat';
import { DefaultStreamChatGenerics } from 'stream-chat-react';
import { v4 as uuid } from 'uuid';

// Define custom channel data interface
interface CustomChannelData {
  server?: string;
  category?: string;
  image?: string;
  [key: string]: any;
}

// Extend the default generics to include our custom data structure
interface CustomStreamChatGenerics extends DefaultStreamChatGenerics {
  channelType: {
    data?: CustomChannelData;
  } & DefaultStreamChatGenerics['channelType'];
}

type DiscordState = {
  server?: DiscordServer;
  callId: string | undefined;
  channelsByCategories: Map<string, Array<Channel<CustomStreamChatGenerics>>>;
  changeServer: (server: DiscordServer | undefined, client: StreamChat) => void;
  createServer: (
    client: StreamChat,
    videoClient: StreamVideoClient,
    name: string,
    imageUrl: string,
    userIds: string[]
  ) => void;
  createChannel: (
    client: StreamChat,
    name: string,
    category: string,
    userIds: string[]
  ) => void;
  createCall: (
    client: StreamVideoClient,
    server: DiscordServer,
    channelName: string,
    userIds: string[]
  ) => Promise<void>;
  setCall: (callId: string | undefined) => void;
};

const initialValue: DiscordState = {
  server: undefined,
  callId: undefined,
  channelsByCategories: new Map(),
  changeServer: () => {},
  createServer: () => {},
  createChannel: () => {},
  createCall: async () => {},
  setCall: () => {},
};

const DiscordContext = createContext<DiscordState>(initialValue);

export const DiscordContextProvider: any = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [myState, setMyState] = useState<DiscordState>(initialValue);

  const changeServer = useCallback(
    async (server: DiscordServer | undefined, client: StreamChat) => {
      let filters: ChannelFilters = {
        type: 'messaging',
        members: { $in: [client.userID as string] },
      };
      if (!server) {
        filters.member_count = 2;
      }

      console.log(
        '[DiscordContext - loadServerList] Querying channels for ',
        client.userID
      );
      const channels = await client.queryChannels(filters);
      const channelsByCategories = new Map<
        string,
        Array<Channel<CustomStreamChatGenerics>>
      >();
      
      if (server) {
        const categories = new Set(
          channels
            .filter((channel) => {
              const channelData = channel.data?.data as CustomChannelData;
              return channelData?.server === server.name;
            })
            .map((channel) => {
              const channelData = channel.data?.data as CustomChannelData;
              return channelData?.category || 'Uncategorized';
            })
        );

        for (const category of Array.from(categories)) {
          channelsByCategories.set(
            category,
            channels.filter((channel) => {
              const channelData = channel.data?.data as CustomChannelData;
              return (
                channelData?.server === server.name &&
                channelData?.category === category
              );
            }) as Array<Channel<CustomStreamChatGenerics>>
          );
        }
      } else {
        channelsByCategories.set('Direct Messages', channels as Array<Channel<CustomStreamChatGenerics>>);
      }
      
      setMyState((myState) => {
        return { ...myState, server, channelsByCategories };
      });
    },
    [setMyState]
  );

  const createCall = useCallback(
    async (
      client: StreamVideoClient,
      server: DiscordServer,
      channelName: string,
      userIds: string[]
    ) => {
      const callId = uuid();
      const audioCall = client.call('default', callId);
      const audioChannelMembers: MemberRequest[] = userIds.map((userId) => {
        return {
          user_id: userId,
        };
      });
      try {
        const createdAudioCall = await audioCall.create({
          data: {
            custom: {
              // serverId: server?.id,
              serverName: server?.name,
              callName: channelName,
            },
            members: audioChannelMembers,
          },
        });
        console.log(
          `[DiscordContext] Created Call with id: ${createdAudioCall.call.id}`
        );
      } catch (err) {
        console.log(err);
      }
    },
    []
  );

  const createServer = useCallback(
    async (
      client: StreamChat,
      videoClient: StreamVideoClient,
      name: string,
      imageUrl: string,
      userIds: string[]
    ) => {
      const messagingChannel = client.channel('messaging', uuid(), {
        name: 'Welcome',
        members: userIds,
        data: {
          image: imageUrl,
          server: name,
          category: 'Text Channels',
        },
      });

      try {
        const response = await messagingChannel.create();
        console.log('[DiscordContext - createServer] Response: ', response);
        if (myState.server) {
          await createCall(
            videoClient,
            myState.server,
            'General Voice Channel',
            userIds
          );
        }
        changeServer({ name, image: imageUrl }, client);
      } catch (err) {
        console.error(err);
      }
    },
    [changeServer, createCall, myState.server]
  );

  const createChannel = useCallback(
    async (
      client: StreamChat,
      name: string,
      category: string,
      userIds: string[]
    ) => {
      if (client.userID) {
        const channel = client.channel('messaging', {
          name: name,
          members: userIds,
          data: {
            server: myState.server?.name,
            category: category,
          },
        });
        try {
          const response = await channel.create();
        } catch (err) {
          console.log(err);
        }
      }
    },
    [myState.server?.name]
  );

  const setCall = useCallback(
    (callId: string | undefined) => {
      setMyState((myState) => {
        return { ...myState, callId };
      });
    },
    [setMyState]
  );

  const store: DiscordState = {
    server: myState.server,
    callId: myState.callId,
    channelsByCategories: myState.channelsByCategories,
    changeServer: changeServer,
    createServer: createServer,
    createChannel: createChannel,
    createCall: createCall,
    setCall: setCall,
  };

  return (
    <DiscordContext.Provider value={store}>{children}</DiscordContext.Provider>
  );
};

export const useDiscordContext = () => useContext(DiscordContext);