import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
function Message({ message }) {

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const getInitials = (role) => {
    return role === 'user' ? 'You' : 'VS';
  };

  const getSenderName = (role) => {
    return role === 'user' ? 'You' : 'Varun';
  };

  const renderAvatar = (role) => {
    if (role === 'assistant') {
      return (
        <img 
          src="/varun-avatar.jpg" 
          alt="Varun" 
          className="message-avatar-img"
        />
      );
    }
    return (
      <div className="message-avatar user">
        You
      </div>
    );
  };

  return (
    <div className="message">
      <div className="message-header">
        {renderAvatar(message.role)}
        <span className="message-sender">{getSenderName(message.role)}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      
      <div className="message-content">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

    </div>
  );
}

export default Message;