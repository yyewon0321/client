import { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {

    // - 최신 브라우저에서는 crypto.randomUUID()를 사용하여 안전하고 표준적인 UUID(v4)를 생성한다.
    // - crypto.randomUUID()를 지원하지 않는 브라우저에서는 UUID 형식에 맞는 문자열을 직접 생성한다.
    const generateUUID = () => {
        // 브라우저가 Web Crypto API의 randomUUID()를 지원하는지 확인
        if (window.crypto && window.crypto.randomUUID) {
            // 지원하면 브라우저에서 제공하는 UUID(v4)를 생성하여 반환
            // 예) "550e8400-e29b-41d4-a716-446655440000"
            return window.crypto.randomUUID();
        } else {
            // Math.random() -> 0.12345678...4 (소수점숫자) 생성
            // | 0 -> 비트연산  비트연산에 소수점은 없으므로 상대피연산를 강제 정수화시킵니다
            const r = (Math.random() * 10000000000) | 0;
            return r.toString();
        }
    }

    const [sessionId, setSessionId] = useState('')
    const [chatList, setChatList] = useState([])
    const [messages, setMessages] = useState([
        { sender: 'AI', text: '안녕하세요 맞춤형 AI 서비스입니다. 무엇을 도와드릴까요?' }
    ])
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(
        () => {
            const fetchData = async () => {
                // 브라우저가 닫히기전까지는 한개의 세션값이 유지되도록 저장된 값을 세션아이디로 사용
                let saved = localStorage.getItem('Chat_session_id');
                if (!saved) {  // 저장된 세션아이디가 없는 경우 - 현재 페이지를 처음 열었을경우
                    const newId = `session-${generateUUID()}`;
                    localStorage.setItem('Chat_session_id', newId);
                    setSessionId(newId)
                    saved = newId
                } else {
                    setSessionId(saved)
                }

                // 이미 만들어진 세션아이디 또는 새아이디를 서버에 저장
                let result = await axios.post('/api/saveSessionId', null, { params: { sessionId: saved } })

                // 세션아이디들을 다시 조회
                result = await axios.get("/api/getChatList")
                setChatList(result.data.chatList)
            }
            fetchData()
        }, []
    )

    const handleNewChat = async () => {
        // New Session Start 버튼이 클릭될때 마다 호출
        const newId = `session-${generateUUID()}`;
        localStorage.setItem('chat_session_id', newId);
        setSessionId(newId);
        setMessages([{ sender: 'AI', text: '안녕하세요 맞춤형 AI 서비스입니다. 무엇을 도와드릴까요?' }]);

        let result = await axios.post('/api/saveSessionId', null, { params: { sessionId: newId } })
        result = await axios.get("/api/getChatList")
        setChatList(result.data.chatList)
    }

    useEffect(
        () => {
            loadChatHistory();
        }, [sessionId]
    )

    const loadChatHistory = async () => {
        setMessages([])
        try {
            const res = await axios.get(`/api/getHistory/${sessionId}`)
            console.log(res.data)
            res.data.map((historyMessage, idx) => {
                if (historyMessage.sender == 'USER') {
                    const userMessage = { sender: 'user', text: historyMessage.message }
                    setMessages((prev) => [...prev, userMessage]);
                } else {
                    const aiMessage = {
                        sender: 'ai',
                        text: historyMessage.message,
                        fileName: historyMessage.fileName,
                        fileUrl: historyMessage.fileUrl
                    }
                    setMessages((prev) => [...prev, aiMessage]);
                }
            })
        } catch (err) {
            console.error(err)
        }
    }

    const onSend = async () => {
        if (!prompt.trim()) { return alert('요청내용을 입력하세요'); }

        const userMessage = { sender: 'user', text: prompt }
        setMessages((prev) => [...prev, userMessage])
        setPrompt('')
        setLoading(true)
        try {
            const result = await axios.post('/api/chat', { message: prompt, sessionId })
            const aiMessage = {
                sender: 'ai',
                text: result.data.message,
                fileName: result.data.fileName,
                fileUrl: result.data.fileUrl
            }
            setMessages((prev) => [...prev, aiMessage]);
        } catch (err) {
            console.error(err)
            const aiMessage = { sender: 'ai', text: '요청을 처리하는 도중 오류가 발생했습니다' }
            setMessages((prev) => [...prev, aiMessage]);
        } finally {
            setLoading(false)
        }
    }

    useEffect(
        () => {
            document.getElementById('dialogBox').scrollTop = document.getElementById('dialogBox').scrollHeight
        }, [messages]
    )

    return (
        <div className="container">
            <h2>AI ChatBOT</h2>
            <div>
                <h3>Chatting List</h3>
                <div>
                    {
                        chatList.map((chat, idx) => {
                            return (
                                <div style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={
                                    () => { setSessionId(chat) }
                                }>{chat.substring(0, 16)}</div>
                            )
                        })
                    }
                </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label>세션 ID: </label>
                <input type="text" value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={{ width: '400px' }} />
                <button onClick={handleNewChat} style={{ padding: '6px 12px', cursor: 'pointer' }}>New Session Start</button>
            </div>

            <div className='chat-box' id='dialogBox'>
                {
                    messages.map((msg, idx) => {
                        return (
                            <div key={idx} className={`message ${msg.sender}`}>
                                <div className="bubble">
                                    <p>{msg.text}</p>
                                    {
                                        (
                                            msg.fileName && (
                                                <a href={`http://localhost:8070/download/${msg.fileName}`} target="_blank" className="download-btn">다운로드</a>
                                            )
                                        )
                                    }
                                </div>
                            </div>
                        )
                    })
                }
            </div>


            <div className="input-box">
                <textarea rows='3' value={prompt} onChange={(e) => { setPrompt(e.currentTarget.value) }}></textarea>
                <button onClick={() => { onSend() }} disabled={loading} >
                    {(loading) ? ('AI가 생각중입니다...') : ('요청')}
                </button>
            </div>

        </div>
    );
}

export default App;
