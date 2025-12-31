// src/pages/ProductsPage.js
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import Modal from '../components/Modal';
import { useConfig } from "./ConfigProvider";
import { MdEdit, MdDelete } from "react-icons/md";
import { useLocation } from 'react-router-dom';
import { useSearchKey } from '../context/SearchKeyContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaCheckDouble, FaTimes, FaInfoCircle, FaDownload } from 'react-icons/fa';
import { useAlert } from '../context/AlertContext';
import PremiumFeature from '../components/PremiumFeature';

import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Trash
} from "@phosphor-icons/react";

/**
 * Custom hook to debounce a value.
 * @param {any} value The value to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {any} The debounced value.
 */
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const ProductsPage = () => {
    // --- STATE MANAGEMENT ---
    const { showAlert } = useAlert();
    // Original State
    const [products, setProducts] = useState([]); // Holds data for the CURRENT page only
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [hsn, setHsn] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [stock, setStock] = useState("");
    const [tax, setTax] = useState("18");
    const [selectedProductId, setSelectedProductId] = useState(null);

    const standardTaxSlabs = ['0', '5', '12', '18', '28'];

// Check if the current 'tax' value is one of the standard slabs.
// We convert 'tax' to a string just in case it's a number from the database.
    const currentTaxIsStandard = standardTaxSlabs.includes(String(tax));

    // CSV Upload State
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // NEW: Pagination & Caching State
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);
    const productsCache = useRef({}); // In-memory cache: { cacheKey: { data, totalPages, totalCount } }
    const ITEMS_PER_PAGE = 10; // Or make this configurable

