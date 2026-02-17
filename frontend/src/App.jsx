import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🤖 My Digital Twin</h1>
          <p>Ask me anything about myself!</p>
        </header>
        <ChatInterface />
      </div>
    </div>
  );
}

export default App;
