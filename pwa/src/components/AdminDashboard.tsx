import React, { useEffect, useState } from 'react';

const styles = {
  container: {
    padding: '20px',
    color: 'white',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    marginBottom: '20px',
    borderBottom: '1px solid #334155',
  },
  tabBtn: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  activeTabBtn: {
    color: '#3b82f6',
    borderBottom: '2px solid #3b82f6',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  username: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  email: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
  },
  btnApprove: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnReject: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnEdit: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  badgePending: {
    backgroundColor: '#eab308',
    color: 'black',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  modal: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '8px',
    width: '400px',
    maxWidth: '90%',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  }
};

interface UserGroup {
  id: number;
  name: string;
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
  groups: UserGroup[];
}

interface Learner {
  id: string;
  user: UserInfo;
  is_teacher_approved: boolean;
  teacher_proposal_status: string;
  created_at: string;
}

interface Props {
  authToken: string;
}

export default function AdminDashboard({ authToken }: Props) {
  const [activeTab, setActiveTab] = useState<'proposals' | 'users'>('proposals');
  const [learners, setLearers] = useState<Learner[]>([]);
  const [allGroups, setAllGroups] = useState<UserGroup[]>([]);
  
  // Edit Modal State
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [isTeacherChecked, setIsTeacherChecked] = useState(false);

  const fetchLearners = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/learners/', {
        headers: { 'Authorization': `Token ${authToken}` }
      });
      const data = await res.json();
      setLearers(data);
    } catch (err) {
      console.error("Failed to fetch learners", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/learners/all_groups/', {
        headers: { 'Authorization': `Token ${authToken}` }
      });
      const data = await res.json();
      setAllGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  useEffect(() => {
    fetchLearners();
    fetchGroups();
  }, [authToken]);

  const handleAction = async (learnerId: string, action: 'accept' | 'decline') => {
    try {
      await fetch(`http://localhost:8000/api/admin/learners/${learnerId}/approve_teacher/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      fetchLearners();
    } catch (err) {
      console.error("Failed to perform action", err);
    }
  };

  const handleEditClick = (learner: Learner) => {
    setEditingLearner(learner);
    setSelectedGroupIds(learner.user.groups.map(g => g.id));
    setIsTeacherChecked(learner.is_teacher_approved);
  };

  const handleSaveEdit = async () => {
    if (!editingLearner) return;

    try {
      // Save Groups
      await fetch(`http://localhost:8000/api/admin/learners/${editingLearner.id}/groups/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ groups: selectedGroupIds })
      });

      // Save Teacher Status
      if (isTeacherChecked && editingLearner.teacher_proposal_status !== 'APPROVED') {
         await handleAction(editingLearner.id, 'accept');
      } else if (!isTeacherChecked && editingLearner.teacher_proposal_status === 'APPROVED') {
         await handleAction(editingLearner.id, 'decline');
      }

      setEditingLearner(null);
      fetchLearners();
    } catch (err) {
      console.error("Failed to save edits", err);
    }
  };

  const proposals = learners.filter(l => l.teacher_proposal_status === 'PENDING');

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Admin Dashboard</h2>
      
      <div style={styles.tabs}>
        <button 
          style={{...styles.tabBtn, ...(activeTab === 'proposals' ? styles.activeTabBtn : {})}}
          onClick={() => setActiveTab('proposals')}
        >
          Teacher Proposals ({proposals.length})
        </button>
        <button 
          style={{...styles.tabBtn, ...(activeTab === 'users' ? styles.activeTabBtn : {})}}
          onClick={() => setActiveTab('users')}
        >
          Manage Users
        </button>
      </div>

      {activeTab === 'proposals' && (
        <div>
          {proposals.length === 0 && <p style={{color: '#94a3b8'}}>No pending proposals.</p>}
          {proposals.map(learner => (
            <div key={learner.id} style={styles.card}>
              <div style={styles.info}>
                <span style={styles.username}>{learner.user.username}</span>
                <span style={styles.email}>Requested to be a teacher</span>
              </div>
              <div style={styles.actions}>
                <button style={styles.btnApprove} onClick={() => handleAction(learner.id, 'accept')}>Accept</button>
                <button style={styles.btnReject} onClick={() => handleAction(learner.id, 'decline')}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          {learners.map(learner => (
            <div key={learner.id} style={styles.card}>
              <div style={styles.info}>
                <span style={styles.username}>
                  {learner.user.username} 
                  {learner.teacher_proposal_status === 'PENDING' && <span style={{...styles.badgePending, marginLeft: 8}}>PENDING</span>}
                  {learner.is_teacher_approved && <span style={{...styles.badgePending, backgroundColor: '#3b82f6', color: 'white', marginLeft: 8}}>TEACHER</span>}
                </span>
                <span style={styles.email}>Groups: {learner.user.groups.map(g => g.name).join(', ') || 'None'}</span>
              </div>
              <div style={styles.actions}>
                <button style={styles.btnEdit} onClick={() => handleEditClick(learner)}>Edit User</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingLearner && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={{marginBottom: '20px'}}>Edit {editingLearner.user.username}</h3>
            
            <div style={{marginBottom: '20px'}}>
              <h4 style={{marginBottom: '10px', color: '#94a3b8'}}>Teacher Status</h4>
              <label style={styles.checkboxRow}>
                <input 
                  type="checkbox" 
                  checked={isTeacherChecked} 
                  onChange={(e) => setIsTeacherChecked(e.target.checked)} 
                />
                Approved Teacher
              </label>
            </div>

            <div style={{marginBottom: '20px'}}>
              <h4 style={{marginBottom: '10px', color: '#94a3b8'}}>User Groups</h4>
              {allGroups.length === 0 && <p style={{fontSize: '14px'}}>No groups available in backend.</p>}
              {allGroups.map(group => (
                <label key={group.id} style={styles.checkboxRow}>
                  <input 
                    type="checkbox" 
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroupIds([...selectedGroupIds, group.id]);
                      } else {
                        setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                      }
                    }}
                  />
                  {group.name}
                </label>
              ))}
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button 
                style={{...styles.btnReject, backgroundColor: 'transparent', border: '1px solid #94a3b8', color: '#94a3b8'}} 
                onClick={() => setEditingLearner(null)}
              >
                Cancel
              </button>
              <button style={styles.btnApprove} onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
