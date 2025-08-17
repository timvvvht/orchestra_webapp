

import React from 'react';
import { useAuth } from '../auth/AuthContext';

const UserProfile: React.FC = () => {
	const { user, isAuthenticated } = useAuth();

	if (!isAuthenticated) {
		return (
			<div style={{ padding: '1rem', color: '#b00' }}>
				Not logged in
			</div>
		);
	}

	return (
		<div className='!bg-white rounded-full text-black'>
			<div>
				<strong>Logged in as:</strong> {user.email || user.name || 'Unknown User'}
			</div>
		</div>
	);
};

export default UserProfile;
