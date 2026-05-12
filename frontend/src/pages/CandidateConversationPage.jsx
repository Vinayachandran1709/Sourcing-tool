import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startConversation, sendConversationMessage, completeConversation } from '../services/candidateApi';
import CandidateNavbar from '../components/CandidateNavbar';
import { useCandidateAuth } from '../contexts/CandidateAuthContext';

const CandidateConversationPage = () => {
  const navigate = useNavigate();
  const { candidate } = useCandidateAuth();
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [stagesCompleted, setStagesCompleted] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [currentState, setCurrentState] = useState('welcome');
  const [isInitializing, setIsInitializing] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Check onboarding status
    if (candidate && candidate.onboarding_status === 'pending') {
      navigate('/candidate/import');
      return;
    }
    
    // Initialize conversation
    const initConversation = async () => {
      try {
        setIsInitializing(true);
        const data = await startConversation();
        setMessages([
          { role: 'assistant', content: data.message }
        ]);
        setCurrentState(data.state);
        setStagesCompleted(data.stages_completed || []);
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.detail?.includes('already completed')) {
          navigate('/candidate/dashboard');
        } else {
          setError(err.response?.data?.detail || 'Failed to start conversation. Please try again.');
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initConversation();
  }, [candidate, navigate]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping || isComplete) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'candidate', content: userMessage }]);
    setIsTyping(true);
    setError('');

    try {
      const data = await sendConversationMessage(userMessage);
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      setCurrentState(data.state);
      setStagesCompleted(data.stages_completed || []);
      
      if (data.is_complete) {
        setIsComplete(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message. Please try again.');
      // Remove the user's message so they can try again
      setMessages(prev => prev.slice(0, -1));
      setInputValue(userMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsTyping(true);
      await completeConversation();
      navigate('/candidate/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to finalize profile. Please try again.');
      setIsTyping(false);
    }
  };

  // Progress bar logic
  const steps = [
    { id: 'technical', label: 'Technical Interview', active: true, done: stagesCompleted.includes('technical_verification') },
    { id: 'career', label: 'Career Preferences', active: currentState === 'career_preferences' || currentState === 'summary', done: stagesCompleted.includes('career_preferences') },
    { id: 'complete', label: 'Complete', active: isComplete, done: isComplete }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <CandidateNavbar />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '800px', margin: '0 auto', width: '100%', padding: '2rem 1rem' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}>
          {steps.map((step, index) => (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ 
                width: '30px', height: '30px', borderRadius: '50%', 
                backgroundColor: step.done ? '#10B981' : step.active ? '#FF6B35' : '#E2E8F0',
                color: step.done || step.active ? 'white' : '#64748B',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontWeight: 'bold', fontSize: '14px', marginBottom: '8px',
                transition: 'all 0.3s ease'
              }}>
                {step.done ? '✓' : index + 1}
              </div>
              <span style={{ 
                fontSize: '12px', fontWeight: '500',
                color: step.done ? '#10B981' : step.active ? '#1E293B' : '#94A3B8'
              }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#EF4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Chat Area */}
        <div style={{ 
          flex: 1, backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          
          {/* Messages Container */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isInitializing ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748B' }}>
                Initializing your personalized interview...
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: msg.role === 'assistant' ? 'flex-start' : 'flex-end' 
                  }}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '1rem 1.25rem',
                      borderRadius: '16px',
                      backgroundColor: msg.role === 'assistant' ? '#F1F5F9' : '#FF6B35',
                      color: msg.role === 'assistant' ? '#1E293B' : 'white',
                      borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                      borderBottomRightRadius: msg.role === 'candidate' ? '4px' : '16px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isTyping && !isComplete && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '1rem 1.25rem', borderRadius: '16px', borderBottomLeftRadius: '4px',
                      backgroundColor: '#F1F5F9', color: '#64748B', fontStyle: 'italic',
                      display: 'flex', gap: '4px', alignItems: 'center'
                    }}>
                      AI is thinking<span className="dot-anim">...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}

            {isComplete && (
              <div style={{ 
                marginTop: '1rem', padding: '1.5rem', backgroundColor: '#ECFDF5', 
                border: '1px solid #10B981', borderRadius: '12px', textAlign: 'center' 
              }}>
                <h3 style={{ color: '#065F46', margin: '0 0 0.5rem 0' }}>Profile Finalized!</h3>
                <p style={{ color: '#047857', margin: '0 0 1.5rem 0' }}>Your TalentBox profile has been updated with your interview results.</p>
                <button 
                  onClick={handleComplete}
                  disabled={isTyping}
                  style={{
                    backgroundColor: '#10B981', color: 'white', border: 'none',
                    padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600',
                    cursor: isTyping ? 'not-allowed' : 'pointer', fontSize: '16px',
                    opacity: isTyping ? 0.7 : 1
                  }}
                >
                  {isTyping ? 'Finalizing...' : 'View Your Updated Profile →'}
                </button>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ borderTop: '1px solid #E2E8F0', padding: '1rem', backgroundColor: '#F8FAFC' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isComplete ? "Conversation complete" : "Type your answer..."}
                disabled={isTyping || isComplete || isInitializing}
                maxLength={5000}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '16px', outline: 'none', transition: 'border-color 0.2s',
                  backgroundColor: (isTyping || isComplete) ? '#F1F5F9' : 'white',
                  fontFamily: "'Outfit', sans-serif"
                }}
                onFocus={(e) => e.target.style.borderColor = '#FF6B35'}
                onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping || isComplete || isInitializing}
                style={{
                  backgroundColor: (!inputValue.trim() || isTyping || isComplete || isInitializing) ? '#94A3B8' : '#FF6B35',
                  color: 'white', border: 'none', borderRadius: '8px',
                  padding: '0 1.5rem', fontWeight: '600', cursor: (!inputValue.trim() || isTyping || isComplete || isInitializing) ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s', fontFamily: "'Outfit', sans-serif"
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
        .dot-anim { animation: blink 1.4s infinite both; }
      `}} />
    </div>
  );
};

export default CandidateConversationPage;
