import React, { useEffect, useRef, useState } from "react";
import { initSocket } from "../socket";
import { Navigate, useLocation, useNavigate , useParams} from "react-router-dom";
import logo from "../assets/logo.png";
import Client from "../Components/Client";
import toast from "react-hot-toast";
import Editor from "../Components/Editor";
import Output from "../Components/Output";
import ACTIONS from "../Actions";
import axios from 'axios';
import Stats from "../Components/Stats";
function EditorPage() {
   // Create a reference to hold the socket instance.
  const socketRef = useRef();
  // code ref
  const codeRef = useRef(null);
    // Get the current location using the useLocation hook.
  const location = useLocation();
  const {roomId} = useParams();
  const [clients, setClients] = useState([]);
  const [input, setInput] = useState(" ");
  const [cpu, setCpu] = useState("");
  const [output, setOutPut] = useState(" ");
  const[lang, setLang]= useState("cpp")
  const [memo, setMemo]= useState("");
  const API_KEY=import.meta.env.VITE_REACT_APP_API_KEY;

  const reactNavigator = useNavigate();

  useEffect(() => {
    const init = async () => {
        // Wait for the socket initialization and store the instance in the ref.
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("socket connection failed , try again later");
        reactNavigator("/");
      }

      console.log(import.meta.env.VITE_REACT_APP_BACKEND_URL);
      // Emit a 'JOIN' action to the server using the current socket instance and pass roomId and username which we will store in our map 
      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,

      });

      socketRef.current.on(ACTIONS.JOINED,({clients,username,socketId})=>{
           if(username !== location.state?.username){
            toast.success(`${username} joined the room `);
            console.log(`${username} joined the room `);
           }
           setClients(clients);
           socketRef.current.emit(ACTIONS.SYNC_CODE, {
           code: codeRef.current,
           socketId
          });


      });

      //listening for disconnected 
      socketRef.current.on(ACTIONS.DISCONNECTED,({socketId,username})=>{
           toast.success(`${username} left the room`);
             // Update the client list state by filtering out the disconnected client.
           setClients((prev)=>{
             return  prev.filter(client => client.socketId != socketId)
           })
      })

    };
    init();
    //  a cleanup function to be executed when the component is unmounted or the effect is re-run.
    return ()=>{
       // Disconnect the current socket instance from the server.
      socketRef.current.disconnect();

       // Remove event listeners for the 'JOINED' and 'DISCONNECTED' actions from the current socket instance.
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      
    }
  }, []);
  
  
  //function to copy room Id
  async function copyRoomId(){
    try{
            await navigator.clipboard.writeText(roomId);
            toast.success(`Room ID is copied`)
    }catch(err){
           toast.error('Could not copy room ID');
           console.log(err);
    }
  }

  // we wil navigate to home page this will trriger return of useEffect in editor page which will do socket.off() method this will remove socket  from connection
  function leaveRoom(){
    reactNavigator('/');
  }

  async function runcode(){
    try {
        const response = await axios.request(options);

        setOutPut(response.data.output);
        setCpu(response.data.cpuTime)
        setMemo(response.data.memory)
        console.log(input);
        console.log(response);
        console.log(response.data.cpuTime);
    } catch (error) {
        toast.error(`${error}`);
        console.error(error);
    }
}
  
const options = {
  method: 'POST',
  url: 'https://online-code-compiler.p.rapidapi.com/v1/',
  headers: {
    'content-type': 'application/json',
    'X-RapidAPI-Key': "de7409c4d2mshbb7c4c2e44bb6bap1a7b0ajsned3c5fd7c9e4" ,
    'X-RapidAPI-Host': 'online-code-compiler.p.rapidapi.com'
  },
  data: {
    language: lang,
    version: 'latest',
    code: input,
    input: null
  }
};

  
  if(!location.state){
   return  <Navigate  to='/' />
  }
 

  return (
    <div id="mainWrap" className=" flex    h-[100%]   no-scrollbar ">
      <div
        id="aside"
        className="bg-[#1c1e29] text-[#fff] flex  flex-col w-[18%] h-screen "
      >
        <div id="asideInner" className=" h-screen pl-3 gap-1 ">
          <div
            id="logo"
            className="flex 
            p-4 items-center justify-center "
          >
            <img
              src={logo}
              className="  w-[50vw] h-16 border-[#424242] "
            ></img>
           
          </div>
          <h3 className="text-white font-bold mb-5  ">Connected</h3>
          <div
            id="clientsList"
            className="flex flex-wrap max-h-[30rem] gap-[20px] overflow-x-auto no-scrollbar  "
          >
            {clients.map((client) => (
              <Client key={client.socketId} userName={client.username} />
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center  items-center  gap-2 bg-[#1c1e29] p-[18px]">
          <button className=" w-[80%]  bg-[#00ff00] p-[5px] text-black font-bold rounded-[5px]   " onClick={runcode}  >
            RUN
          </button>
          <button className=" w-[80%]  bg-white p-[5px] text-black font-bold rounded-[5px]   " onClick={copyRoomId}  >
            Copy room ID
          </button>
          <button className=" w-[80%] bg-slate-800 border-slate-400 border p-[5px] text-white font-bold rounded-[5px]  " onClick={leaveRoom} >
            Leave
          </button>
        </div>
      </div>
      <div id="editorwrap" className=" w-[50%] h-screen overflow-hidden   ">
        <Editor 
         socketRef={socketRef}
          roomId={roomId} 
        onCodeChange={(code) => {
          codeRef.current = code;
          
          setInput(code); //  code to  run  
         
          
      }}
      onLangChange={(lang)=>{
        setLang(lang);
        console.log(lang);
      }} />
      </div>
      <div className=" w-[32%] "  >
        <Output output={output}  />
        <Stats cpu={cpu} memo={memo}  />
      </div>
    </div>
  );
}

export default EditorPage;