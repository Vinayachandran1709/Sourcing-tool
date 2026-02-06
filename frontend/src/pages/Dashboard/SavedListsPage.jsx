import React, { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ProfileDetailModal from '../../components/ProfileDetailModal';
import { Folder, Plus, Trash2, Edit2, Users, Mail, Download, Search, MoreVertical, Loader } from 'lucide-react';
import { getSavedLists, createSavedList, deleteSavedList, getListProfiles, removeProfileFromList } from '../../services/api';

const SavedListsPage = () => {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(true);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSavedLists();
      const listsData = (data.lists || []).map(l => ({ ...l, profiles: [] }));
      setLists(listsData);
      if (listsData.length > 0 && !selectedList) {
        setSelectedList(listsData[0]);
      }
    } catch (err) {
      console.error('Failed to load lists:', err);
      setError('Failed to load lists. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadListProfiles = useCallback(async (listId) => {
    setProfilesLoading(true);
    try {
      const data = await getListProfiles(listId);
      const profiles = data.profiles || [];
      setSelectedList(prev => prev ? { ...prev, profiles } : prev);
      setLists(prev => prev.map(l => l.id === listId ? { ...l, profiles } : l));
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selectedList?.id) {
      loadListProfiles(selectedList.id);
    }
  }, [selectedList?.id, loadListProfiles]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      const data = await createSavedList(newListName.trim());
      const newList = {
        id: data.list_id || data.id,
        name: newListName.trim(),
        description: '',
        profiles_count: 0,
        created_at: new Date().toISOString(),
        profiles: []
      };
      setLists([newList, ...lists]);
      setSelectedList(newList);
      setNewListName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create list:', err);
      const msg = err.response?.data?.detail || 'Failed to create list.';
      alert(typeof msg === 'string' ? msg : 'Failed to create list. You may have reached your list limit.');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list?')) return;

    try {
      await deleteSavedList(listId);
      const remaining = lists.filter(l => l.id !== listId);
      setLists(remaining);
      if (selectedList?.id === listId) {
        setSelectedList(remaining[0] || null);
      }
    } catch (err) {
      console.error('Failed to delete list:', err);
      alert('Failed to delete list. Please try again.');
    }
  };

  const handleRemoveProfile = async (profileId) => {
    if (!selectedList) return;

    try {
      await removeProfileFromList(selectedList.id, profileId);
      const updatedList = {
        ...selectedList,
        profiles: selectedList.profiles.filter(p => p.id !== profileId),
        profiles_count: Math.max(0, selectedList.profiles_count - 1)
      };
      setSelectedList(updatedList);
      setLists(lists.map(l => l.id === selectedList.id ? updatedList : l));
    } catch (err) {
      console.error('Failed to remove profile:', err);
      alert('Failed to remove profile. Please try again.');
    }
  };

  const handleExportList = () => {
    if (!selectedList || !selectedList.profiles.length) return;
    
    const csv = [
      ['Name', 'GitHub Username', 'Email', 'Location', 'Score', 'Repos', 'Stars', 'Contributions'],
      ...selectedList.profiles.map(p => [
        p.name || p.github_username,
        p.github_username,
        p.email || '',
        p.location || '',
        p.developer_score || 0,
        p.public_repos || 0,
        p.total_stars || 0,
        p.contributions_last_year || 0
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedList.name}.csv`;
    a.click();
  };

  const filteredProfiles = selectedList?.profiles.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.github_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div style={styles.page}>
      <DashboardHeader 
        title="Saved Lists" 
        subtitle="Organize and manage your developer shortlists"
      />

      <div style={styles.container}>
        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={loadLists} style={styles.retryBtn}>Retry</button>
          </div>
        )}
        <div style={styles.layout}>
          {/* Sidebar - Lists */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>My Lists</h3>
              <button onClick={() => setShowCreateModal(true)} style={styles.createBtn}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{
              ...styles.listsList,
              opacity: loading ? 0.5 : 1,
              transition: 'opacity 0.25s ease',
            }}>
              {lists.map(list => (
                <div
                  key={list.id}
                  onClick={() => { if (selectedList?.id !== list.id) setSelectedList(list); }}
                  style={{
                    ...styles.listItem,
                    ...(selectedList?.id === list.id ? styles.listItemActive : {})
                  }}
                >
                  <div style={styles.listItemIcon}>
                    <Folder size={20} color={selectedList?.id === list.id ? '#FF6B35' : '#6b7280'} />
                  </div>
                  <div style={styles.listItemContent}>
                    <div style={styles.listItemName}>{list.name}</div>
                    <div style={styles.listItemCount}>{list.profiles_count} profiles</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    style={styles.deleteListBtn}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {!loading && lists.length === 0 && (
                <div style={styles.emptyLists}>
                  <Folder size={48} color="#d1d5db" />
                  <p style={styles.emptyText}>No lists yet</p>
                  <button onClick={() => setShowCreateModal(true)} style={styles.emptyCreateBtn}>
                    Create Your First List
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Profiles */}
          <div style={styles.main}>
            {selectedList ? (
              <>
                <div style={styles.mainHeader}>
                  <div>
                    <h2 style={styles.mainTitle}>{selectedList.name}</h2>
                    {selectedList.description && (
                      <p style={styles.mainSubtitle}>{selectedList.description}</p>
                    )}
                  </div>
                  <div style={styles.mainActions}>
                    <button onClick={handleExportList} style={styles.exportBtn}>
                      <Download size={18} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                {selectedList.profiles.length > 0 && (
                  <div style={styles.searchBar}>
                    <Search size={20} color="#9ca3af" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search profiles..."
                      style={styles.searchInput}
                    />
                  </div>
                )}

                {/* Profiles Loading */}
                {profilesLoading && (
                  <div style={styles.profilesLoading}>
                    <Loader size={24} color="#FF6B35" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: '#6b7280', fontSize: '0.9375rem' }}>Loading profiles...</span>
                  </div>
                )}

                {/* Profiles Grid */}
                {!profilesLoading && filteredProfiles.length > 0 ? (
                  <div style={styles.profilesGrid}>
                    {filteredProfiles.map(profile => (
                      <div key={profile.id} style={styles.profileCard}>
                        <div style={styles.profileHeader}>
                          <img
                            src={profile.avatar_url || 'https://via.placeholder.com/60'}
                            alt={profile.name || profile.github_username}
                            style={styles.profileAvatar}
                          />
                          <div style={styles.profileInfo}>
                            <h4 style={styles.profileName}>{profile.name || profile.github_username}</h4>
                            <p style={styles.profileUsername}>@{profile.github_username}</p>
                          </div>
                          <div style={styles.profileScore}>
                            <div style={styles.scoreValue}>{profile.developer_score || 0}</div>
                            <div style={styles.scoreLabel}>Score</div>
                          </div>
                        </div>

                        {profile.bio && (
                          <p style={styles.profileBio}>{profile.bio}</p>
                        )}

                        <div style={styles.profileStats}>
                          <div style={styles.stat}>
                            <span style={styles.statValue}>{profile.public_repos || 0}</span>
                            <span style={styles.statLabel}>Repos</span>
                          </div>
                          <div style={styles.stat}>
                            <span style={styles.statValue}>{(profile.total_stars || 0).toLocaleString()}</span>
                            <span style={styles.statLabel}>Stars</span>
                          </div>
                          <div style={styles.stat}>
                            <span style={styles.statValue}>{(profile.contributions_last_year || 0).toLocaleString()}</span>
                            <span style={styles.statLabel}>Contributions</span>
                          </div>
                        </div>

                        <div style={styles.profileActions}>
                          <button
                            onClick={() => {
                              setSelectedProfile(profile);
                              setShowProfileModal(true);
                            }}
                            style={styles.viewBtn}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleRemoveProfile(profile.id)}
                            style={styles.removeBtn}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !profilesLoading ? (
                  <div style={styles.emptyProfiles}>
                    <Users size={64} color="#d1d5db" />
                    <h3 style={styles.emptyTitle}>
                      {searchQuery ? 'No matching profiles' : 'No profiles in this list'}
                    </h3>
                    <p style={styles.emptyText}>
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Go to Search page to add developers to this list'
                      }
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div style={styles.emptyProfiles}>
                <Folder size={64} color="#d1d5db" />
                <h3 style={styles.emptyTitle}>Select a list</h3>
                <p style={styles.emptyText}>Choose a list from the sidebar to view profiles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create List Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create New List</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Senior React Developers"
              style={styles.modalInput}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setShowCreateModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleCreateList} style={styles.submitBtn} disabled={!newListName.trim()}>
                Create List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        profile={selectedProfile}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedProfile(null);
        }}
      />
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

  listsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
  },

  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '0.5rem',
  },

  listItemActive: {
    background: '#fff5f2',
  },

  listItemIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  listItemContent: {
    flex: 1,
  },

  listItemName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },

  listItemCount: {
    fontSize: '0.8125rem',
    color: '#6b7280',
  },

  deleteListBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '0.5rem',
    opacity: 0,
    transition: 'opacity 0.2s',
  },

  emptyLists: {
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

  mainSubtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0,
  },

  mainActions: {
    display: 'flex',
    gap: '0.75rem',
  },

  exportBtn: {
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

  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1.25rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    marginBottom: '2rem',
  },

  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    fontSize: '0.9375rem',
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    color: '#1a1a1a',
  },

  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },

  profileCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'all 0.2s',
  },

  profileHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
  },

  profileAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    objectFit: 'cover',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: '1.0625rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 0.25rem 0',
  },

  profileUsername: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },

  profileScore: {
    textAlign: 'center',
  },

  scoreValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#FF6B35',
    lineHeight: 1,
  },

  scoreLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },

  profileBio: {
    fontSize: '0.875rem',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '1rem',
  },

  profileStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
    padding: '1rem',
    background: '#fff',
    borderRadius: '8px',
  },

  stat: {
    textAlign: 'center',
  },

  statValue: {
    display: 'block',
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  statLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },

  profileActions: {
    display: 'flex',
    gap: '0.75rem',
  },

  viewBtn: {
    flex: 1,
    padding: '0.75rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  removeBtn: {
    padding: '0.75rem',
    background: '#fff',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  emptyProfiles: {
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

  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#dc2626',
    fontSize: '0.9375rem',
    fontWeight: '500',
  },

  retryBtn: {
    padding: '0.5rem 1rem',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  profilesLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '3rem 2rem',
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
  },

  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    width: '90%',
    maxWidth: '450px',
  },

  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },

  modalInput: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    marginBottom: '1.5rem',
    boxSizing: 'border-box',
  },

  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
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
};

// Hover effects (guarded to prevent duplicate injection)
if (!document.getElementById('saved-lists-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'saved-lists-styles';
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    div[style*="listItem"]:hover {
      background: #f9fafb !important;
    }

    div[style*="listItem"]:hover button {
      opacity: 1 !important;
    }

    button[style*="createBtn"]:hover {
      background: #ff5722 !important;
      transform: scale(1.05);
    }

    button[style*="exportBtn"]:hover {
      border-color: #FF6B35 !important;
      color: #FF6B35 !important;
    }

    div[style*="profileCard"]:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    button[style*="viewBtn"]:hover {
      background: #ff5722 !important;
    }

    button[style*="removeBtn"]:hover {
      background: #fee2e2 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SavedListsPage;