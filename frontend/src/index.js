import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

if (process.env.REACT_APP_POSTHOG_KEY) {
  posthog.init(
    process.env.REACT_APP_POSTHOG_KEY,
    {
      api_host: process.env.REACT_APP_POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // We handle pageviews manually for better tracking
      capture_pageleave: true, // Track when users leave pages
      autocapture: true, // Auto-capture clicks, inputs, form submissions
      session_recording: {
        recordCrossOriginIframes: false,
      },
      persistence: 'localStorage+cookie',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug();
        }
      },
    }
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
