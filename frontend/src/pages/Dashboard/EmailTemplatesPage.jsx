import React, { useState, useEffect } from 'react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { Mail, Plus, Edit2, Trash2, Copy, Send, Eye, X, CheckCircle } from 'lucide-react';

const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'initial'
  });

  const variableGuide = [
    { var: '{{name}}', desc: 'Developer\'s name' },
    { var: '{{github_username}}', desc: 'GitHub username' },
    { var: '{{company}}', desc: 'Your company name' },
    { var: '{{role}}', desc: 'Role you\'re hiring for' },
    { var: '{{location}}', desc: 'Developer\'s location' },
    { var: '{{top_language}}', desc: 'Most used language' },
    { var: '{{top_repo}}', desc: 'Top repository name' },
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const mockTemplates = [
        {
          id: 1,
          name: 'Initial Outreach - Senior Role',
          subject: 'Exciting {{role}} Opportunity at {{company}}',
          body: 'Hi {{name}},\n\nI came across your GitHub profile and was really impressed by your work, especially {{top_repo}}.\n\nWe have an exciting {{role}} position at {{company}} that I think would be a great fit for someone with your {{top_language}} expertise.\n\nWould you be open to a quick 15-minute call to discuss this opportunity?\n\nBest regards,\n[Your Name]',
          type: 'initial',
          created_at: '2024-12-15',
          usage_count: 23
        },
        {
          id: 2,
          name: 'Follow-up - No Response',
          subject: 'Following up on {{role}} opportunity',
          body: 'Hi {{name}},\n\nI wanted to follow up on my previous email about the {{role}} position at {{company}}.\n\nI understand you might be busy, but I genuinely think this could be an exciting opportunity for you.\n\nIf you\'re interested, I\'d love to schedule a brief call at your convenience.\n\nBest,\n[Your Name]',
          type: 'followup',
          created_at: '2024-12-10',
          usage_count: 12
        },
        {
          id: 3,
          name: 'Contract/Freelance Opportunity',
          subject: 'Freelance {{role}} Project at {{company}}',
          body: 'Hi {{name}},\n\nI noticed your strong background in {{top_language}} and thought you might be interested in a freelance opportunity.\n\nWe\'re looking for a {{role}} for a 3-6 month contract at {{company}}.\n\nAre you currently available for contract work?\n\nLooking forward to hearing from you!\n\n[Your Name]',
          type: 'initial',
          created_at: '2024-12-05',
          usage_count: 8
        }
      ];
      
      setTemplates(mockTemplates);
      if (mockTemplates.length > 0) {
        setSelectedTemplate(mockTemplates[0]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // TODO: Replace with actual API call
      const newTemplate = {
        id: Date.now(),
        name: formData.name,
        subject: formData.subject,
        body: formData.body,
        type: formData.type,
        created_at: new Date().toISOString(),
        usage_count: 0
      };

      setTemplates([newTemplate, ...templates]);
      setSelectedTemplate(newTemplate);
      setFormData({ name: '', subject: '', body: '', type: 'initial' });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      // TODO: Replace with actual API call
      setTemplates(templates.filter(t => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(templates[0] || null);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleDuplicateTemplate = async (template) => {
    const duplicated = {
      ...template,
      id: Date.now(),
      name: template.name + ' (Copy)',
      created_at: new Date().toISOString(),
      usage_count: 0
    };

    setTemplates([duplicated, ...templates]);
    setSelectedTemplate(duplicated);
  };

  const insertVariable = (variable) => {
    setFormData({
      ...formData,
      body: formData.body + variable
    });
  };

  const getPreviewText = (text, variables) => {
    let preview = text;
    Object.entries(variables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return preview;
  };

  const previewVariables = {
    name: 'John Doe',
    github_username: 'johndoe',
    company: 'TechCorp',
    role: 'Senior Python Developer',
    location: 'San Francisco, CA',
    top_language: 'Python',
    top_repo: 'awesome-ml-project'
  };

  return (
    <div style={styles.page}>
      <DashboardHeader 
        title="Email Templates" 
        subtitle="Create and manage reusable email templates for outreach"
      />

      <div style={styles.container}>
        <div style={styles.layout}>
          {/* Sidebar - Templates List */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>My Templates</h3>
              <button onClick={() => setShowCreateModal(true)} style={styles.createBtn}>
                <Plus size={18} />
              </button>
            </div>

            {loading ? (
              <div style={styles.loading}>Loading templates...</div>
            ) : (
              <div style={styles.templatesList}>
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    style={{
                      ...styles.templateItem,
                      ...(selectedTemplate?.id === template.id ? styles.templateItemActive : {})
                    }}
                  >
                    <div style={styles.templateItemIcon}>
                      <Mail size={20} color={selectedTemplate?.id === template.id ? '#FF6B35' : '#6b7280'} />
                    </div>
                    <div style={styles.templateItemContent}>
                      <div style={styles.templateItemName}>{template.name}</div>
                      <div style={styles.templateItemType}>
                        {template.type === 'initial' ? 'Initial' : 'Follow-up'} • Used {template.usage_count} times
                      </div>
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div style={styles.emptyTemplates}>
                    <Mail size={48} color="#d1d5db" />
                    <p style={styles.emptyText}>No templates yet</p>
                    <button onClick={() => setShowCreateModal(true)} style={styles.emptyCreateBtn}>
                      Create Your First Template
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content - Template Details */}
          <div style={styles.main}>
            {selectedTemplate ? (
              <>
                <div style={styles.mainHeader}>
                  <div>
                    <h2 style={styles.mainTitle}>{selectedTemplate.name}</h2>
                    <div style={styles.templateMeta}>
                      <span style={styles.templateType}>
                        {selectedTemplate.type === 'initial' ? 'Initial Outreach' : 'Follow-up Email'}
                      </span>
                      <span style={styles.templateDivider}>•</span>
                      <span style={styles.templateUsage}>Used {selectedTemplate.usage_count} times</span>
                      <span style={styles.templateDivider}>•</span>
                      <span style={styles.templateDate}>
                        Created {new Date(selectedTemplate.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={styles.mainActions}>
                    <button 
                      onClick={() => {
                        setFormData({
                          name: selectedTemplate.name,
                          subject: selectedTemplate.subject,
                          body: selectedTemplate.body,
                          type: selectedTemplate.type
                        });
                        setShowPreviewModal(true);
                      }}
                      style={styles.previewBtn}
                    >
                      <Eye size={18} />
                      <span>Preview</span>
                    </button>
                    <button onClick={() => handleDuplicateTemplate(selectedTemplate)} style={styles.duplicateBtn}>
                      <Copy size={18} />
                      <span>Duplicate</span>
                    </button>
                    <button onClick={() => handleDeleteTemplate(selectedTemplate.id)} style={styles.deleteBtn}>
                      <Trash2 size={18} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div style={styles.templateContent}>
                  <div style={styles.field}>
                    <label style={styles.label}>Subject Line</label>
                    <div style={styles.subjectBox}>
                      {selectedTemplate.subject}
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Email Body</label>
                    <div style={styles.bodyBox}>
                      {selectedTemplate.body}
                    </div>
                  </div>

                  <div style={styles.variablesSection}>
                    <h4 style={styles.variablesTitle}>Available Variables</h4>
                    <div style={styles.variablesGrid}>
                      {variableGuide.map(({ var: variable, desc }) => (
                        <div key={variable} style={styles.variableCard}>
                          <code style={styles.variableCode}>{variable}</code>
                          <span style={styles.variableDesc}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.emptyMain}>
                <Mail size={64} color="#d1d5db" />
                <h3 style={styles.emptyTitle}>Select a template</h3>
                <p style={styles.emptyText}>Choose a template from the sidebar to view and edit</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Email Template</h3>
              <button onClick={() => setShowCreateModal(false)} style={styles.closeBtn}>
                <X size={24} />
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.modalLayout}>
                <div style={styles.modalForm}>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Template Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Senior Developer Outreach"
                      style={styles.formInput}
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Template Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      style={styles.formSelect}
                    >
                      <option value="initial">Initial Outreach</option>
                      <option value="followup">Follow-up Email</option>
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Subject Line</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Exciting opportunity at {{company}}"
                      style={styles.formInput}
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Email Body</label>
                    <textarea
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      placeholder="Write your email template here... Use variables like {{name}}, {{company}}, etc."
                      style={styles.formTextarea}
                      rows={12}
                    />
                  </div>
                </div>

                <div style={styles.modalSidebar}>
                  <h4 style={styles.sidebarSubtitle}>Insert Variables</h4>
                  <p style={styles.sidebarHint}>Click to insert into email body</p>
                  <div style={styles.variablesList}>
                    {variableGuide.map(({ var: variable, desc }) => (
                      <button
                        key={variable}
                        onClick={() => insertVariable(variable)}
                        style={styles.variableBtn}
                      >
                        <code style={styles.variableBtnCode}>{variable}</code>
                        <span style={styles.variableBtnDesc}>{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button onClick={() => setShowCreateModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleCreateTemplate} style={styles.submitBtn}>
                  <CheckCircle size={18} />
                  <span>Create Template</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPreviewModal(false)}>
          <div style={styles.modalMedium} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Email Preview</h3>
              <button onClick={() => setShowPreviewModal(false)} style={styles.closeBtn}>
                <X size={24} />
              </button>
            </div>

            <div style={styles.previewContent}>
              <div style={styles.previewNote}>
                Preview with sample data - actual emails will use real developer information
              </div>

              <div style={styles.previewEmail}>
                <div style={styles.previewSubject}>
                  <strong>Subject:</strong> {getPreviewText(formData.subject, previewVariables)}
                </div>
                <div style={styles.previewBody}>
                  {getPreviewText(formData.body, previewVariables)}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowPreviewModal(false)} style={styles.closePreviewBtn}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
  },

  container: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '2rem',
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '2rem',
    alignItems: 'start',
  },

  sidebar: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    position: 'sticky',
    top: '90px',
    maxHeight: 'calc(100vh - 120px)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem',
    borderBottom: '1px solid #e5e7eb',
  },

  sidebarTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },

  createBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  templatesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
  },

  templateItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '0.5rem',
  },

  templateItemActive: {
    background: '#fff5f2',
  },

  templateItemIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  templateItemContent: {
    flex: 1,
  },

  templateItemName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },

  templateItemType: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },

  emptyTemplates: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    margin: '1rem 0',
  },

  emptyCreateBtn: {
    padding: '0.75rem 1.5rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  main: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    minHeight: '600px',
  },

  mainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },

  mainTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 0.5rem 0',
  },

  templateMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },

  templateType: {
    padding: '0.25rem 0.75rem',
    background: '#eff6ff',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
  },

  templateDivider: {
    color: '#d1d5db',
  },

  templateUsage: {},
  
  templateDate: {},

  mainActions: {
    display: 'flex',
    gap: '0.75rem',
  },

  previewBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  duplicateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#fff',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  templateContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  label: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  subjectBox: {
    padding: '1rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    color: '#1a1a1a',
    fontFamily: "'Outfit', sans-serif",
  },

  bodyBox: {
    padding: '1.5rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    color: '#1a1a1a',
    lineHeight: '1.8',
    whiteSpace: 'pre-wrap',
    fontFamily: "'Outfit', sans-serif",
    minHeight: '300px',
  },

  variablesSection: {
    padding: '1.5rem',
    background: '#f0f7ff',
    border: '1px solid #dbeafe',
    borderRadius: '12px',
  },

  variablesTitle: {
    fontSize: '1.0625rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  variablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },

  variableCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },

  variableCode: {
    padding: '0.5rem 0.75rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontFamily: "'Courier New', monospace",
    color: '#4f46e5',
    fontWeight: '600',
  },

  variableDesc: {
    fontSize: '0.8125rem',
    color: '#6b7280',
  },

  emptyMain: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 2rem',
    textAlign: 'center',
  },

  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
  },

  loading: {
    padding: '3rem 2rem',
    textAlign: 'center',
    color: '#6b7280',
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',
  },

  modalLarge: {
    background: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '1000px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  modalMedium: {
    background: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #e5e7eb',
  },

  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },

  closeBtn: {
    background: '#f9fafb',
    border: 'none',
    borderRadius: '8px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s',
  },

  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem',
  },

  modalLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gap: '2rem',
  },

  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },

  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  formLabel: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  formInput: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
  },

  formSelect: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    background: '#fff',
    cursor: 'pointer',
  },

  formTextarea: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    resize: 'vertical',
  },

  modalSidebar: {
    padding: '1.5rem',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },

  sidebarSubtitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },

  sidebarHint: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    marginBottom: '1rem',
  },

  variablesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  variableBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.25rem',
    padding: '0.75rem',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    fontFamily: "'Outfit', sans-serif",
  },

  variableBtnCode: {
    fontSize: '0.875rem',
    fontFamily: "'Courier New', monospace",
    color: '#4f46e5',
    fontWeight: '600',
  },

  variableBtnDesc: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },

  modalFooter: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    padding: '1.5rem 2rem',
    borderTop: '1px solid #e5e7eb',
  },

  cancelBtn: {
    padding: '0.75rem 1.5rem',
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  previewContent: {
    padding: '2rem',
  },

  previewNote: {
    padding: '1rem',
    background: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1e40af',
    marginBottom: '1.5rem',
  },

  previewEmail: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
  },

  previewSubject: {
    fontSize: '1.0625rem',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },

  previewBody: {
    fontSize: '1rem',
    color: '#4b5563',
    lineHeight: '1.8',
    whiteSpace: 'pre-wrap',
    fontFamily: "'Outfit', sans-serif",
  },

  closePreviewBtn: {
    padding: '0.75rem 1.5rem',
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  div[style*="templateItem"]:hover {
    background: #f9fafb !important;
  }
  
  button[style*="createBtn"]:hover {
    background: #ff5722 !important;
    transform: scale(1.05);
  }
  
  button[style*="previewBtn"]:hover {
    background: #4338ca !important;
  }
  
  button[style*="duplicateBtn"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }
  
  button[style*="deleteBtn"]:hover {
    background: #fee2e2 !important;
  }
  
  button[style*="variableBtn"]:hover {
    border-color: #4f46e5 !important;
    background: #f0f7ff !important;
  }
  
  button[style*="closeBtn"]:hover {
    background: #f3f4f6 !important;
  }
  
  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #FF6B35 !important;
  }
`;
document.head.appendChild(styleSheet);

export default EmailTemplatesPage;