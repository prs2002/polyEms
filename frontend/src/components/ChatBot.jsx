import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; 
import './ChatBot.css';
import { FaMoon, FaSun } from 'react-icons/fa';
import remarkMath from 'remark-math';
import remarkCodeTitles from 'remark-code-titles';
import remarkGfm from "remark-gfm";
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css'; 
import "highlight.js/styles/atom-one-dark.css";

const Chatbot = () => {
  const [userInput, setUserInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('Llama-3.1-8b-instant');
  const [messages, setMessages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [history, setHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  });
  
  const models = [
    'Llama-3.3-70b-versatile',
    'Llama-3.1-8b-instant',
    'Mixtral-8x7b-32768',
    'Llama3-70b-8192',
    'Llama3-8b-8192',
    'Qwen2.5-Coder-32B-Instruct',
    'gpt-4o-mini',
    'gpt-4o',
    'gemma2-9b-it',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
  ];

  const HistoryRemover = () => {
    localStorage.removeItem('chatHistory');
    setHistory([]);
    setMessages([]);
  }

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages = [...messages, { type: 'user', text: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    const recentHistory = history.slice(-1).flatMap((entry) => [
      { role: 'user', content: entry.query },
      { role: 'assistant', content: entry.response },
    ]);

    const createRequestMessages = () => [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: userInput },
    ];

    const updateHistory = (userInput, botResponse) => {
      setHistory((prevHistory) => {
        const updatedHistory = [...prevHistory, { query: userInput, response: botResponse }];
        const trimmedHistory = updatedHistory.length > 10 ? updatedHistory.slice(1) : updatedHistory;

        try {
          localStorage.setItem('chatHistory', JSON.stringify(trimmedHistory));
        } catch (error) {
          console.error('Failed to save history to localStorage:', error);
        }

        return trimmedHistory;
      });
    };

    const fetchResponse = async (url) => {
      const requestMessages = createRequestMessages();
      const res = await axios.post(url, {
        messages: requestMessages,
        model: selectedModel,
      });
      return res.data.response;
    };

    try {
      const botResponse = await fetchResponse('http://localhost:3000/api/chat');
      setMessages([...newMessages, { type: 'bot', text: botResponse }]);
      updateHistory(userInput, botResponse);
    } catch (error) {
      console.log("Error fetching Primary Model, trying Backup Route");
      try {
        const botResponse = await fetchResponse('http://localhost:3000/api/chat/v2');
        setMessages([...newMessages, { type: 'bot', text: botResponse }]);
        updateHistory(userInput, botResponse);
      } catch (error) {
        console.error('Error fetching response:', error);
        setMessages([
          ...newMessages,
          { type: 'bot', text: 'An error occurred, Both Primary & Backup Models failed, Please try again later...' },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryClick = (entry) => {
    setMessages([
      { type: 'user', text: entry.query },
      { type: 'bot', text: entry.response },
    ]);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCopyCode = async (text) => {
    try {
      const codeMatches = text.match(/```([\s\S]*?)```/g);
      if (codeMatches) {
        const allCodes = codeMatches
          .map(codeBlock => codeBlock.replace(/```/g, ''))
          .join('\n\n');
        await navigator.clipboard.writeText(allCodes);
        alert('Code copied to clipboard!');
      } else {
        await navigator.clipboard.writeText(text);
        alert('Text copied to clipboard!');
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };  

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);

    // Dynamically toggle the CSS variables based on the mode
    const root = document.documentElement;
    if (!isDarkMode) {
      root.style.setProperty('--bg-color-light', '#2b2b2b');
      root.style.setProperty('--bg-color-light-alt', '#333333');
      root.style.setProperty('--bg-color-darker', '#444444');
      root.style.setProperty('--bg-color-medium', '#555555');
      root.style.setProperty('--bg-color-dark', '#1f1f1f');
      root.style.setProperty('--text-color-dark', '#e1e1e1');
      root.style.setProperty('--button-bg-color', '#6a8b84');
      root.style.setProperty('--button-bg-hover', '#5a7c73');
      root.style.setProperty('--button-toggle', '#5e7367');
      root.style.setProperty('--button-toggle-hover', '#4d6257');
    } else {
      root.style.setProperty('--bg-color-light', '#e1f4f4');
      root.style.setProperty('--bg-color-light-alt', '#EAF4F4');
      root.style.setProperty('--bg-color-darker', '#CCE3DE');
      root.style.setProperty('--bg-color-medium', '#b3cbbe');
      root.style.setProperty('--bg-color-dark', '#2d2d2d');
      root.style.setProperty('--text-color-dark', '#333');
      root.style.setProperty('--button-bg-color', '#7dc8a0');
      root.style.setProperty('--button-bg-hover', '#67b089');
      root.style.setProperty('--button-toggle', '#6B9080');
      root.style.setProperty('--button-toggle-hover', '#4f514f');
    }
  };

  return (
    <div className="chat-container">
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button
          className="sidebar-toggle-btn"
          onClick={handleSidebarToggle}
          aria-label="Toggle Sidebar">
          ☰
        </button>
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {isDarkMode ? <FaSun /> : <FaMoon />}
        </button>

        <h2></h2>

        <div className="section">
          <h3>Choose a Model:</h3>
          <select
            value={selectedModel}
            onChange={(e) => {
              const model = e.target.value;
              setSelectedModel(model);
              if (model === 'gemini-1.5-pro') {
                alert("This model is rate limited and can be used only for light tasks.");
              }
            }}>
            {models.map((model, index) => (
              <option key={index} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="section">
          <div className='history'>
            <h3>History:</h3>
            {history.length > 0 ? (<button onClick={() => HistoryRemover()}>X</button>) : null}
          </div>
          {history.length > 0 ? (
            history.map((entry, idx) => (
              <button
                key={idx}
                onClick={() => handleHistoryClick(entry)}
                className="history-button">
                Query {idx + 1}: {entry.query}
              </button>
            ))
          ) : (
            <p>No Previous queries</p>
          )}
        </div>
      </div>

      <div className="chat-main">
        <div className="header">
          <h1 className="sub-header">PolyEms: LLM Hub</h1>
        </div>
        <h2 className='heading'></h2>

        <div className="chat-box">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`message ${message.type === 'user' ? 'user' : 'bot'}`}>
              <div className="message-text">
                {message.type === 'bot' ? (
                  <div>
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm, remarkCodeTitles]} 
                      rehypePlugins={[rehypeKatex, rehypeHighlight]} 
                    >
                      {message.text}
                    </ReactMarkdown>
                    <button className = "copy-btn" onClick={() => handleCopyCode(message.text)}>Copy Response</button>
                  </div>
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && <p className="loader">Generating Content ...</p>}
        </div>

        <div className="input-container">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message here..."
            className="chat-input"
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
          />
          <div className='input-btnt'>
            <button className="send-button" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;