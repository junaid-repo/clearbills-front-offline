import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from "./ConfigProvider";
import { useAlert } from '../context/AlertContext';
import {
    PaintBrush, Timer, ShoppingCart, Receipt, User, Invoice,
    Database, CloudArrowUp, CloudArrowDown, HardDrives,
    WarningCircle, CheckCircle, ClockCounterClockwise, Trash, LinkBreak, CalendarCheck, ArrowsClockwise,
    Warning // Added Warning icon
} from "@phosphor-icons/react";
import toast, { Toaster } from 'react-hot-toast';
import './SettingsPage.css';
import './InvoiceTemplates.css';
import './UserProfilePage.css';

// --- Helper: Google Drive Icon SVG ---
const GoogleDriveIcon = ({ size = 48 }) => (
    <img
        src="./google-drive.png"
        alt="Google Drive"
        style={{ width: size, height: size, objectFit: 'contain' }}
    />
);

const SettingsPage = () => {
    const { showAlert } = useAlert();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";

    // --- State for active tab ---
    const [activeTab, setActiveTab] = useState('templates');
    const [driveEmail, setDriveEmail] = useState('');

    // --- State Management ---
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    // --- Google Drive Modal State ---
    const [showDriveModal, setShowDriveModal] = useState(false);

    // --- RESTORE MODAL STATE (NEW) ---
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreStep, setRestoreStep] = useState(1); // 1 = Confirm, 2 = Success
    const [restoreTargetId, setRestoreTargetId] = useState(null);

    // UI Settings
    const [uiSettings, setUiSettings] = useState({
        darkModeDefault: false,
        billingPageDefault: false,
        autoPrintInvoice: false,
    });
    const [originalUiSettings, setOriginalUiSettings] = useState({});
    const isUiDirty = JSON.stringify(uiSettings) !== JSON.stringify(originalUiSettings);

    // Scheduler Settings
    const [schedulerSettings, setSchedulerSettings] = useState({
        lowStockAlerts: true,
        autoDeleteNotificationsDays: 30,
        autoDeleteCustomers: { enabled: false, minSpent: 100, inactiveDays: 90 },
    });
    const [originalSchedulerSettings, setOriginalSchedulerSettings] = useState({});
    const isSchedulersDirty = JSON.stringify(schedulerSettings) !== JSON.stringify(originalSchedulerSettings);

    // Billing Settings
    const [billingSettings, setBillingSettings] = useState({
        autoSendInvoice: false,
        allowNoStockBilling: false,
        hideNoStockProducts: false,
        serialNumberPattern: '',
        showPartialPaymentOption: true,
        showRemarksOnSummarySide: true,
    });
    const [originalBillingSettings, setOriginalBillingSettings] = useState({});
    const isBillingDirty = JSON.stringify(billingSettings) !== JSON.stringify(originalBillingSettings);

    // --- AUTO BACKUP SETTINGS ---
    const [autoBackupSettings, setAutoBackupSettings] = useState('WEEKLY');
    const [autoBackupTime, setAutoBackupTime] = useState('11:00');
    const [originalAutoBackup, setOriginalAutoBackup] = useState({ frequency: 'WEEKLY', time: '11:00' });
    const isAutoBackupDirty = autoBackupSettings !== originalAutoBackup.frequency || autoBackupTime !== originalAutoBackup.time;

    // --- NEW: Helper to format date ---
    const formatDate = (dateInput) => {
        if (!dateInput) return 'N/A';
        const dateValue = dateInput.value ? dateInput.value : dateInput;
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Invoice Settings
    const [invoiceSettings, setInvoiceSettings] = useState({
        addDueDate: false,
        combineAddresses: false,
        showPaymentStatus: false,
        removeTerms: false,
        showCustomerGstin: false,
        showTotalDiscountPercentage: false,
        showIndividualDiscountPercentage: false,
        showShopPanOnInvoice: true,
        showInvoiceBarcode: true,
        showSupportInfoOnInvoice: true,
        showRateColumn: true,
        showHsnColumn: true,
    });
    const [originalInvoiceSettings, setOriginalInvoiceSettings] = useState({});
    const isInvoiceDirty = JSON.stringify(invoiceSettings) !== JSON.stringify(originalInvoiceSettings);

    // Invoice Templates
    const invoiceTemplates = [
        { name: 'gstinvoiceThermal1', displayName: 'Thermal Print 1', imageUrl: '/invoiceTemplates/ThermalPrint01.png' },
        { name: 'gstinvoiceThermal2', displayName: 'Thermal Print 2', imageUrl: '/invoiceTemplates/ThermalPrint02.png' },
        { name: 'gstinvoice', displayName: 'Best Purple', imageUrl: '/invoiceTemplates/Screenshot_20251019_235220.png' },
        { name: 'gstinvoiceskyblue', displayName: 'Modern Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235059.png' },
        { name: 'gstinvoiceLightGreen', displayName: 'Elegant Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235119.png' },
        { name: 'gstinvoiceGreen', displayName: 'Simple Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235133.png' },
        { name: 'gstinvoiceBlue', displayName: 'Simple Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235150.png' },
        { name: 'gstinvoiceOrange', displayName: 'Classic Orange', imageUrl: '/invoiceTemplates/Screenshot_20251019_235203.png' },
    ];

    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTemplate, setModalTemplate] = useState(null);

    const [backupLoading, setBackupLoading] = useState(false);
    const [driveBackups, setDriveBackups] = useState([]);
    const restoreFileRef = useRef(null);

    // --- BACKUP HANDLERS ---
    const handleLocalBackup = async () => {
        setBackupLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/cloud/download`, { credentials: 'include' });
            if (!response.ok) throw new Error("Backup failed");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = `shop_backup_${date}.sql`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Backup downloaded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download backup.");
        } finally {
            setBackupLoading(false);
        }
    };

    const handleLocalRestoreTrigger = () => restoreFileRef.current.click();

    const handleLocalRestoreFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!window.confirm("CRITICAL WARNING: This will WIPE all current data. Are you sure?")) {
            event.target.value = null;
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        setBackupLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/cloud/restore`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!response.ok) throw new Error("Restore failed");
            toast.success("Restore Successful! Reloading app...");
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error(error);
            toast.error("Failed to restore backup.");
        } finally {
            setBackupLoading(false);
            event.target.value = null;
        }
    };

    const initiateCloudBackup = () => {
        setShowDriveModal(true);
    };

    const performCloudBackup = async () => {
        setShowDriveModal(false);
        setBackupLoading(true);
        const toastId = toast.loading("Connecting to Google Drive...");
        try {
            const response = await fetch(`${apiUrl}/api/cloud/backup`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error("Cloud backup failed");
            await response.text();
            toast.success("Backup uploaded to Drive!", { id: toastId });
            fetchCloudBackups();
        } catch (error) {
            console.error(error);
            toast.error("Upload failed. Check connection.", { id: toastId });
        } finally {
            setBackupLoading(false);
        }
    };

    // --- RESTORE LOGIC (UPDATED FOR MODAL) ---

    // 1. User clicks restore button on list -> Opens Modal
    const handleRestoreClick = (fileId) => {
        setRestoreTargetId(fileId);
        setRestoreStep(1); // Reset to confirmation step
        setShowRestoreModal(true);
    };

    // 2. User confirms inside modal -> Calls API
    const performCloudRestore = async () => {
        if (!restoreTargetId) return;
        setBackupLoading(true);
        const toastId = toast.loading("Downloading & Restoring....");

        try {
            const response = await fetch(`${apiUrl}/api/cloud/restore/${restoreTargetId}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error("Cloud restore failed");

            // Attempt to refresh cache
            try {
                await fetch(`${apiUrl}/api/shop/refreshbackendcache`, {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch (cacheError) {
                console.warn("Cache refresh had issues.", cacheError);
            }

            toast.dismiss(toastId);
            setRestoreStep(2); // Move to Step 2 (Success Message)

        } catch (error) {
            console.error(error);
            toast.error("Cloud restore failed.", { id: toastId });
            setShowRestoreModal(false); // Close on error
        } finally {
            setBackupLoading(false);
        }
    };

    // 3. Final Step: Refresh Page
    const handleFinalizeRestore = () => {
        window.location.reload();
    };


    useEffect(() => {
        const fetchBackupSettings = async () => {
            if (!apiUrl) return;
            try {
                const response = await fetch(`${apiUrl}/api/shop/settings/user/backup-schedule`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    const freq = data.frequency || 'WEEKLY';
                    const time = data.time || '00:00';
                    setAutoBackupSettings(freq);
                    setAutoBackupTime(time);
                    setOriginalAutoBackup({ frequency: freq, time: time });
                }
            } catch (error) {
                console.error("Failed to load backup settings", error);
            }
        };
        fetchBackupSettings();
    }, [apiUrl]);

    const handleSaveAutoBackup = async () => {
        try {
            const payload = {
                frequency: autoBackupSettings,
                time: autoBackupTime
            };
            const response = await fetch(`${apiUrl}/api/shop/settings/user/save/backup-schedule`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to save");
            toast.success("Auto-backup schedule updated!");
            setOriginalAutoBackup(payload);
        } catch (error) {
            toast.error("Could not save schedule.");
        }
    };

    const handleUnlinkDrive = async () => {
        if (!window.confirm("Disconnect Google Drive? Automatic backups will stop.")) return;
        const toastId = toast.loading("Disconnecting...");
        try {
            const response = await fetch(`${apiUrl}/api/cloud/unlink`, { method: 'POST', credentials: 'include' });
            if (response.ok) {
                toast.success("Google Drive disconnected", { id: toastId });
                setDriveBackups([]);
                setDriveEmail('');
            } else { throw new Error("Failed to unlink"); }
        } catch (error) { toast.error("Failed to disconnect", { id: toastId }); }
    };

    const handleDeleteCloudBackup = async (fileId) => {
        if (!window.confirm("Delete this backup file permanently?")) return;
        const toastId = toast.loading("Deleting file...");
        try {
            const response = await fetch(`${apiUrl}/api/cloud/delete/${fileId}`, { method: 'DELETE', credentials: 'include' });
            if (response.ok) {
                toast.success("File deleted", { id: toastId });
                setDriveBackups(prev => prev.filter(b => b.id !== fileId));
            } else { throw new Error("Delete failed"); }
        } catch (error) { toast.error("Could not delete file", { id: toastId }); }
    };

    const fetchCloudBackups = async () => {
        setBackupLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/cloud/list`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setDriveBackups(data);
                } else {
                    setDriveBackups(data.files || []);
                    setDriveEmail(data.email || '');
                }
            }
        } catch (error) { console.error("Could not fetch drive backups", error); } finally { setBackupLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'backup') { fetchCloudBackups(); }
    }, [activeTab]);

    // ... (Existing useEffects for settings)
    useEffect(() => {
        const fetchSettings = async () => {
            if (!apiUrl) return;
            try {
                const response = await fetch(`${apiUrl}/api/shop/get/user/settings`, { credentials: 'include' });
                if (!response.ok) throw new Error("Could not load settings");
                const data = await response.json();
                setUiSettings(data.ui || {});
                setOriginalUiSettings(data.ui || {});
                setSchedulerSettings(data.schedulers || {});
                setOriginalSchedulerSettings(data.schedulers || {});
                setBillingSettings(data.billing || {});
                setOriginalBillingSettings(data.billing || {});
                setInvoiceSettings(data.invoice || {});
                setOriginalInvoiceSettings(data.invoice || {});
            } catch (error) { console.error("Failed to fetch settings:", error); showAlert("Could not load your general settings."); }
        };

        const fetchSelectedTemplate = async () => {
            if (!apiUrl) return;
            try {
                const response = await fetch(`${apiUrl}/api/shop/user/get/user/invoiceTemplate`, { method: 'GET', credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    setSelectedTemplate(data.selectedTemplateName || '');
                } else { setSelectedTemplate(''); }
            } catch (error) { setSelectedTemplate(''); }
        };
        fetchSettings();
        fetchSelectedTemplate();
    }, [apiUrl, showAlert]);

    const handlePasswordSubmit = async () => {
        if (passwordStep === 1) {
            try {
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, { method: "GET", credentials: 'include' });
                if (!userRes.ok) throw new Error("Could not fetch user profile.");
                const { username } = await userRes.json();
                const response = await fetch(`${authApiUrl}/auth/authenticate`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password: passwordData.currentPassword }),
                });
                if (!response.ok) { showAlert("Invalid current password. Please try again."); return; }
                setPasswordStep(2);
            } catch (error) { showAlert("Something went wrong while validating password."); }
        } else {
            if (passwordData.newPassword !== passwordData.confirmPassword) { showAlert("New passwords do not match."); return; }
            if (passwordData.newPassword.length < 4) { showAlert("Password must be at least 4 characters long."); return; }
            try {
                const response = await fetch(`${apiUrl}/api/shop/user/updatepassword`, {
                    method: "POST", credentials: 'include', headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: passwordData.newPassword }),
                });
                if (!response.ok) throw new Error("Failed to update password.");
                toast.success("Password updated successfully!");
                setShowPasswordModal(false); setPasswordStep(1); setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } catch (error) { showAlert("Something went wrong while updating password."); }
        }
    };

    const createSaveHandler = (endpoint, settings, setOriginalSettings, settingsName) => async () => {
        try {
            const response = await fetch(`${apiUrl}/api/shop/settings/user/save/${endpoint}`, {
                method: "PUT", credentials: 'include', headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!response.ok) throw new Error("Server error");
            toast.success(`${settingsName} settings saved successfully!`);
            setOriginalSettings(settings);
        } catch (error) { showAlert(`Failed to save ${settingsName} settings.`); }
    };

    const handleRefreshCache = async () => {
        if (isRefreshing) return;
        if (!apiUrl) { toast.error("API not available."); return; }
        setIsRefreshing(true);
        const refreshToastId = toast.loading("Refreshing app...");
        try {
            const response = await fetch(`${apiUrl}/api/shop/refreshbackendcache`, { method: 'POST', credentials: 'include' });
            if (!response.ok) throw new Error("Failed to refresh cache");
            toast.success('App refreshed', { id: refreshToastId });
        } catch (error) { toast.error('Refresh failed.', { id: refreshToastId }); } finally { setIsRefreshing(false); }
    };

    const handleSaveUiSettings = createSaveHandler('ui', uiSettings, setOriginalUiSettings, 'UI');
    const handleSaveSchedulers = createSaveHandler('scheduler', schedulerSettings, setOriginalSchedulerSettings, 'Scheduler');
    const handleSaveBillingSettings = createSaveHandler('billing', billingSettings, setOriginalBillingSettings, 'Billing');
    const handleSaveInvoiceSettings = createSaveHandler('invoice', invoiceSettings, setOriginalInvoiceSettings, 'Invoice');

    const handleSelectTemplate = async (templateName, displayName) => {
        if (!apiUrl) { toast.error("Cannot save selection. API configuration missing."); return; }
        try {
            const response = await fetch(`${apiUrl}/api/shop/user/save/user/invoiceTemplate`, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedTemplateName: templateName }),
            });
            if (response.ok) { setSelectedTemplate(templateName); toast.success(`Template "${displayName}" selected!`); setModalOpen(false); }
            else { toast.error(`Failed to select template: ${response.statusText}`); }
        } catch (error) { toast.error("Something went wrong while saving your selection."); }
    };

    const openTemplateModal = (template) => { setModalTemplate(template); setModalOpen(true); };
    const closeTemplateModal = () => { setModalOpen(false); setModalTemplate(null); };

    const ToggleSwitch = ({ checked, onChange }) => (
        <label className="switch">
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span className="slider round"></span>
        </label>
    );

    return (<div className="settings-page">
        <Toaster position="top-center" toastOptions={{
            duration: 2000,
            style: { background: 'lightgreen', color: 'var(--text-color)', borderRadius: '25px', padding: '12px', width: '180%', minWidth: '250px', fontSize: '16px' },
        }} reverseOrder={false} />

        <div className="glass-card" style={{ maxWidth: '1100px', marginTop: '50px' }}>
            <h1 style={{ textAlign: 'left', marginBottom: '55px' }}>Settings</h1>
            <span className="info-text" style={{ marginLeft: "-700px" }}>* Please logout and relogin for the settings to take effect</span>

            <div className="settings-tab-nav">
                <button className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
                    <i className="fa-duotone fa-solid fa-ballot-check"></i>Templates
                </button>
                <button className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
                    <i className="fa-duotone fa-solid fa-database"></i> Backup
                </button>
                <button className={`tab-btn ${activeTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveTab('invoice')}>
                    <i className="fa-duotone fa-solid fa-file-invoice"></i> Invoice
                </button>
                <button className={`tab-btn ${activeTab === 'ui' ? 'active' : ''}`} onClick={() => setActiveTab('ui')}>
                    <i className="fa-duotone fa-solid fa-paint-roller"></i> UI
                </button>
                <button className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
                    <i className="fa-duotone fa-solid fa-calculator"></i> Billing
                </button>
                <button className={`tab-btn ${activeTab === 'schedulers' ? 'active' : ''}`} onClick={() => setActiveTab('schedulers')}>
                    <i className="fa-duotone fa-solid fa-stopwatch"></i> Schedulers
                </button>
            </div>

            <div className="settings-tab-content">
                {activeTab === 'templates' && (
                    <div className="tab-pane invoice-templates-tab">
                        <h3>Select Your Invoice Template</h3>
                        <p>Choose the design you prefer for your generated invoices.</p>
                        <div className="template-grid">
                            {invoiceTemplates.map((template) => (
                                <div key={template.name} className={`template-card ${selectedTemplate === template.name ? 'selected' : ''}`}>
                                    <img src={template.imageUrl} alt={template.displayName} onClick={() => openTemplateModal(template)} className="template-image" />
                                    <div className="template-info">
                                        <span className="template-name">{template.displayName}</span>
                                        <button className="btn select-btn" onClick={() => handleSelectTemplate(template.name, template.displayName)} disabled={selectedTemplate === template.name}>
                                            {selectedTemplate === template.name ? 'Selected' : 'Select'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'ui' && (
                    <div className="tab-pane">
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch checked={uiSettings.darkModeDefault} onChange={(e) => setUiSettings({ ...uiSettings, darkModeDefault: e.target.checked })} />
                                <label>Select dark mode as default theme</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch checked={uiSettings.billingPageDefault} onChange={(e) => setUiSettings({ ...uiSettings, billingPageDefault: e.target.checked })} />
                                <label>Select Billing Page as default</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch checked={uiSettings.autoPrintInvoice} onChange={(e) => setUiSettings({ ...uiSettings, autoPrintInvoice: e.target.checked })} />
                                <label>Directly forward to invoice printing after payment</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <button className="btn" onClick={handleRefreshCache} disabled={isRefreshing}>
                                    {isRefreshing ? 'Refreshing...' : 'Refresh App'}
                                </button>
                                <span style={{ paddingLeft: "21rem" }}>Clear server-side application cache</span>
                            </div>
                        </div>
                        {isUiDirty && <div className="save-button-container"><button className="btn" onClick={handleSaveUiSettings}>Save UI Settings</button></div>}
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="tab-pane">
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={billingSettings.autoSendInvoice} onChange={(e) => setBillingSettings({ ...billingSettings, autoSendInvoice: e.target.checked })} /><label>Automatic send invoice after billing</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={billingSettings.allowNoStockBilling} onChange={(e) => setBillingSettings({ ...billingSettings, allowNoStockBilling: e.target.checked })} /><label>Allow to create sales invoices even if stock is not available</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={billingSettings.hideNoStockProducts} onChange={(e) => setBillingSettings({ ...billingSettings, hideNoStockProducts: e.target.checked })} /><label>Hide out of stock products from product list</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={billingSettings.showPartialPaymentOption} onChange={(e) => setBillingSettings({ ...billingSettings, showPartialPaymentOption: e.target.checked })} /><label>Show Partial Payment Option on Billing Page</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={billingSettings.showRemarksOnSummarySide} onChange={(e) => setBillingSettings({ ...billingSettings, showRemarksOnSummarySide: e.target.checked })} /><label>Show remarks option on Summary Side</label></div></div>
                        <div className="setting-item">
                            <label>Enter Invoice serial number pattern (Max 5 character)</label>
                            <div className="input-group"><input type="text" className="small-input" maxLength={5} value={billingSettings.serialNumberPattern} onChange={(e) => setBillingSettings({ ...billingSettings, serialNumberPattern: e.target.value })} /></div>
                        </div>
                        {isBillingDirty && <div className="save-button-container"><button className="btn" onClick={handleSaveBillingSettings}>Save Billing Settings</button></div>}
                    </div>
                )}

                {activeTab === 'invoice' && (
                    <div className="tab-pane">
                        <h5 className="setting-section-header">Header</h5>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showShopPanOnInvoice} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showShopPanOnInvoice: e.target.checked })} /><label>Show Shop Pan</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showInvoiceBarcode} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showInvoiceBarcode: e.target.checked })} /><label>Show Invoice Barcode</label></div></div>
                        <h5 className="setting-section-header">Customer Details</h5>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.combineAddresses} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, combineAddresses: e.target.checked })} /><label>Combine Ship To and Bill To as 'Bill To'</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showCustomerGstin} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showCustomerGstin: e.target.checked })} /><label>Show Customer GSTIN on invoice</label></div></div>
                        <h5 className="setting-section-header">Items List</h5>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showIndividualDiscountPercentage} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showIndividualDiscountPercentage: e.target.checked })} /><label>Show Items discount</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showHsnColumn} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showHsnColumn: e.target.checked })} /><label>Show Hsn Column</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showRateColumn} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showRateColumn: e.target.checked })} /><label>Show Rate Column</label></div></div>
                        <h5 className="setting-section-header">Total Summary</h5>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showTotalDiscountPercentage} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showTotalDiscountPercentage: e.target.checked })} /><label>Show Total discount</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showPaymentStatus} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showPaymentStatus: e.target.checked })} /><label>Add Payment Received and Payment Due in the Invoice</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.addDueDate} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, addDueDate: e.target.checked })} /><label>Add Due Date option on invoice</label></div></div>
                        <h5 className="setting-section-header">Footer</h5>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.removeTerms} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, removeTerms: e.target.checked })} /><label>Remove Terms and Conditions from the invoice</label></div></div>
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showSupportInfoOnInvoice} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showSupportInfoOnInvoice: e.target.checked })} /><label>Show Support Info</label></div></div>
                        {isInvoiceDirty && <div className="save-button-container"><button className="btn" onClick={handleSaveInvoiceSettings}>Save Invoice Settings</button></div>}
                    </div>
                )}

                {activeTab === 'schedulers' && (
                    <div className="tab-pane">
                        <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={schedulerSettings.lowStockAlerts} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, lowStockAlerts: e.target.checked })} /><label>Receive low stock alerts</label></div></div>
                        <div className="setting-item">
                            <label>Auto delete notifications after</label>
                            <div className="input-group"><input type="number" className="small-input" value={schedulerSettings.autoDeleteNotificationsDays} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteNotificationsDays: Number(e.target.value) })} /><span>days</span></div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle"><ToggleSwitch checked={schedulerSettings.autoDeleteCustomers.enabled} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, enabled: e.target.checked } })} /><label>Auto delete customers</label></div>
                            {schedulerSettings.autoDeleteCustomers.enabled && (
                                <div className="indented-controls">
                                    <label>Who spent less than an amount and were inactive for a period</label>
                                    <div className="input-group"><span>Spent less than ₹</span><input type="number" className="small-input" value={schedulerSettings.autoDeleteCustomers.minSpent} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, minSpent: Number(e.target.value) } })} /></div>
                                    <div className="input-group"><span>Inactive for</span><input type="number" className="small-input" value={schedulerSettings.autoDeleteCustomers.inactiveDays} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, inactiveDays: Number(e.target.value) } })} /><span> days</span></div>
                                </div>
                            )}
                        </div>
                        {isSchedulersDirty && <div className="save-button-container"><button className="btn" onClick={handleSaveSchedulers}>Save Schedulers</button></div>}
                    </div>
                )}

                {activeTab === 'backup' && (
                    <div className="tab-pane">
                        <h3>Data Management</h3>
                        <div className="cloud-backup-card">
                            <div style={{ marginBottom: '10px' }}><GoogleDriveIcon size={64} /></div>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1.3rem', color: 'var(--text-color)' }}>Google Drive Sync</h4>

                            {driveEmail ? (
                                <div className="drive-account-badge">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="status-dot"></div><span className="drive-email-text">{driveEmail}</span></div>
                                    <button onClick={handleUnlinkDrive} title="Disconnect Account" className="drive-unlink-btn"><LinkBreak size={16} weight="bold" /></button>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Securely store your data in the cloud.</p>
                            )}

                            <div className="auto-backup-control-panel">
                                <div style={{ textAlign: 'left' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '14px', color: 'var(--text-color)' }}>
                                        <CalendarCheck size={18} color="#4285F4" /> Auto-Backup
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <select value={autoBackupSettings} onChange={(e) => setAutoBackupSettings(e.target.value)} className="settings-input">
                                        <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="OFF">Off</option>
                                    </select>
                                    {autoBackupSettings !== 'OFF' && (
                                        <input type="time" className="settings-input" value={autoBackupTime} onChange={(e) => setAutoBackupTime(e.target.value)} style={{ width: 'auto' }} />
                                    )}
                                    {isAutoBackupDirty && <button className="btn" onClick={handleSaveAutoBackup} style={{ padding: '6px 12px', fontSize: '12px' }}>Save</button>}
                                </div>
                            </div>

                            {/* --- 1. BACKUP BUTTON & WARNING MESSAGE --- */}
                            <button
                                className="btn"
                                onClick={initiateCloudBackup}
                                disabled={backupLoading || driveBackups.length >= 5}
                                style={{
                                    backgroundColor: driveBackups.length >= 5 ? 'var(--disabled-color)' : '#4285F4',
                                    color: 'white', padding: '12px 28px', fontSize: '1rem',
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    border: 'none', borderRadius: '6px', cursor: driveBackups.length >= 5 ? 'not-allowed' : 'pointer',
                                    marginTop: '10px'
                                }}
                            >
                                <CloudArrowUp size={24} weight="bold" />
                                {driveBackups.length >= 5 ? "Limit Reached" : "Backup Now"}
                            </button>

                            {/* ERROR MESSAGE WHEN LIMIT EXCEEDED */}
                            {driveBackups.length >= 5 && (
                                <div style={{ marginTop: '10px', color: '#ff4d4f', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '500' }}>
                                    <Warning size={18} weight="fill" />
                                    <span>Backup count exceeded five. Please delete existing backup.</span>
                                </div>
                            )}

                            <div className="backup-list-container">
                                <div className="backup-list-header">
                                    <h6 style={{ margin: 0, color: 'var(--text-color)', fontSize: '14px', fontWeight: '700' }}><ClockCounterClockwise size={18} style={{ marginBottom: '-3px', marginRight: '6px' }} />Recent Backups ({driveBackups.length}/5)</h6>
                                    <button onClick={fetchCloudBackups} disabled={backupLoading} className="refresh-link-btn"><ArrowsClockwise size={18} className={backupLoading ? "spin-animation" : ""} /> Refresh</button>
                                </div>

                                {driveBackups.length === 0 ? (
                                    <div style={{ padding: '30px', textAlign: 'center' }}><p style={{ fontSize: '14px', color: 'var(--text-color-secondary)', fontStyle: 'italic', marginBottom: '15px' }}>No backups found. Connect Drive to get started.</p></div>
                                ) : (
                                    <ul className="backup-list">
                                        {driveBackups.map(file => (
                                            <li key={file.id} className="backup-list-item">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                                    <Database color="#4285F4" size={20} weight="fill" />
                                                    <span className="backup-filename">{file.name.replace(/\.sql$/i, '')}</span>
                                                </div>
                                                <div className="backup-date">{formatDate(file.createdTime)}</div>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    {/* Changed onClick to use handleRestoreClick */}
                                                    <button onClick={() => handleRestoreClick(file.id)} disabled={backupLoading} title="Restore" className="action-btn-restore">Restore</button>
                                                    <button onClick={() => handleDeleteCloudBackup(file.id)} disabled={backupLoading} title="Delete" className="action-btn-delete"><Trash size={16} /></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <h5 className="setting-section-header" style={{ marginTop: '20px' }}><HardDrives size={20} style={{ marginBottom: '-4px', marginRight: '5px' }} />Local Backup (Offline)</h5>
                        <div className="setting-item">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div><span style={{ fontWeight: '500' }}>Download Snapshot</span><div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>Save a .sql file to your computer</div></div>
                                    <button className="btn" onClick={handleLocalBackup} disabled={backupLoading} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><HardDrives /> Save to Computer</button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                    <div><span style={{ fontWeight: '500' }}>Restore from File</span><p style={{ fontSize: '12px', color: 'var(--text-color-secondary)', margin: 0 }}>Select a .sql file to wipe and restore data.</p></div>
                                    <input type="file" accept=".sql" ref={restoreFileRef} style={{ display: 'none' }} onChange={handleLocalRestoreFileChange} />
                                    <button className="btn" onClick={handleLocalRestoreTrigger} disabled={backupLoading} style={{ backgroundColor: '#e63946', display: 'flex', alignItems: 'center', gap: '5px' }}><CloudArrowDown /> Upload & Restore</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ====== MODALS ====== */}

            {/* 1. Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{passwordStep === 1 ? 'Enter Current Password' : 'Set New Password'}</h3>
                        {passwordStep === 1 ? (
                            <div className="form-group"><label>Current Password</label><input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} /></div>
                        ) : (
                            <><div className="form-group"><label>New Password</label><input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} /></div><div className="form-group"><label>Confirm New Password</label><input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} /></div></>
                        )}
                        <div className="modal-actions">
                            <button className="btn" onClick={handlePasswordSubmit}>{passwordStep === 1 ? 'Validate' : 'Submit'}</button>
                            <button className="btn btn-cancel" onClick={() => { setShowPasswordModal(false); setPasswordStep(1); }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Google Drive Confirmation Popup */}
            {showDriveModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
                        <GoogleDriveIcon size={60} />
                        <h3 style={{ marginTop: '15px' }}>Connect to Google Drive?</h3>
                        <p style={{ color: '#666', marginBottom: '25px', fontSize: '0.95rem' }}>We will connect to your Google Drive to upload a secure backup of your database. You may be asked to log in.</p>
                        <div className="modal-actions" style={{ justifyContent: 'center', gap: '15px' }}>
                            <button className="btn btn-cancel" onClick={() => setShowDriveModal(false)}>Cancel</button>
                            <button className="btn" onClick={performCloudBackup} style={{ backgroundColor: '#4285F4', color: 'white' }}>Yes, Connect</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. --- NEW: RESTORE MODAL (Two-Step Alert) --- */}
            {showRestoreModal && (
                <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}> {/* Faded background */}
                    <div className="modal-content" style={{ textAlign: 'center', maxWidth: '450px' }}>
                        {restoreStep === 1 ? (
                            // STEP 1: CONFIRMATION
                            <>
                                <WarningCircle size={50} color="#ff4d4f" weight="fill" style={{ marginBottom: '15px' }} />
                                <h3 style={{ color: '#ff4d4f', margin: '0 0 10px 0' }}>Data Overwrite Warning</h3>
                                <p style={{ fontSize: '0.95rem', color: '#555', marginBottom: '25px', lineHeight: '1.5' }}>
                                    Are you sure you want to restore this backup? <br />
                                    <b>This will completely replace all your current data.</b><br />
                                    This action cannot be undone.
                                </p>
                                <div className="modal-actions" style={{ justifyContent: 'center', gap: '15px' }}>
                                    <button className="btn btn-cancel" onClick={() => setShowRestoreModal(false)}>Cancel</button>
                                    <button
                                        className="btn"
                                        onClick={performCloudRestore}
                                        disabled={backupLoading}
                                        style={{ backgroundColor: '#ff4d4f', color: 'white' }}
                                    >
                                        {backupLoading ? 'Restoring...' : 'Yes, Restore Backup'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            // STEP 2: SUCCESS & INSTRUCTION
                            <>
                                <CheckCircle size={50} color="#52c41a" weight="fill" style={{ marginBottom: '15px' }} />
                                <h3 style={{ color: '#52c41a', margin: '0 0 10px 0' }}>Restore Successful!</h3>
                                <div style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
                                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500', color: '#333' }}>
                                        Logout and relogin for better result.
                                    </p>
                                </div>
                                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                                    <button
                                        className="btn"
                                        onClick={handleFinalizeRestore}
                                        style={{ backgroundColor: '#1890ff', color: 'white', width: '100%' }}
                                    >
                                        Reload App Now
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 4. Template Modal */}
            {modalOpen && modalTemplate && (
                <div className="template-modal-overlay" onClick={closeTemplateModal}>
                    <div className="template-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={closeTemplateModal}>&times;</button>
                        <img src={modalTemplate.imageUrl} alt={modalTemplate.displayName} className="modal-image-full" />
                        <h4>{modalTemplate.displayName}</h4>
                        <button className="btn select-btn-modal" onClick={() => handleSelectTemplate(modalTemplate.name, modalTemplate.displayName)} disabled={selectedTemplate === modalTemplate.name}>
                            {selectedTemplate === modalTemplate.name ? 'Currently Selected' : 'Select This Template'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>);
};

export default SettingsPage;