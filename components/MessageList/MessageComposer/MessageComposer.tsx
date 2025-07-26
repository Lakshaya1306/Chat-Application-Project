import {
  Emoji,
  GIF,
  PlusCircle,
  Present,
} from '@/components/ChannelList/Icons';
import { useState } from 'react';
import { SendButton, useChatContext } from 'stream-chat-react';
import { plusItems } from './plusItems';
import ChannelListMenuRow from '@/components/ChannelList/TopBar/ChannelListMenuRow';

export default function MessageComposer(): JSX.Element {
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const { channel } = useChatContext();
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      channel?.sendMessage({ text: message });
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className='flex mx-6 my-6 px-4 py-1 bg-composer-gray items-center justify-center space-x-4 rounded-md text-gray-600 relative'>
      {plusMenuOpen && (
        <div className='absolute p-2 z-10 -left-6 bottom-12'>
          <div className='bg-white p-2 shadow-lg rounded-md w-40 flex flex-col'>
            {plusItems.map((option) => (
              <button
                key={option.name}
                onClick={() => setPlusMenuOpen(false)}
              >
                <ChannelListMenuRow {...option} />
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        className='border-transparent bg-transparent outline-none text-sm font-semibold m-0 text-gray-normal'
        type='text'
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Message #general'
      />
      <SendButton sendMessage={handleSendMessage} />
    </div>
  );
}
