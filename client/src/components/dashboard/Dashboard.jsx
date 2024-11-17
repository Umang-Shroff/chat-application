import React, { useEffect, useRef, useState } from 'react'
import ChatList from '../chatList/ChatList'
// import ChatText from '../chatContent/ChatText'
import axios from 'axios';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { io } from 'socket.io-client';

const Dashboard = () => {

  const messageRef = useRef(null)

  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);

  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem('user:detail')));
  const [talks, setTalks] = useState([]);
  const [messages, setMessages] = useState({ messages: { data: [] } });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchData = JSON.parse(localStorage.getItem('user:detail'));
    const fetchTalks = async () => {
      const res = await axios.get(`/api/conversations/${fetchData?.id}`);
      setTalks(res.data);
    }
    fetchTalks();
  }, []);

  useEffect(()=>{
    messageRef?.current?.scrollIntoView({ behavior: 'smooth' })
  },[messages?.messages])

  // Handle socket connection
  useEffect(() => {
    const socketInstance = io('http://localhost:8080');
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Listen to socket messages
  useEffect(() => {
    if (socket) {
      socket.emit('addUser', userData?.id);
  
      socket.on('getUsers', (users) => {
        setActiveUsers(users);
      });
  
      socket.on('getMessage', (data) => {
        setMessages((prevState) => {
          const newMessages = prevState?.messages?.data
            ? [...prevState.messages.data, { user: data.user, message: data.message }]
            : [{ user: data.user, message: data.message }];
          return { ...prevState, messages: { ...prevState.messages, data: newMessages } };
        });
      });
    }
  
    return () => {
      if (socket) {
        socket.off('getUsers');
        socket.off('getMessage');
      }
    };
  }, [socket, userData]);
  

  const handleSelectChat = async (chatId, name, id) => {
    setSelectedChat(chatId);
    setSelectedName(name);
    setSelectedId(id);
    setMessages({ messages: { data: [] } }); // Clear messages when changing chat

    if (chatId !== 'new') {
      const resx = await axios.get(`/api/message/${chatId}`);
      setMessages({ messages: { data: resx.data } });
    }
  };

  // Send message via socket and API
  const sendMessage = async () => {
    if (selectedChat === 'new') {
      // Send "Hi" for new chat
      socket.emit('sendMessage', {
        conversationId: selectedChat,
        senderId: userData.id,
        message: 'Hi',
        receiverId: selectedId,
      });
  
      try {
        await axios.post('/api/message', {
          conversationId: selectedChat,
          senderId: userData.id,
          message: 'Hi',
          receiverId: selectedId,
        });
      } catch (error) {
        console.log('Error in posting new message: ', error);
      }
    } else {
      // Only emit the message to the socket, don't update the state yet
      socket.emit('sendMessage', {
        conversationId: selectedChat,
        senderId: userData.id,
        message: typedText,
        receiverId: selectedId,
      });
  
      try {
        await axios.post('/api/message', {
          conversationId: selectedChat,
          senderId: userData.id,
          message: typedText,
          receiverId: selectedId,
        });
      } catch (error) {
        console.log('Error in posting new message: ', error);
      }
    }
  
    // Reset typed text after sending the message
    setTypedText('');
  };


  const handleSocketLogout = () => {
    if (socket) {
      socket.disconnect();
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const respx = await axios.get('/api/users');
      setAllUsers(respx.data);
    };
    fetchUsers();
  }, []);

  const openPanel = () => {
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <div className="w-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-full sm:w-[8%] flex justify-center border h-screen bg-white relative">
        <div className="flex items-center flex-col pt-6 w-24 sm:w-24 lg:w-24 h-screen border-gray-300 border-r-2">
          <div className="flex justify-center border rounded-lg bg-blue-700 h-16 w-16 mb-4"></div>

          <div className="h-12 w-12 bg-blue-400 border mt-6 rounded-lg cursor-pointer"></div>

          <div
            className="h-12 w-12 bg-blue-400 border mt-6 rounded-lg cursor-pointer"
            onClick={openPanel}
          ></div>

          {/* Panel for all users (Contacts) */}
          <div
            className={`fixed top-0 left-0 h-full w-72 sm:w-72 md:w-[50vw] lg:w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
              isPanelOpen ? 'translate-x-0' : '-translate-x-full'
            } z-50`}
          >
            <div className="flex justify-end p-4">
              <button onClick={closePanel} className="text-xl font-bold">
                X
              </button>
            </div>
          
            <div className="p-6 h-full overflow-y-scroll">
              <h2 className="text-lg font-semibold">All Contacts</h2>
          
              {allUsers.map(({ userId, user, index }) => {
                const key = index || userId;
                return (
                  <div key={key} className="border-b-[1.5px] cursor-pointer">
                    <div
                      className="mt-2 flex items-center rounded-lg p-3 mb-2 hover:bg-gray-100"
                      onClick={() => handleSelectChat('new', user?.name, user?.receiverId)}
                    >
                      <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{user?.name}</span>
                          <span className="text-xs text-gray-500">{user?.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
            
          {/* Bottom Section (Profile and Logout) */}
          <div className="absolute bottom-10 flex flex-col justify-center items-center space-y-4 z-10">
            <p className="font-semibold text-sm sm:text-base">{userData.name}</p>
            
            {/* Profile Image */}
            <div className="border border-blue-700 p-[2px] relative bottom-3 rounded-full">
              <img className="bg-blue-300 border w-14 h-14 sm:w-16 sm:h-16 rounded-full" src="" width={75} height={75} />
            </div>
            
            {/* Logout Button */}
            <button
              onClick={() => {
                localStorage.removeItem('user:token');
                localStorage.removeItem('user:detail');
                handleSocketLogout();
                alert("You have been logged out.");
                window.location.href = '/login';
              }}
              className="border rounded-lg p-2 mt-4 bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-[27%] border overflow-y-scroll overflow-x-hidden h-screen">
        <ChatList convoData={talks} onSelectChat={handleSelectChat} />
      </div>

      <div className="w-full sm:w-3/4 lg:w-[65%] border overflow-y-hidden overflow-x-hidden h-screen">
        {/* Header */}
        <div className="fixed top-0 w-full h-[15%] bg-white border-b-[1.5px] shadow-md rounded-bl-xl flex justify-between items-center px-6 z-10">
          <div className="flex items-center gap-4">
            {selectedName === '' ? (
              <span></span>
            ) : (
              <>
                <img src="#" className="h-12 w-12 bg-gray-300 border rounded-full" />
                <div>
                  <h1 className="text-lg font-semibold text-black">{selectedName}</h1>
                  <span className="text-sm text-gray-500">{userData.email}</span>
                </div>
              </>
            )}
          </div>
        </div>
          
        {/* Chat messages */}
        <div className="bg-blue-50 w-full h-screen pt-[15%] sm:pt-[20%] pb-20 overflow-hidden relative">
          <div className="absolute w-72 h-72 bg-[rgba(79,70,229,0.35)] rounded-full blur-[100px] top-20 left-10"></div>
          <div className="absolute w-96 h-96 bg-[rgba(79,70,229,0.35)] rounded-full blur-[100px] top-1/2 right-10"></div>
          <div className="absolute w-48 h-48 bg-[rgba(79,70,229,0.35)] rounded-full blur-[100px] bottom-10 left-1/2 transform -translate-x-1/2"></div>
          
          {/* Message list */}
          <div className="overflow-y-auto h-[70vh] sm:h-[70vh] px-6 relative z-10">
            {messages?.messages?.data?.length > 0 ? (
              messages.messages.data.map((message, index) => {
                const key = message._id || index;
                const isSender = message.user.id === userData.id;
              
                return (
                  <>
                    <div
                      key={key}
                      className={`max-w-[60%] mt-4 ${isSender ? 'ml-auto bg-blue-500 text-white' : 'bg-white'} p-4 rounded-xl shadow-md`}
                    >
                      {message.message}
                    </div>
                    <div ref={messageRef}></div>
                  </>
                );
              })
            ) : (
              <div className="text-center text-lg mt-28 font-semibold">No Messages</div>
            )}
          </div>
        </div>
          
        {/* Input panel */}
        {selectedName && (
          <div className="fixed bottom-0 w-full sm:w-[80%] lg:w-[70%] h-[12%] bg-white border-t-[1.5px] shadow-md flex items-center px-6">
            <input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="h-12 border border-gray-300 focus:border-0 outline-gray-300 rounded-lg px-6 w-[80%] bg-gray-100 text-black"
              type="text"
              placeholder="Type a message..."
            />
            {typedText.length > 0 ? (
              <button
                onClick={sendMessage}
                type="submit"
                className="ml-4 w-12 h-12 flex items-center justify-center border rounded-full bg-blue-500 hover:bg-blue-400"
              >
                <SendRoundedIcon className="text-white" />
              </button>
            ) : (
              <button
                disabled
                type="submit"
                className="ml-4 w-12 h-12 flex items-center justify-center border rounded-full bg-blue-500"
              >
                <SendRoundedIcon className="text-white" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