// Add these with your other useState declarations
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(new Set());

    // NEW: Debounced search term to reduce API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Column Chooser State (Unchanged)
    const COLUMN_STORAGE_KEY = 'products_visible_columns_v1';
    const columnsRef = useRef(null);
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const defaultVisibleColumns = { id: true, name: true, category: true, hsn: true, costPrice: true, price: true, tax: true, stock: true, status: true, actions: true };
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
            return saved ? { ...defaultVisibleColumns, ...JSON.parse(saved) } : defaultVisibleColumns;
        } catch (err) {
            return defaultVisibleColumns;
        }
    });

    useEffect(() => {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Close columns dropdown when clicking outside
    useEffect(() => {
        const onClick = (e) => {
            if (columnsRef.current && !columnsRef.current.contains(e.target)) {
                setIsColumnsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    // ✅ --- START: PERSISTED SORT STATE ---

    // 1. Define a constant for the localStorage key.
    const SORT_STORAGE_KEY = 'products_sort_config_v1';

    // 2. Initialize sortConfig state by reading from localStorage.
    const [sortConfig, setSortConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(SORT_STORAGE_KEY);
            return saved ? JSON.parse(saved) : { key: 'createdAt', direction: 'desc' };
        } catch (err) {
            console.error("Failed to parse sort config from localStorage", err);
            return { key: 'createdAt', direction: 'desc' };
        }
    });

    // 3. Initialize hasSortActive based on the loaded sortConfig.
    const [hasSortActive, setHasSortActive] = useState(() => {
        try {
            const saved = localStorage.getItem(SORT_STORAGE_KEY);
            if (saved) {
                const parsedConfig = JSON.parse(saved);
                return parsedConfig.key !== 'createdAt';
            }
        } catch (err) { /* fall through */ }
        return false;
    });

    // 4. Add a useEffect to save sortConfig whenever it changes.
    useEffect(() => {
        localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortConfig));
    }, [sortConfig]);

    // ✅ --- END: PERSISTED SORT STATE ---


    // --- API & DATA HANDLING ---

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    // NEW: Centralized function to fetch products with caching
    const fetchProducts = useCallback(async () => {
        if (!apiUrl) return;

        const sortKey = sortConfig.key || 'createdAt';
        const sortDir = sortConfig.direction || 'desc';


        // 2. Fetch from API if not in cache
        setIsLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/withCache/productsList`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            url.searchParams.append('sort', sortKey);
            url.searchParams.append('dir', sortDir);
            if (debouncedSearchTerm) {
                url.searchParams.append('search', debouncedSearchTerm);
            }

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Backend should return: { data: [], totalPages: N, totalCount: N }
            const result = await response.json();
            console.log("Fetched products:", result);
            // 3. Update state and cache
            setProducts(result.data || []);
            setTotalPages(result.totalPages || 0);
            setTotalProducts(result.totalCount || 0);



        } catch (error) {
            console.error("Error fetching products:", error);
            showAlert("Something went wrong while fetching products.");
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, currentPage, debouncedSearchTerm, sortConfig]);

    // Main effect to trigger fetching data
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Effect to reset page and clear cache when search or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, sortConfig]);

    // On mount, check for searchKey in query string
    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key) {
            setSearchTerm(key);
        }
    }, [location.search]);

    // Sync search bar with global search key
    const { searchKey, setSearchKey } = useSearchKey();
    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) {
            setSearchTerm(searchKey);
        }
    }, [searchKey]);
    const handleDownloadTemplate = () => {
        const headers = "selectedProductId,name,hsn,category,costPrice,price,stock,tax";
        const blob = new Blob([headers], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "products_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- EVENT HANDLERS ---

    const handleEditClick = (product) => {
        setSelectedProductId(product.id);
        setName(product.name);
        setHsn(product.hsn);
        setCategory(product.category);
        setPrice(product.price);
        setCostPrice(product.costPrice || "");
        setStock(product.stock);
        setTax(product.tax);
        setHsn(product.hsn);
        setIsUpdateModalOpen(true);
    };

    const resetForm = () => {
        setName("");
        setHsn("");
        setCategory("");
        setPrice("");
        setStock("");
        setTax("");
        setCostPrice("");
        setSelectedProductId(null);
    };
    const handleCloseUpdateModal = () => {
        setIsUpdateModalOpen(false); // This closes the modal
        resetForm();               // This clears the form fields
    };
    // UPDATED: CUD operations now invalidate the cache
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, category, price, costPrice, stock, tax, hsn };
            const response = await fetch(`${apiUrl}/api/shop/create/product`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            toast.success('Product added successfully!');
            fetchProducts(); // <-- Refresh the product list
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error adding product:", error);
            showAlert("Something went wrong while adding the product.");
        }
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { selectedProductId, name, category, price, costPrice, stock, tax, hsn };
            const response = await fetch(`${apiUrl}/api/shop/update/product`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            fetchProducts(); // <-- Refresh the product list
            setIsUpdateModalOpen(false);
            toast.success('Product updated successfully!');

            resetForm();
        } catch (err) {
            console.error("Error updating product:", err);
            showAlert("Failed to update product");
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                const response = await fetch(`${apiUrl}/api/shop/product/delete/${id}`, {
                    method: "DELETE",
                    credentials: 'include'
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                toast.error('Product deleted successfully!');
                fetchProducts();
                return { success: true, id }; // Return success for Promise.all
            } catch (error) {
                console.error("Error deleting product:", error);
                showAlert("Something went wrong while deleting the product.");
            }
        }
    };

    const handleDeleteProductBulk = async (id) => {
        // This function will now be wrapped by the bulk delete handler
        try {
            const response = await fetch(`${apiUrl}/api/shop/product/delete/${id}`, {
                method: "DELETE",
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`Failed to delete product ID ${id}`);
            }
            return { success: true, id }; // Return success for Promise.all
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error(`Failed to delete product ID ${id}.`);
            return { success: false, id }; // Return failure for Promise.all
        }
    };

    const handleToggleSelectionMode = () => {
        setIsSelectionMode(prev => !prev);
        setSelectedProducts(new Set()); // Clear selections when toggling
    };

    const handleSelectProduct = (productId) => {
        setSelectedProducts(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(productId)) {
                newSelected.delete(productId);
            } else {
                newSelected.add(productId);
            }
            return newSelected;
        });
    };

    const handleBulkDelete = async () => {
        const numSelected = selectedProducts.size;
        if (numSelected === 0) return;

        if (window.confirm(`Are you sure you want to delete ${numSelected} selected product(s)?`)) {
            const deletePromises = Array.from(selectedProducts).map(id => handleDeleteProductBulk(id));

            // We use Promise.all to run delete requests concurrently
            const results = await Promise.all(deletePromises);

            const successfulDeletes = results.filter(r => r.success).length;

            if (successfulDeletes > 0) {
                toast.success(`${successfulDeletes} product(s) deleted successfully!`);
                fetchProducts(); // <-- Refresh the list after all deletions are done
            }

            // Exit selection mode after operation
            setIsSelectionMode(false);
            setSelectedProducts(new Set());
        }
    };

    const handleCsvSubmit = async (e) => {
        e.preventDefault();
        if (!csvFile) return;
        setIsUploading(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            formData.append('file', csvFile);
            const res = await fetch(`${apiUrl}/api/shop/bulk-upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || `Upload failed (${res.status})`);
            }

            setIsCsvModalOpen(false);
            fetchProducts();
            toast.success('Products added/updated successfully!');
            setCsvFile(null);
        } catch (err) {
            setUploadError(err?.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

   /* // UPDATED: Export should hit a dedicated backend endpoint for efficiency
   const handleExportCSV = async () => {
    if (totalProducts === 0) {
        showAlert("No products to export.");
        return;
    }
    if (!window.confirm(`Export all ${totalProducts} filtered products to CSV?`)) return;

    try {
        // Build request URL
        const url = new URL(`${apiUrl}/api/shop/export/products`);
        if (debouncedSearchTerm) url.searchParams.append("search", debouncedSearchTerm);
        if (sortConfig.key) {
            url.searchParams.append("sort", sortConfig.key);
            url.searchParams.append("dir", sortConfig.direction);
        }

        // Fetch CSV file from backend
        const response = await fetch(url.toString(), {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "text/csv",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Convert response to Blob
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        // Create temporary <a> and trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
        link.setAttribute("download", `Products_Export_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup URL object
        window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
        console.error("Error exporting CSV:", err);
        showAlert("Failed to export products.");
    }
};*/


    const handleExportCSV = async () => {
        if (totalProducts === 0) {
            showAlert("No products to export.");
            return;
        }

        // Confirm with the user
        if (!window.confirm(`Do you want to export all products to CSV?`)) {
            return;
        }

        try {
            // Build request URL - plain, with no payload/params as requested
            const url = `${apiUrl}/api/shop/export/products`;

            // Fetch CSV file from backend
            const response = await fetch(url, {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                // Try to get a more helpful error message
                let errorText = `HTTP error! status: ${response.status}`;
                try {
                    // Assumes backend sends JSON on error, e.g., { message: "..." }
                    const errorData = await response.json();
                    errorText = errorData.message || JSON.stringify(errorData);
                } catch (e) {
                    // Fallback if the error response isn't JSON
                    errorText = await response.text();
                }
                throw new Error(errorText);
            }

            // Convert response bytestream to a Blob
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            // Create temporary <a> and trigger download
            const link = document.createElement("a");
            link.href = downloadUrl;
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

            // Set a descriptive filename
            link.setAttribute("download", `Products_Export_All_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

        } catch (err) {
            console.error("Error exporting CSV:", err);
            showAlert(`Failed to export products: ${err.message}`);
        }
    };


    const handleCsvChange = (e) => {
        const file = e.target.files?.[0] || null;
        setUploadError(null);
        if (file) {
            const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name);
            const maxBytes = 5 * 1024 * 1024; // 5MB
            if (!isCsv) {
                setUploadError('Please select a .csv file.');
            } else if (file.size > maxBytes) {
                setUploadError('File must be 5 MB or less.');
            } else {
                setCsvFile(file);
            }
        } else {
            setCsvFile(null);
        }
    };



    // Column Chooser State (already using localStorage, no changes needed here)


    useEffect(() => {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        const onClick = (e) => {
            if (columnsRef.current && !columnsRef.current.contains(e.target)) {
                setIsColumnsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);
    // UPDATED: Sort handler now just updates state
    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: (prev.key === key && prev.direction === 'asc') ? 'desc' : 'asc'
        }));
        // mark that user has initiated sorting so arrows become visible
        setHasSortActive(true);
    };

    const toggleColumn = (col) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    };
    useEffect(() => {
        return () => {
            setSearchKey('');
        };
    }, [setSearchKey]);
    // --- RENDER LOGIC & JSX ---

    const selectedColsCount = Object.values(visibleColumns).filter(Boolean).length;
    const columnsButtonLabel = selectedColsCount === Object.keys(visibleColumns).length ? 'Columns' : `Columns (${selectedColsCount})`;

    // NEW: Pagination Component
    const Pagination = () => {
        if (totalPages <= 1) return null;

        const getPaginationItems = () => {
            const items = [];
            if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) items.push(i);
                return items;
            }
            items.push(1);
            if (currentPage > 3) items.push('...');
            if (currentPage > 2) items.push(currentPage - 1);
            if (currentPage !== 1 && currentPage !== totalPages) items.push(currentPage);
            if (currentPage < totalPages - 1) items.push(currentPage + 1);
            if (currentPage < totalPages - 2) items.push('...');
            items.push(totalPages);
            return [...new Set(items)];
        };

        return (
            <div className="pagination">

                <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                        &laquo; Prev
                    </button>
                    {getPaginationItems().map((page, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? 'active' : ''}
                            disabled={page === '...'}
                        >
                            {page}
                        </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                        Next &raquo;
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <Toaster position="top-center" toastOptions={{
                duration: 2000,
                style: {
                    background: 'lightgreen',
                    color: 'var(--text-color)',
                    borderRadius: '25px',
                    padding: '12px',
                    width: '3500px',
                    fontSize: '16px',
                },
            }} reverseOrder={false} />
            <h2 style={{paddingBottom:"30px"}}>Products</h2>

            <div className="page-header">

                <div className="actions-toolbar">
                    {/* Group for Search and Selection actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="search-bar"
                            value={searchTerm}
                            style={{ marginBottom: "0px", marginRight: "60px" }}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <button
                            type="button"
                            // Consider using a class like "icon-btn" for specific styling
                            className="btn btn-icon"
                            onClick={handleToggleSelectionMode}
                            title={isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
                            style={{
                                width: '80px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                borderColor: 'var(--primary-color)',
                                boxShadow: '0 0px 0px var(--shadow-color)'
                            }}
                        >
                            {isSelectionMode ? <FaTimes size={18} /> : <i className="fa-duotone fa-solid fa-check-double" style={{paddingLeft:"1px", paddingRight: "3px"}}></i>}
                        </button>

                        {isSelectionMode && selectedProducts.size > 0 && (
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleBulkDelete}
                                style={{ whiteSpace: 'nowrap' }} // Prevents text wrapping
                            >
                                Delete Selected ({selectedProducts.size})
                            </button>
                        )}
                    </div>


                    {/* Group for primary actions */}
                    <div className="actions-group-left">
                        <button type="button" className="btn" onClick={() => setIsModalOpen(true)}><i class="fa-duotone fa-solid fa-grid-2-plus" style={{marginRight: "3px"}}></i>Add Product</button>
                        <PremiumFeature>
                            <button type="button" className="btn" onClick={() => setIsCsvModalOpen(true)}><i className="fa-duotone fa-solid fa-arrow-up-from-square" style={{marginRight: "5px"}}></i>Upload CSV</button>
                        </PremiumFeature>                          <button type="button" className="btn" onClick={handleExportCSV}><i class="fa-duotone fa-solid fa-file-export" style={{marginRight: "5px"}}></i>Export CSV</button>
                       </div>

                    <div ref={columnsRef} className="columns-dropdown-container">
                                 <span
                                role="button"
                                tabIndex={0}
                                onClick={() => setIsColumnsOpen(v => !v)}
                                onKeyDown={(e) => (e.key === 'Enter' ? setIsColumnsOpen(v => !v) : null)}
                                aria-expanded={isColumnsOpen}
                                style={{
                                    background: "white",
                                    color: "var(--primary-color)",
                                    border: "2px solid var(--primary-color-light)",
                                    borderRadius: "18px",
                                    padding: "8px 14px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    fontWeight: 500,
                                    transition: "all 0.3s ease",
                                    userSelect: "none",
                                    marginLeft: "auto", // pushes to the far right
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "var(--primary-color-light)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "white";
                                }}
                            >
                                {columnsButtonLabel} ▾
                            </span>

                        {isColumnsOpen && (
                            <div className="columns-dropdown-menu">
                                <div className="columns-list">
                                    {Object.keys(visibleColumns).map(col => (
                                        <label key={col} className="column-item">
                                            <input
                                                type="checkbox"
                                                className="styled-checkbox"
                                                checked={visibleColumns[col]}
                                                onChange={() => toggleColumn(col)}
                                            />
                                            <span>{col.replace(/([A-Z])/g, ' $1')}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="columns-dropdown-footer">
                                    <button type="button" className="btn small-btn" onClick={() => setVisibleColumns(defaultVisibleColumns)}>Show All</button>
                                    <button type="button" className="btn small-btn" onClick={() => setIsColumnsOpen(false)}>Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>



            <div className="glass-card">
                <table className="data-table">
                    <thead>
                    <tr>
                        {/* --- ADDED: Checkbox column header for selection mode --- */}
                        {isSelectionMode && <th style={{ width: "30px" }}></th>}

                        {visibleColumns.name && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                                Name {hasSortActive && sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.hsn && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('hsn')}>
                                HSN {hasSortActive && sortConfig.key === 'hsn' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.category && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('category')}>
                                Category {hasSortActive && sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.price && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('price')}>
                                Cost Price {hasSortActive && sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.costPrice && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('costPrice')}>
                                Price {hasSortActive && sortConfig.key === 'costPrice' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.tax && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('tax')}>
                                Tax (%) {hasSortActive && sortConfig.key === 'tax' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.stock && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('stock')}>
                                Stock {hasSortActive && sortConfig.key === 'stock' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.status && (
                            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('status')}>
                                Status {hasSortActive && sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                        )}
                        {visibleColumns.actions && <th>Actions</th>}
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan={selectedColsCount + (isSelectionMode ? 1 : 0)} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                    ) : products.length > 0 ? (
                        products.map(product => (
                            <tr
                                key={product.id}
                                onClick={isSelectionMode ? () => handleSelectProduct(product.id) : undefined}
                                style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
                                className={isSelectionMode && selectedProducts.has(product.id) ? 'row-selected' : ''}
                            >
                                {isSelectionMode && (
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="styled-checkbox"
                                            checked={selectedProducts.has(product.id)}
                                            onChange={() => handleSelectProduct(product.id)}
                                        />
                                    </td>
                                )}

                                {visibleColumns.name && <td>{product.name}</td>}
                                {visibleColumns.hsn && <td>{product.hsn}</td>}
                                {visibleColumns.category && <td>{product.category}</td>}
                                {visibleColumns.costPrice && <td>{product.costPrice != null ? `₹${Number(product.costPrice).toLocaleString()}` : '–'}</td>}
                                {visibleColumns.price && <td>₹{product.price.toLocaleString()}</td>}
                                {visibleColumns.tax && <td>{product.tax}</td>}
                                {visibleColumns.stock && <td>{product.stock}</td>}
                                {visibleColumns.status && <td><span className={product.stock > 0 ? 'status-instock' : 'status-outofstock'}>{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span></td>}
                                {visibleColumns.actions && (
                                    <td>
                                        <div className="action-icons">
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(product);
                                }}
                                className="action-icon edit"
                                title="Edit Product"
                            >
                                <i className="fa-duotone fa-solid fa-pen-to-square"></i>
                            </span>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm("Are you sure you want to delete this product?")) {
                                                        handleDeleteProduct(product.id).then(res => res.success && fetchProducts());
                                                    }
                                                }}
                                                className="action-icon delete"
                                                title="Delete Product"
                                            >
                                <i className="fa-duotone fa-solid fa-trash"></i>
                            </span>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={selectedColsCount + (isSelectionMode ? 1 : 0)} style={{ textAlign: 'center', padding: '20px' }}>No products found.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>

            <Pagination />

            {/* --- MODALS (Largely Unchanged) --- */}
            <Modal title="Add New Product" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    {/* Form groups for name, category, costPrice, price, stock, tax */}
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>HSN</label><input type="text"  value={hsn} onChange={e => setHsn(e.target.value)} /></div>

                    <div className="form-group"><label>Category</label><select required value={category} onChange={e => setCategory(e.target.value)}><option value="">-- Select --</option><option>Product</option><option>Services</option><option>Others</option></select></div>
                    <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Stock Quantity</label><input type="number" required value={stock} onChange={e => setStock(e.target.value)} /></div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <select required value={tax} onChange={e => setTax(e.target.value)}>
                            <option value="0">0</option>
                            <option value="5">5</option>
                            <option value="12">12</option>
                            <option value="18">18</option>
                            <option value="28">28</option>
                        </select>
                    </div>                    <div className="form-actions"><button type="submit" className="btn">Add Product</button></div>
                </form>
            </Modal>

            <Modal title="Update Product" show={isUpdateModalOpen} onClose={handleCloseUpdateModal}>
                <form onSubmit={handleUpdateProduct}>
                    {/* Form groups for name, category, costPrice, price, stock, tax */}
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>HSN</label><input type="text"  value={hsn} onChange={e => setHsn(e.target.value)} /></div>

                    <div className="form-group"><label>Category</label><select required value={category} onChange={e => setCategory(e.target.value)}><option value="">-- Select --</option><option>Product</option><option>Services</option><option>Others</option></select></div>


                    <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Stock Quantity</label><input type="number" required value={stock} onChange={e => setStock(e.target.value)} /></div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <select required value={tax} onChange={e => setTax(e.target.value)}>
                            <option value="0">0</option>
                            <option value="5">5</option>
                            <option value="12">12</option>
                            <option value="18">18</option>
                            <option value="28">28</option>

                            {!currentTaxIsStandard && tax != null && tax !== '' && (
                                <option value={tax}>{tax}% (Current)</option>
                            )}
                        </select>
                    </div>                    <div className="form-actions"><button type="submit" className="btn">Update Product</button></div>
                </form>
            </Modal>

            <Modal title="Upload Products via CSV" show={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)}>
                <form onSubmit={handleCsvSubmit}>
                    <div className="form-group">

                        {/* --- NEW: Label with Info Icon --- */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <label style={{ margin: 0, fontWeight: 'bold' }}>CSV file</label>

                            {/* --- REQUEST 2: Info Icon & Tooltip --- */}
                            <div className="info-tooltip-container">
                                <FaInfoCircle style={{ color: 'var(--primary-color)', cursor: 'pointer', fontSize: '1.1rem' }} />
                                <div className="info-tooltip-text">
                                    <ul style={{ margin: 0, paddingLeft: '20px', textAlign: 'left' }}>
                                        <li>Please download the template if you are not sure about the format.</li>
                                        <li>Very Important! If you want to add Product as new, then give selectedProductId as 0</li>
                                        <li>Very Important! If you want to update Product then export the product list, update your inputs and then upload here.</li>
                                        <li>Always use valid numbers for HSN.</li>
                                        <li>Enter 'Product', 'Service' or 'Others' in Category.</li>
                                        <li>Try to keep Cost Price lower than the Selling Price.</li>
                                        <li>Always give valid tax percent (e.g., 0, 5, 12, 18, 28).</li>
                                        <li>If not sure, take a look at the 'Add Product' popup for reference.</li>
                                    </ul>
                                </div>
                            </div>
                            {/* --- End Request 2 --- */}
                        </div>

                        <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} required />
                        {csvFile && (<small>Selected: {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)</small>)}
                        {uploadError && (<div className="error">{uploadError}</div>)}

                        {/* --- REQUEST 1: Download Template Button --- */}
                        <button
                            type="button"
                            className="btn small-btn"
                            onClick={handleDownloadTemplate}
                            style={{
                                marginTop: '15px',

                                alignItems: 'start',
                                gap: '5px',
                                background: 'var(--primary-color-light)',
                                color: 'var(--primary-color)',
                                border: '1px solid var(--primary-color)',
                                width: '30%',        /* Prevents stretching */
                                padding: '6px 12px',  /* Makes it smaller */
                                fontSize: '0.9em'
                            }}
                        >
                            <FaDownload />Template
                        </button>
                        {/* --- End Request 1 --- */}

                        <div className="help-text" style={{marginTop: "15px", fontWeight: "bold", fontSize: "0.9em"}}>
                            Required Headers: selectedProductId, name, hsn, category, costPrice, price, stock, tax.
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: "flex", gap: "10px", marginTop: '25px' }}>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => setIsCsvModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn"
                            disabled={!csvFile || isUploading}
                        >
                            {isUploading ? "Uploading…" : "Upload"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProductsPage;

// Recommended CSS for Pagination and other new elements:
