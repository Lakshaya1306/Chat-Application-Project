import { UserObject } from '@/model/UserObject';
import { StreamChat } from 'stream-chat';

export async function GET() {
  const serverClient = StreamChat.getInstance(
    'ec92e6bz3dyx',
    process.env.STREAM_SECRET
  );
  const response = await serverClient.queryUsers({});
  const data: UserObject[] = response.users
    .filter((user) => user.role !== 'admin')
    .map((user) => {
      return {
        id: user.id,
        name: user.name ?? user.id,
        image: user.image as string,
        online: user.online,
        lastOnline: user.last_active,
      };
    });

  return Response.json({ data });
}
