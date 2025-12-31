import { useState, useEffect } from 'react';

// In a real app, this would involve API calls, JWT decoding, etc.
const MOCK_API = {
    fetchUser: async () => {
        // Simulate an API call
        return new Promise(resolve => {
            setTimeout(() => {
                // To test, you can change 'Admin_Support' to 'Some_User'
                const loggedInUser = { username: 'Admin_Support', roles: ['ADMIN'] };
                resolve(loggedInUser);
            }, 500);
        });
    }
};

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            const userData = await MOCK_API.fetchUser();
            setUser(userData);
            setLoading(false);
        };
        getUser();
    }, []);

    const isAdmin = user?.roles?.includes('ADMIN') ?? false;

    return { user, isAdmin, loading };
};