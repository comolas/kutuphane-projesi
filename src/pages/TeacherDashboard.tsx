import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserDashboard from './UserDashboard';

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isTeacher } = useAuth();

  useEffect(() => {
    if (!isTeacher) {
      navigate('/login');
    }
  }, [isTeacher, navigate]);

  if (!isTeacher) {
    return null;
  }

  return <UserDashboard />;
};

export default TeacherDashboard;
