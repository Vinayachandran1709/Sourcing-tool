import posthog from 'posthog-js';

// ============================================
// User Identification
// ============================================

export const identifyUser = (user) => {
  if (!user?.id) return;
  posthog.identify(String(user.id), {
    email: user.email,
    name: user.name,
    company: user.company,
    subscription_plan: user.subscription_plan,
    subscription_status: user.subscription_status,
    billing_cycle: user.billing_cycle,
    is_paid: user.subscription_plan !== 'free_trial' && user.subscription_plan !== 'free',
  });
};

export const resetUser = () => {
  posthog.reset();
};

// ============================================
// Auth Events
// ============================================

export const trackSignup = (user) => {
  posthog.capture('user_signed_up', {
    plan: user.subscription_plan,
    company: user.company,
  });
};

export const trackLogin = (user) => {
  posthog.capture('user_logged_in', {
    plan: user.subscription_plan,
    company: user.company,
  });
};

export const trackLogout = () => {
  posthog.capture('user_logged_out');
};

// ============================================
// Search Events
// ============================================

export const trackSearchPerformed = (filters, resultCount) => {
  posthog.capture('search_performed', {
    languages: filters.languages || [],
    language_count: (filters.languages || []).length,
    location: filters.location || null,
    role: filters.role || null,
    min_repos: filters.min_repos || 0,
    result_count: resultCount,
  });
};

export const trackSearchStarted = (filters) => {
  posthog.capture('search_started', {
    languages: filters.languages || [],
    location: filters.location || null,
    role: filters.role || null,
  });
};

// ============================================
// Profile Events
// ============================================

export const trackProfileViewed = (profile) => {
  posthog.capture('profile_viewed', {
    profile_id: profile.id,
    developer_score: profile.developer_score,
    has_email: Boolean(profile.email),
  });
};

export const trackProfileUnlocked = (profile) => {
  posthog.capture('profile_unlocked', {
    profile_id: profile.id,
    developer_score: profile.developer_score,
  });
};

export const trackProfileSaved = (profileId, isSaving) => {
  posthog.capture(isSaving ? 'profile_saved' : 'profile_unsaved', {
    profile_id: profileId,
  });
};

// ============================================
// Email Events
// ============================================

export const trackEmailSettingsSaved = (settings) => {
  posthog.capture('email_settings_saved', {
    has_sender_email: Boolean(settings.sender_email),
    has_template: Boolean(settings.email_template),
    reply_method: settings.reply_method,
  });
};

export const trackEmailsSent = (count, success) => {
  posthog.capture('emails_sent', {
    email_count: count,
    success,
  });
};

export const trackEmailModalOpened = (selectedCount) => {
  posthog.capture('email_modal_opened', {
    selected_profiles: selectedCount,
  });
};

// ============================================
// Conversion Events
// ============================================

export const trackUpgradeClicked = (plan, billingCycle) => {
  posthog.capture('upgrade_clicked', {
    plan_id: plan.id,
    plan_name: plan.name,
    billing_cycle: billingCycle,
    price: billingCycle === 'annual' ? plan.price_annual : plan.price_monthly,
  });
};

export const trackPaymentStarted = (plan, billingCycle) => {
  posthog.capture('payment_started', {
    plan_id: plan.id,
    plan_name: plan.name,
    billing_cycle: billingCycle,
  });
};

export const trackPaymentCompleted = (plan, billingCycle) => {
  posthog.capture('payment_completed', {
    plan_id: plan.id,
    plan_name: plan.name,
    billing_cycle: billingCycle,
    revenue: billingCycle === 'annual' ? plan.price_annual : plan.price_monthly,
  });
};

export const trackPaymentFailed = (plan, billingCycle, error) => {
  posthog.capture('payment_failed', {
    plan_id: plan.id,
    plan_name: plan.name,
    billing_cycle: billingCycle,
    error,
  });
};

export const trackSubscriptionCancelled = () => {
  posthog.capture('subscription_cancelled');
};

// ============================================
// Contact / Feedback Events
// ============================================

export const trackContactFormSubmitted = (formData) => {
  posthog.capture('contact_form_submitted', {
    has_company: Boolean(formData.company),
    message_length: formData.message?.length || 0,
  });
};

export const trackFeedbackSubmitted = (type) => {
  posthog.capture('feedback_submitted', {
    feedback_type: type, // 'bug_report', 'feedback', 'support'
  });
};

// ============================================
// Page Timing / Engagement
// ============================================

let pageEntryTime = null;

export const trackPageEntry = (pageName) => {
  pageEntryTime = Date.now();
  posthog.capture('$pageview', {
    page_name: pageName,
  });
};

export const trackPageExit = (pageName) => {
  if (pageEntryTime) {
    const timeSpentSeconds = Math.round((Date.now() - pageEntryTime) / 1000);
    posthog.capture('page_time_spent', {
      page_name: pageName,
      time_spent_seconds: timeSpentSeconds,
    });
    pageEntryTime = null;
  }
};

// ============================================
// Usage Tracking
// ============================================

export const trackUsageSnapshot = (usageStats) => {
  if (!usageStats) return;
  posthog.capture('usage_snapshot', {
    searches_used: usageStats.searches?.used || 0,
    searches_limit: usageStats.searches?.limit || 0,
    profile_unlocks_used: usageStats.profile_unlocks?.used || 0,
    profile_unlocks_limit: usageStats.profile_unlocks?.limit || 0,
    emails_used: usageStats.emails?.used || 0,
    emails_limit: usageStats.emails?.limit || 0,
    plan: usageStats.plan,
  });
};

// ============================================
// Score Filter Tracking
// ============================================

export const trackScoreFilterUsed = (ranges) => {
  posthog.capture('score_filter_used', {
    ranges: ranges.map(r => `${r.min}-${r.max}`),
    range_count: ranges.length,
  });
};
