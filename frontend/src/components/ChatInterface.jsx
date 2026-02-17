import React, { useState, useRef, useEffect } from 'react';
import Message from './Message';
import { sendMessage } from '../services/api';
import './ChatInterface.css';

function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hey! I\'m Varun\'s digital twin. Ask me anything about my background, schedule, or work.',
      sources: [],
      confidence: 1.0,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const exampleQueries = [
    { icon: '💼', text: 'What experience do I have with LLMs?' },
    { icon: '📅', text: 'What classes do I have on Tuesday?' },
    { icon: '🎓', text: 'Where do I go to school?' },
    { icon: '💻', text: 'What programming languages do I know?' }
  ];

  const handleExampleClick = (query) => {
    setInput(query);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
  
    const userMessage = input.trim();
    setInput('');
  
    const newMessages = [
      ...messages,
      { 
        role: 'user', 
        content: userMessage,
        timestamp: new Date()
      }
    ];
    setMessages(newMessages);
    setIsLoading(true);
  
    try {
      const conversationHistory = newMessages
        .slice(-6)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
  
      const response = await sendMessage(userMessage, conversationHistory);
  
      // Check if response has multiple chunks
      if (response.chunks && response.chunks.length > 1) {
        // Add chunks sequentially with slight delay
        let currentMessages = [...newMessages];
        
        for (let i = 0; i < response.chunks.length; i++) {
          // Wait 500ms between chunks (optional, for UX)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          currentMessages = [
            ...currentMessages,
            {
              role: 'assistant',
              content: response.chunks[i],
              sources: i === response.chunks.length - 1 ? response.sources : [], // Only show sources on last chunk
              confidence: i === response.chunks.length - 1 ? response.confidence : undefined,
              timestamp: new Date(),
              isChunk: true,
              chunkIndex: i,
              totalChunks: response.chunks.length
            }
          ];
          setMessages(currentMessages);
        }
      } else {
        // Single message (normal flow)
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: response.response,
            sources: response.sources || [],
            confidence: response.confidence || 0.5,
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          sources: [],
          confidence: 0,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>
          <span className="status-indicator"></span>
          Varun's Digital Twin
        </h1>
        <p className="chat-subtitle">Digital Twin - always available</p>
      </div>

      <div className="messages-container">
        {messages.length === 1 && (
          <div className="welcome-message">
            <h2>👋 Hey, I'm Varun!</h2>
            <p>Well, actually I'm Varun's digital twin. Ask me anything!</p>
            <div className="welcome-examples">
              {exampleQueries.map((example, idx) => (
                <div 
                  key={idx} 
                  className="example-query"
                  onClick={() => handleExampleClick(example.text)}
                >
                  <div className="example-icon">{example.icon}</div>
                  {example.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <Message key={idx} message={message} />
        ))}
        
        {isLoading && (
          <div className="message">
            <div className="message-header">
              <img 
                src="/varun-avatar.jpg" 
                alt="Varun" 
                className="message-avatar-img"
              />
              <span className="message-sender">Varun</span>
            </div>
            <div className="loading-message">
              <span>Thinking</span>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="message-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-button"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatInterface;