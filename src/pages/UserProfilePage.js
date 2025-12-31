// UserProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAlert } from '../context/AlertContext';
import { jwtDecode } from "jwt-decode"; // preserved as in your original file
import { useConfig } from "./ConfigProvider";
import './UserProfilePage.css';
import EditIcon from '@mui/icons-material/ModeEditOutlineOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { Gauge, UsersFour, Invoice , Archive, ChartLineUp, MicrosoftExcelLogo, ShoppingCart, CreditCard, Receipt} from "@phosphor-icons/react";
import toast, {Toaster} from 'react-hot-toast';
import './InvoiceTemplates.css';
import { FaCrown, FaStar } from 'react-icons/fa'; // <-- ADD THIS

// Mock data (used as initial fallback while API loads)
const mockUser = {

};

// Formats date string to "04 Nov 2025"
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// Calculates remaining days
const calculateRemainingDays = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return 0; // Expired
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Calculates total duration of the plan in days
const getTotalDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 1; // Avoid division by zero
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return totalDays <= 0 ? 1 : totalDays; // ensure it's at least 1
};

// Determines the bar color
const getBarColor = (days) => {
    if (days === null || days > 10) return 'green';
    if (days <= 5) return 'red';
    if (days <= 10) return 'yellow';
    return 'green';
};
// --- END HELPER FUNCTIONS ---

const UserProfilePage = ({ setSelectedPage }) => {

    const { showAlert } = useAlert();
    // Tabs
    // --- REQ 1: Changed default active tab to 'user' ---
    const [activeTab, setActiveTab] = useState('subscription');

    // Core data
    const [user, setUser] = useState({});
    const [formData, setFormData] = useState({});

    // --- REQ 3: Subscription is now an array ---
    const [subscription, setSubscription] = useState([]);
    const [isLoadingSub, setIsLoadingSub] = useState(true);

    // Editing state
    const [isEditing, setIsEditing] = useState(false); // user edit
    const [sectionEdit, setSectionEdit] = useState({ basic: false, finance: false, others: false }); // shop sections

    // misc
    const [errors, setErrors] = useState({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);
    const [userSource, setUserSource] = useState('email');

    // files & previews
    const [profilePicFile, setProfilePicFile] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [shopLogoFile, setShopLogoFile] = useState(null);
    const [shopLogoPreview, setShopLogoPreview] = useState(null);

    const fileInputRef = useRef(null);
    const shopLogoInputRef = useRef(null);

    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || ""; // preserved if you use it elsewhere

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // --- ADDED: Define your invoice templates ---
    const invoiceTemplates = [
        { name: 'gstinvoiceskyblue', displayName: 'Modern Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235059.png' }, // Replace with actual paths/URLs
        { name: 'gstinvoiceLightGreen', displayName: 'Elegant Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235119.png' },
        { name: 'gstinvoiceGreen', displayName: 'Simple Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235133.png' },
        { name: 'gstinvoiceBlue', displayName: 'Simple Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235150.png' },
        { name: 'gstinvoiceOrange', displayName: 'Classic Orange', imageUrl: '/invoiceTemplates/Screenshot_20251019_235203.png' },
        { name: 'gstinvoice', displayName: 'Best Purple', imageUrl: '/invoiceTemplates/Screenshot_20251019_235220.png' },
    ];

    // --- ADDED: State for Invoice Templates ---
    const [selectedTemplate, setSelectedTemplate] = useState(''); // Store the *name* of the selected template
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTemplate, setModalTemplate] = useState(null); // Store the template object for the modal



    useEffect(() => {
        // initial fallback while API loads
        setFormData(mockUser);
        setUser(mockUser);
        setProfilePicPreview(mockUser.profilePic);
        setShopLogoPreview(mockUser.shopLogo);
    }, []);

    useEffect(() => {
        const loadSelectedTemplate = async () => {
            if (!apiUrl) return;
            // Assuming you have the username available (fetched in the other useEffect)
            const currentUsername = user?.username || formData?.username; // Get username safely
            if (!currentUsername) {
                // Fetch username if not available yet (or handle error)
                try {
                    const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, { method: "GET", credentials: 'include' });
                    if (userRes.ok) {
                        const { username: fetchedUsername } = await userRes.json();
                        // Now fetch template with the username
                        fetchTemplate(fetchedUsername);
                    }
                } catch (err) {
                    console.error("Could not get username to fetch template:", err);
                }
                return; // Exit if username cannot be determined
            }
            fetchTemplate(currentUsername);
        };

        const fetchTemplate = async (username) => {
            try {
                // Replace with your actual endpoint to GET the selected template
                const response = await fetch(`${apiUrl}/api/shop/user/get/user/invoiceTemplate`, {
                    method: 'GET',
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setSelectedTemplate(data.selectedTemplateName || ''); // Assuming the API returns { selectedTemplateName: 'modern-blue' }
                } else {
                    console.warn("Failed to fetch selected template:", response.status);
                }
            } catch (error) {
                console.error("Error fetching selected template:", error);
            }
        };

        // Only run when the component mounts or apiUrl/user changes significantly
        loadSelectedTemplate();

    }, [apiUrl, user?.username, formData?.username]); // Dependencies

    // --- REQ 3: Updated fetch logic to handle an array ---
    useEffect(() => {
        if (!apiUrl) return;

        const fetchSubscriptionDetails = async () => {
            setIsLoadingSub(true);
            try {
                // This is the new endpoint you will create
                const res = await fetch(`${apiUrl}/api/shop/subscription/details`, {
                    method: "GET",
                    credentials: 'include',
                });

                // 404 is a valid response meaning "no active subscription"
                if (res.status === 404) {
                    setSubscription([]); // Set to empty array
                    return;
                }

                if (!res.ok) {
                    throw new Error(`Subscription fetch failed (${res.status})`);
                }

                const data = await res.json(); // This is now an array: [ { ... }, { ... } ]
                console.log(data);

                // Sort the data by startDate (earliest first)
                const sortedData = data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

                setSubscription(sortedData); // Set the sorted array

            } catch (err) {
                console.error("Error loading subscription details:", err);
                setSubscription([]); // Set to empty array on error
            } finally {
                setIsLoadingSub(false);
            }
        };

        fetchSubscriptionDetails();
    }, [apiUrl]);

    // --- ADDED: Handler for selecting a template ---
    const handleSelectTemplate = async (templateName, displayName) => {
        if (!apiUrl || !user?.username) {
            toast.error("Cannot save selection. User session not found.");
            return;
        }

        try {
            // Replace with your actual endpoint to PUT/POST the selected template
            const response = await fetch(`${apiUrl}/api/shop/user/save/user/invoiceTemplate`, {
                method: 'POST', // Or POST
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedTemplateName: templateName }),
            });

            if (response.ok) {
                setSelectedTemplate(templateName);
                toast.success(`Template "${displayName}" selected!`);
                setModalOpen(false); // Close modal if selection was made from modal
            } else {
                toast.error(`Failed to select template: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Error selecting template:", error);
            toast.error("Something went wrong while saving your selection.");
        }
    };

    // --- ADDED: Handlers for modal ---
    const openTemplateModal = (template) => {
        setModalTemplate(template);
        setModalOpen(true);
    };

    const closeTemplateModal = () => {
        setModalOpen(false);
        setModalTemplate(null);
    };

    useEffect(() => {
        // keep logic and API calls from your original file intact while adding shop-logo fetch
        let profilePicObjectUrl = null;
        let shopLogoObjectUrl = null;

        const loadProfile = async () => {
            if (!apiUrl) return; // don't attempt if API base isn't available

            try {
                // 1) get session (username)
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });
                if (!userRes.ok) throw new Error(`User session fetch failed (${userRes.status})`);

                const { username } = await userRes.json();

                // 2) get full user details
                const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/${username}`, {
                    method: "GET",
                    credentials: 'include',
                    headers: { Accept: "application/json" },
                });
                if (!detailsRes.ok) throw new Error(`User details fetch failed (${detailsRes.status})`);
                const details = await detailsRes.json();
                console.log("The full profile details from backend ", details);
                // set state from API
                setUser(details);
                setFormData(details);
                setUserSource(details.userSource || 'email');

                // 3) fetch profile pic (if available) — preserve original logic
                try {
                    const picRes = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                        method: "GET",
                        credentials: 'include',
                    });
                    if (picRes.ok) {
                        const blob = await picRes.blob();
                        if (blob && blob.size > 0) {
                            profilePicObjectUrl = URL.createObjectURL(blob);
                            setProfilePicPreview(profilePicObjectUrl);
                        }
                    } else if (picRes.status !== 404) {
                        console.warn(`Profile pic fetch failed (${picRes.status})`);
                    }
                } catch (picErr) {
                    console.warn('Profile pic fetch error:', picErr);
                }

                // 4) fetch shop logo (optional endpoint; harmless if 404)
                try {
                    const logoRes = await fetch(`${apiUrl}/api/shop/user/${username}/shop-logo`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    if (logoRes.ok) {
                        const blob = await logoRes.blob();
                        if (blob && blob.size > 0) {
                            shopLogoObjectUrl = URL.createObjectURL(blob);
                            setShopLogoPreview(shopLogoObjectUrl);
                        }
                    }
                } catch (logoErr) {
                    console.warn('Shop logo fetch error:', logoErr);
                }
            } catch (err) {
                console.error("Error loading profile:", err);
                // keep user-friendly message but don't remove original behavior
                toast.error("Something went wrong while loading your profile.");
            }
        };

        loadProfile();

        return () => {
            if (profilePicObjectUrl) URL.revokeObjectURL(profilePicObjectUrl);
            if (shopLogoObjectUrl) URL.revokeObjectURL(shopLogoObjectUrl);
        };
    }, [apiUrl]);

    // ------------------------ user editing (keeps your original API calls & logic) ------------------------
    const handleCancel = () => {
        setFormData(user);
        setProfilePicPreview(user.profilePic || profilePicPreview);
        setShopLogoPreview(user.shopLogo || shopLogoPreview);
        setErrors({});
        setIsEditing(false);
    };

    const validateForm = () => {
        // preserve placeholder — you can keep your validation logic here unchanged
        return true;
    };

    const handleEditToggle = async () => {
        // keep same semantics as your original file
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        if (!validateForm()) return;

        try {
            // get username from session endpoint
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('Could not get user session');
            const { username } = await userRes.json();

            // Update text details using the same endpoint you used originally
            const detailsResponse = await fetch(`${apiUrl}/api/shop/user/edit/${username}`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (!detailsResponse.ok) throw new Error("Failed to update user details");

            // Update profile picture if a new one was selected — preserve original flow
            if (profilePicFile) {
                const picForm = new FormData();
                picForm.append("profilePic", profilePicFile, profilePicFile.name);
                const picResponse = await fetch(`${apiUrl}/api/shop/user/edit/profilePic/${username}`, {
                    method: "PUT",
                    credentials: 'include',
                    body: picForm,
                });
                if (!picResponse.ok) throw new Error("Failed to update profile picture");
            }

            setUser({ ...formData, profilePic: profilePicPreview });
            setIsEditing(false);
            toast.success("Profile updated successfully!");

        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Something went wrong while updating user details.");
        }
    };

    const handleProfilePicChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setProfilePicPreview(URL.createObjectURL(file));
            setProfilePicFile(file);
        }
    };

    // ------------------------ password handler (kept as in your original file) ------------------------
    const handlePasswordSubmit = async () => {
        if (passwordStep === 1) {
            try {
                // 1. Get token from localStorage


                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });

                if (!userRes.ok) {
                    console.error('Failed to fetch user data:', userRes.statusText);
                    return;
                }

                const userData = await userRes.json();
                const username = userData.username;

                // 2. Decode token to extract username

                // 3. Call generateToken API with username + entered currentPassword

                const response = await fetch(authApiUrl+"/auth/authenticate", {
                    method: "POST",
                    credentials: 'include',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: username,
                        password: passwordData.currentPassword,
                    }),
                });

                if (!response.ok) {
                    showAlert("Invalid current password. Please try again.");
                    return;
                }

                //const data = await response.json();
                const data = await response.text();
                if (data) {
                    console.log("Password validated successfully");
                    setPasswordStep(2); // move to next step
                } else {
                    showAlert("Password validation failed.");
                }
            } catch (error) {
                console.error("Error validating password:", error);
                showAlert("Something went wrong while validating password.");
            }
        } else {
            // Step 2: Update password
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                showAlert("New passwords do not match. Please try again.");
                return;
            }
            if (passwordData.newPassword.length < 4) {
                showAlert("Password must be at least 4 characters long.");
                return;
            }

            try {

                console.log("Updating password for apiUrl:", apiUrl);

                // Call update password API
                // Note: You might need to adjust the endpoint and payload based on your backend
                const response = await fetch(apiUrl+"/api/shop/user/updatepassword", {
                    method: "POST",
                    credentials: 'include',// send old token for authentication
                    headers: {
                        "Content-Type": "application/json",

                    },
                    body: JSON.stringify({
                        password: passwordData.newPassword,
                    }),
                });

                if (!response.ok) {
                    showAlert("Failed to update password.");
                    return;
                }

                toast.success("Password updated successfully!");
                setShowPasswordModal(false);
                setPasswordStep(1);
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } catch (error) {
                console.error("Error updating password:", error);
                showAlert("Something went wrong while updating password.");
            }
        }
    };

    // ------------------------ Shop: per-section edit/save logic ------------------------
    const handleShopLogoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setShopLogoPreview(URL.createObjectURL(file));
            setShopLogoFile(file);
        }
    };

    const handleSectionEdit = (section) => {
        setSectionEdit(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleIFSCBlur = async () => {
        // Call Razorpay IFSC lookup and map NAME/ADDRESS (if present) -> bankName / bankAddress
        const ifsc = (formData.bankIfsc || '').trim();
        if (!ifsc) return;
        try {
            const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
            if (!res.ok) {
                console.warn('IFSC lookup returned non-ok');
                toast.error('IFSC code not found');
                return;
            }
            const data = await res.json();
            // some IFSC responses use BANK, some may provide NAME — prefer NAME then BANK
            const bankNameFromApi = data.NAME || data.BANK || '';
            const bankAddressFromApi = data.ADDRESS || '';
            setFormData(prev => ({ ...prev, bankName: bankNameFromApi, bankAddress: bankAddressFromApi }));
        } catch (err) {
            console.error('IFSC lookup failed:', err);
        }
    };

    const handleGstinBlur = async () => {
        const gstin = (formData.gstin || '').trim();
        if (!gstin) return;
        try {
            const res = await fetch(`https://gst-return-status.p.rapidapi.com/free/gstin/${gstin}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-rapidapi-key": "1a05818094mshaeae5bbb1e2604dp153414jsn8fad5fb302a1",
                    "x-rapidapi-host": "gst-return-status.p.rapidapi.com"
                }
            });

            if (!res.ok) {
                console.warn('GSTIN lookup returned non-ok');
                toast.error('GSTIN not found');
                return;
            }

            const data = await res.json();
            console.log('data from gstin call ', data);

            // Get data from GSTIN API
            const shopNameFromApi = data.data.tradeName || data.lgnm || '';
            const shopPanFromApi = data.data.pan || '';
            const shopAddresssFromApi = data.data.adr || '';
            const shopPincodeFromApi = data.data.pincode || '';

            // --- NEW LOGIC ---
            // Create an object with the data we have so far
            let updates = {
                shopName: shopNameFromApi,
                pan: shopPanFromApi,
                shopAddress: shopAddresssFromApi,
                shopPincode: shopPincodeFromApi
            };

            // If we got a pincode, automatically fetch city and state
            if (shopPincodeFromApi) {
                const pincodeDetails = await fetchPincodeDetails(shopPincodeFromApi);
                if (pincodeDetails) {
                    // Merge the pincode results (shopState, shopCity) into our updates
                    updates = { ...updates, ...pincodeDetails };
                }
            }

            // Set all data in one go
            setFormData(prev => ({ ...prev, ...updates }));

        } catch (err) {
            console.error('GSTIN lookup failed:', err);
        }
    };

    // This is your new reusable function
    const fetchPincodeDetails = async (pincode) => {
        if (!pincode) return null; // Exit if no pincode

        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            if (!res.ok) {
                console.warn('Pincode lookup returned non-ok');
                toast.error('Invalid Pincode');
                return null;
            }

            const data = await res.json();

            if (!data || !Array.isArray(data) || data.length === 0 || data[0].Status !== 'Success') {
                toast.error('No details found for this Pincode');
                return null;
            }

            const postOffice = data[0].PostOffice && data[0].PostOffice[0];
            if (!postOffice) {
                toast.error('No post office details found for this Pincode');
                return null;
            }

            // Return the data instead of setting state directly
            return {
                shopState: postOffice.State || '',
                shopCity: postOffice.District || ''
                // You could also return country: postOffice.Country, etc.
            };

        } catch (err) {
            console.error('Pincode lookup failed:', err);
            showAlert('Failed to fetch pincode details');
            return null;
        }
    };


    const handlePincodeBlur = async () => {
        const pincode = (formData.shopPincode || '').trim(); // or whichever field you’re using
        if (!pincode) return;

        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            if (!res.ok) {
                console.warn('Pincode lookup returned non-ok');
                showAlert('Invalid Pincode or API error');
                return;
            }

            const data = await res.json();

            if (!data || !Array.isArray(data) || data.length === 0 || data[0].Status !== 'Success') {
                showAlert('No details found for this Pincode');
                return;
            }

            const postOffice = data[0].PostOffice && data[0].PostOffice[0];
            if (!postOffice) {
                showAlert('No post office details found for this Pincode');
                return;
            }

            const stateFromApi = postOffice.State || '';
            const districtFromApi = postOffice.District || '';
            const countryFromApi = postOffice.Country || '';
            const areaFromApi = postOffice.Name || '';

            setFormData(prev => ({
                ...prev,
                shopState: stateFromApi,
                shopCity: districtFromApi
            }));
        } catch (err) {
            console.error('Pincode lookup failed:', err);
            showAlert('Failed to fetch pincode details');
        }
    };



    // Custom hoverable button now using global .btn style
    const HoverButton = ({ onClick, disabled, children, className = '', hoverStyle }) => {
        const [hover, setHover] = useState(false);
        const combinedClassName = `btn ${className}`;

        return (
            <button
                className={combinedClassName}
                onClick={onClick}
                disabled={disabled}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={hover && !disabled ? hoverStyle : {}}
            >
                {children}
            </button>
        );
    };
    const handleSectionSave = async (section) => {
        try {
            // get username first (same as original user update flow)
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('Could not get user session');
            const { username } = await userRes.json();

            if (section === 'basic') {
                // If shop logo file exists upload it separately (multipart)
                if (shopLogoFile) {
                    const logoForm = new FormData();
                    logoForm.append('shopLogo', shopLogoFile, shopLogoFile.name);

                    const logoResp = await fetch(`${apiUrl}/api/shop/user/edit/details/shopLogo`, {
                        method: 'PUT',
                        credentials: 'include',
                        body: logoForm,
                    });
                    if (!logoResp.ok) throw new Error('Failed to upload shop logo');
                }

                // Send only basic fields
                const basicPayload = {
                    shopName: formData.shopName,
                    shopAddress: formData.shopAddress,
                    shopEmail: formData.shopEmail,
                    shopPhone: formData.shopPhone,
                    shopSlogan: formData.shopSlogan,
                    shopPincode: formData.shopPincode,
                    shopCity: formData.shopCity,
                    shopState: formData.shopState,
                    gstin: formData.gstin || formData.gstNumber,
                    panNumber: formData.pan

                };

                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/basic`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(basicPayload),
                });
                if (!resp.ok) throw new Error('Failed to update basic shop details');

                toast.success('Basic shop details updated');
                setSectionEdit(prev => ({ ...prev, basic: false }));
                setUser(prev => ({ ...prev, ...basicPayload, shopLogo: shopLogoPreview }));
            }

            if (section === 'finance') {
                const financePayload = {
                    upi: formData.upi,
                    bankHolder: formData.bankHolder,
                    bankAccount: formData.bankAccount,
                    bankIfsc: formData.bankIfsc,
                    bankName: formData.bankName,
                    bankAddress: formData.bankAddress,
                    gstin: formData.gstin || formData.gstNumber,
                    pan: formData.pan
                };
                console.log("payload for finance ", financePayload);
                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/finance`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(financePayload),
                });
                if (!resp.ok) throw new Error('Failed to update finance details');

                toast.success('Finance details updated');
                setSectionEdit(prev => ({ ...prev, finance: false }));
                setUser(prev => ({ ...prev, ...financePayload }));
            }

            if (section === 'others') {
                const othersPayload = {
                    terms1: formData.terms1,
                    terms2: formData.terms2,
                    terms3: formData.terms3
                };

                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/others`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(othersPayload),
                });
                if (!resp.ok) throw new Error('Failed to update other details');

                toast.success('Other details updated');
                setSectionEdit(prev => ({ ...prev, others: false }));
                setUser(prev => ({ ...prev, ...othersPayload }));
            }


        } catch (err) {
            console.error('Section save failed:', err);
            showAlert('Something went wrong while saving the section');
        }
    };

    const isGoogleUser = userSource === 'google';

    // ------------------------ render ------------------------
    return (
        <div className="user-profile-page">
            <Toaster position="top-center" toastOptions={{
                duration: 2000,
                style: {
                    background: 'lightgreen',
                    color: 'white',
                    borderRadius: '25px',
                    padding: '12px',
                    width: '100%',
                    fontSize: '16px',
                },
            }}   reverseOrder={false} />
            <div className="glass-card" style={{width:'100%'}}>
                <div className="profile-header">
                    <div className="ribbon"><span>Account Source: {userSource}</span></div>
                    <h2>User & Shop Profile</h2>
                    <span className="info-text" style={{marginLeft: "-1100px"}}>* You cannot update Name, Email and Profile Photo if source is google</span>
                    <span className="info-text" style={{marginLeft: "-1237px"}}>* Enter valid GSTIN to autopopulate shop details</span>
                </div>

                {/* --- REQ 1: Tabs Reordered --- */}
                <div className="tab-header">
                    <button className={`tab-btn ${activeTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveTab('subscription')}>Subscription</button>
                    <button className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`} onClick={() => setActiveTab('user')}>User Details</button>
                    <button className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>Shop Details</button>
                </div>

                {/* USER TAB */}
                {activeTab === 'user' && (
                    <div className="tab-content">
                        <div className="avatar-container">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleProfilePicChange}
                                style={{ display: 'none' }}
                                accept="image/*"
                                disabled={!isEditing || isGoogleUser}
                            />
                            <img
                                src={profilePicPreview || 'https://placehold.co/150x150/e0f7ff/00aaff?text=No+Img'}
                                alt="Profile"
                                className={`avatar ${isEditing && !isGoogleUser ? 'editable' : ''}`}
                                onClick={() => { if (isEditing && !isGoogleUser) fileInputRef.current.click(); }}
                            />
                            {isEditing && !isGoogleUser && <small>Click image to change</small>}
                        </div>

                        <div className="two-column">
                            <div className="column">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input type="text" value={formData.name || ''} disabled={!isEditing || isGoogleUser} onChange={e => setFormData({ ...formData, name: e.target.value })} className={errors.name ? 'error' : ''} />
                                    {errors.name && <div className="error-message">{errors.name}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={formData.email || ''} disabled className={errors.email ? 'error' : ''} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="text" value={formData.phone || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={errors.phone ? 'error' : ''} />
                                    {errors.phone && <div className="error-message">{errors.phone}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <input type="text" value={formData.address || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, address: e.target.value })} className={errors.address ? 'error' : ''} />
                                    {errors.address && <div className="error-message">{errors.address}</div>}
                                </div>
                            </div>


                        </div>

                        <div className="button-row">
                            <button onClick={handleEditToggle} className="btn">{isEditing ? 'Submit' : 'Edit Profile'}</button>
                            {isEditing && (<button onClick={handleCancel} className="btn cancel">Cancel</button>)}
                            {!isGoogleUser && (<button onClick={() => setShowPasswordModal(true)} disabled={isEditing} className="btn">Update Password</button>)}
                        </div>
                    </div>
                )}

                {/* SHOP TAB */}
                {activeTab === 'shop' && (
                    <div className="tab-content">
                        {/* BASIC */}
                        <div className="section">
                            <div className="section-header">
                                <h3>Basic Details</h3>
                                <button
                                    className="icon-btn"
                                    onClick={() => handleSectionEdit('basic')}
                                    title={sectionEdit.basic ? 'Cancel edit' : 'Edit Basic Details'}
                                >
                                    {sectionEdit.basic ? (
                                        <CancelOutlinedIcon size={22} />
                                    ) : (
                                        <EditIcon size={22} />
                                    )}
                                </button>
                            </div>

                            <div className="form-group inline">
                                <label>Shop Logo</label>
                                <input type="file" ref={shopLogoInputRef} style={{ display: 'none' }} onChange={handleShopLogoChange} accept="image/*" />
                                <img src={shopLogoPreview} alt="Shop Logo" className={`shop-logo ${sectionEdit.basic ? 'editable' : ''}`} onClick={() => { if (sectionEdit.basic) shopLogoInputRef.current.click(); }} />
                            </div>
                            <div className="form-group">
                                <label>GSTIN</label>
                                <input type="text" value={formData.gstin || formData.gstNumber || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, gstin: e.target.value, gstNumber: e.target.value })}  onBlur={handleGstinBlur} />
                            </div>
                            <div className="form-group">
                                <label>PAN</label>
                                <input type="text" value={formData.pan || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, pan: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Shop Name</label>
                                <input type="text" value={formData.shopName || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" value={formData.shopAddress || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopAddress: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Pincode</label>
                                <input type="text" value={formData.shopPincode || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopPincode: e.target.value })} onBlur={handlePincodeBlur} />
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input type="text" value={formData.shopCity || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopCity: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input type="text" value={formData.shopState || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopState: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Shop Slogan</label>
                                <input type="text" value={formData.shopSlogan || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopSlogan: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={formData.shopEmail || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopEmail: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="text" value={formData.shopPhone || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopPhone: e.target.value })} />
                            </div>


                            {sectionEdit.basic && (<div className="section-actions"><button className="btn" onClick={() => handleSectionSave('basic')}>Save Basic Details</button><button className="btn btn-cancel" onClick={() => setSectionEdit(prev => ({ ...prev, basic: false }))}>Cancel</button></div>)}
                        </div>

                        {/* FINANCE */}
                        <div className="section">
                            <div className="section-header">
                                <h3>Finance Details</h3>

                                <button
                                    className="icon-btn"
                                    onClick={() => handleSectionEdit('finance')}
                                    title={sectionEdit.finance ? 'Cancel edit' : 'Edit Basic Details'}
                                >
                                    {sectionEdit.finance ? (
                                        <CancelOutlinedIcon size={22} />
                                    ) : (
                                        <EditIcon size={22} />
                                    )}
                                </button>


                            </div>

                            {/* <div className="form-group">
                                <label>GSTIN</label>
                                <input type="text" value={formData.gstin || formData.gstNumber || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, gstin: e.target.value, gstNumber: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>PAN</label>
                                <input type="text" value={formData.pan || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, pan: e.target.value })} />
                            </div>*/}
                            <div className="form-group">
                                <label>UPI ID</label>
                                <input type="text" value={formData.upi || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, upi: e.target.value })} />
                            </div>

                            <h4>Bank Details</h4>
                            <div className="form-group">
                                <label>Account Holder Name</label>
                                <input type="text" value={formData.bankHolder || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankHolder: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Account Number</label>
                                <input type="text" value={formData.bankAccount || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>IFSC Code</label>
                                <input type="text" value={formData.bankIfsc || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankIfsc: e.target.value })} onBlur={handleIFSCBlur} />
                            </div>
                            <div className="form-group">
                                <label>Bank Name</label>
                                <input type="text" value={formData.bankName || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Bank Address</label>
                                <input type="text" value={formData.bankAddress || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankAddress: e.target.value })} />
                            </div>

                            {sectionEdit.finance && (<div className="section-actions"><button className="btn" onClick={() => handleSectionSave('finance')}>Save Finance Details</button><button className="btn btn-cancel" onClick={() => setSectionEdit(prev => ({ ...prev, finance: false }))}>Cancel</button></div>)}
                        </div>

                        {/* OTHERS */}
                        <div className="section">
                            <div className="section-header">
                                <h3>Others</h3>
                                <button
                                    className="icon-btn"
                                    onClick={() => handleSectionEdit('others')}
                                    title={sectionEdit.finance ? 'Cancel edit' : 'Edit Basic Details'}
                                >
                                    {sectionEdit.others ? (
                                        <CancelOutlinedIcon size={22} />
                                    ) : (
                                        <EditIcon size={22} />
                                    )}
                                </button>


                            </div>

                            <div className="form-group">
                                <label>
                                    Terms & Condition{" "}
                                    <span style={{ fontStyle: "italic", fontSize: "0.85em", color: "#777" }}>
            (If you want to insert more terms, separate them with <b>##</b> — e.g., Term1##Term2##Term3)
        </span>
                                </label>
                                <textarea

                                    value={formData.terms1 || ''}
                                    disabled={!sectionEdit.others}
                                    onChange={e => setFormData({ ...formData, terms1: e.target.value })}
                                    style={{
                                        width: '100%',
                                        minHeight: '60px',
                                        padding: '10px',
                                        borderRadius: '15px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--glass-bg)',
                                        resize: 'vertical',
                                        fontSize: '1rem',
                                        color: 'var(--text-color)'
                                    }}
                                />
                            </div>



                            {sectionEdit.others && (<div className="section-actions"><button className="btn" onClick={() => handleSectionSave('others')}>Save Other Details</button><button className="btn btn-cancel" onClick={() => setSectionEdit(prev => ({ ...prev, others: false }))}>Cancel</button></div>)}

                        </div>
                    </div>
                )}

                {/* --- REQ 1: Subscription Tab Moved to the End --- */}
                {activeTab === 'subscription' && (
                    <SubscriptionPanel
                        subscription={subscription} // --- REQ 3: Pass array
                        isLoading={isLoadingSub}
                        setSelectedPage={setSelectedPage}
                    />
                )}

                {/* --- ADDED: Template Modal --- */}
                {modalOpen && modalTemplate && (
                    <div className="template-modal-overlay" onClick={closeTemplateModal}>
                        <div className="template-modal-content" onClick={(e) => e.stopPropagation()}>
                            <button className="close-modal-btn" onClick={closeTemplateModal}>&times;</button>
                            <img src={modalTemplate.imageUrl} alt={modalTemplate.displayName} className="modal-image-full"/>
                            <h4>{modalTemplate.displayName}</h4>
                            <button
                                className="btn select-btn-modal"
                                onClick={() => handleSelectTemplate(modalTemplate.name, modalTemplate.displayName)}
                                disabled={selectedTemplate === modalTemplate.name}
                            >
                                {selectedTemplate === modalTemplate.name ? 'Currently Selected' : 'Select This Template'}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASSWORD MODAL (intact) */}
                {showPasswordModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 className="modal-title">
                                {passwordStep === 1 ? 'Enter Current Password' : 'Set New Password'}
                            </h3>

                            {passwordStep === 1 ? (
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="modal-actions">
                                <HoverButton onClick={handlePasswordSubmit}>
                                    {passwordStep === 1 ? 'Validate' : 'Submit'}
                                </HoverButton>
                                <HoverButton
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordStep(1);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </HoverButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfilePage;

// --- REQ 3: Refactored SubscriptionPanel to handle an array ---
// --- REQ 3: Refactored SubscriptionPanel with History Modal ---
const SubscriptionPanel = ({ subscription, isLoading, setSelectedPage }) => {
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // 1. Loading State
    if (isLoading) {
        return <div className="tab-content">Loading Subscription Details...</div>;
    }

    // 2. Filter Subscriptions
    const now = new Date();

    // Sort all by date (newest first for better visibility)
    const sortedSubs = [...subscription].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    // Split into Active/Upcoming vs History
    const activeSubs = sortedSubs.filter(sub => {
        // It is active if endDate is in the future OR it's today
        const end = new Date(sub.endDate);
        // Reset time to ensure we don't expire plans on the same day prematurely
        end.setHours(23, 59, 59, 999);
        return end >= now;
    });

    const historySubs = sortedSubs.filter(sub => {
        const end = new Date(sub.endDate);
        end.setHours(23, 59, 59, 999);
        return end < now;
    });

    // 3. Render
    return (
        <div className="tab-content">
            {/* Header Actions: History & Update */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '1rem', marginTop: '-1rem', gap: '10px' }}>
                {historySubs.length > 0 && (
                    <button
                        className="btn btn-history"
                        onClick={() => setShowHistoryModal(true)}
                    >
                        History ({historySubs.length})
                    </button>
                )}

                <button
                    className="btn"
                    onClick={() => setSelectedPage('subscribe')}
                >
                    Update Subscription
                </button>
            </div>

            {/* Main View: Show Active or "Free Plan" message */}
            {activeSubs.length > 0 ? (
                activeSubs.map((sub, index) => {
                    const isUpcoming = new Date(sub.startDate) > new Date();
                    return (
                        <SingleSubscriptionItem
                            key={sub.subscriptionId || index}
                            subscription={sub}
                            isUpcoming={isUpcoming}
                        />
                    );
                })
            ) : (
                // No Active Subscription View
                <div className="subscription-panel non-premium">
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <FaStar size={48} style={{ color: '#ffc107' }} />
                        <h3>You are on the Free Plan</h3>
                        <p>Upgrade to Premium to unlock all features.</p>
                    </div>
                </div>
            )}

            {/* --- HISTORY MODAL --- */}
            {showHistoryModal && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    {/* Added 'wide-modal' class for styling */}
                    <div className="modal-content wide-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="history-header">
                            <h3>Subscription History</h3>
                            <button className="close-modal-btn" onClick={() => setShowHistoryModal(false)}>&times;</button>
                        </div>

                        <div className="history-list">
                            {historySubs.length > 0 ? (
                                historySubs.map((sub, index) => (
                                    <SingleSubscriptionItem
                                        key={sub.subscriptionId || index}
                                        subscription={sub}
                                        isUpcoming={false} // It's history, so never upcoming
                                        isHistoryView={true} // Optional flag for styling
                                    />
                                ))
                            ) : (
                                <p className="no-data-msg">No expired subscriptions found.</p>
                            )}
                        </div>

                        <div className="modal-actions" style={{marginTop: '20px', justifyContent: 'flex-end'}}>
                            <button className="btn btn-cancel" onClick={() => setShowHistoryModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- REQ 3: NEW Helper Component to render ONE subscription item ---
// --- Updated Helper Component ---
const SingleSubscriptionItem = ({ subscription, isUpcoming, isHistoryView }) => {
    const { subscriptionId, status, planType, startDate, endDate } = subscription;

    const remainingDays = calculateRemainingDays(endDate);
    const totalDuration = getTotalDuration(startDate, endDate);
    const progressPercent = Math.max(0, Math.min(100, (remainingDays / totalDuration) * 100));

    // Logic for bar color: Grey if history/expired, otherwise calculated
    const barColor = isHistoryView || remainingDays <= 0 ? 'grey' : getBarColor(remainingDays);

    let displayStatus = isUpcoming ? "Upcoming" : status;
    let statusClass = isUpcoming ? "status-upcoming" : `status-${status?.toLowerCase()}`;

    // Override visuals if it's in history view
    if (isHistoryView) {
        displayStatus = "Expired";
        statusClass = "status-expired"; // You can define this class as grey/red in CSS
    }

    return (
        <div className="subscription-panel premium" style={{ marginBottom: '1.5rem', opacity: isHistoryView ? 0.8 : 1 }}>
            {isUpcoming ? (
                <div className="premium-badge-header upcoming-badge">
                    <FaStar />
                    <span>Upcoming Plan</span>
                </div>
            ) : isHistoryView ? (
                <div className="premium-badge-header" style={{background: '#6c757d'}}>
                    <Archive size={20} style={{marginRight: '5px'}}/>
                    <span>Past Subscription</span>
                </div>
            ) : (
                <div className="premium-badge-header">
                    <FaCrown />
                    <span>Premium Member</span>
                </div>
            )}

            <h3>{planType || 'Plan Details'}</h3>

            <div className="subscription-details-grid">
                <div>
                    <label>Subscription ID</label>
                    <span>{subscriptionId || 'N/A'}</span>
                </div>
                <div>
                    <label>Status</label>
                    <span className={statusClass}>{displayStatus || 'N/A'}</span>
                </div>
                <div>
                    <label>Plan Type</label>
                    <span>{planType || 'N/A'}</span>
                </div>
                <div>
                    <label>Start Date</label>
                    <span>{formatDate(startDate)}</span>
                </div>
                <div>
                    <label>End Date</label>
                    <span>{formatDate(endDate)}</span>
                </div>
                <div>
                    <label>Duration</label>
                    <span>{totalDuration} Days</span>
                </div>
            </div>

            {!isUpcoming && !isHistoryView && (
                <>
                    <h4 className="progress-title">Plan Validity</h4>
                    <div className="progress-bar-container">
                        <div
                            className={`progress-bar-inner ${barColor}`}
                            style={{ width: `${progressPercent}%` }}
                        >
                            {remainingDays > 0 ? `${remainingDays} days left` : 'Expired'}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};