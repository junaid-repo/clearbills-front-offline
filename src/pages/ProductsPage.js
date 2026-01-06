// src/pages/ProductsPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import { useConfig } from "./ConfigProvider";
import { useLocation } from 'react-router-dom';
import { useSearchKey } from '../context/SearchKeyContext';
import toast, { Toaster } from 'react-hot-toast';
import {
    FaInfoCircle, FaDownload, FaTimes, FaChevronDown,
    FaBarcode, FaQrcode
} from 'react-icons/fa';
import { useAlert } from '../context/AlertContext';
import PremiumFeature from '../components/PremiumFeature';

// --- IMPORTS FOR PDF GENERATION ---
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

// --- IMPORT SCANNER ---
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Custom hook to debounce a value.
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
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

    // --- SCANNER STATE ---
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const scannerRef = useRef(null);

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
    const currentTaxIsStandard = standardTaxSlabs.includes(String(tax));

    // CSV Upload State
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Pagination & Caching
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);

    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Selection Mode
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [showGenerateOptions, setShowGenerateOptions] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Column Chooser
    const COLUMN_STORAGE_KEY = 'products_visible_columns_v2';
    const columnsRef = useRef(null);
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const defaultVisibleColumns = {
        id: true, name: true, category: true, hsn: true,
        costPrice: true, price: true, tax: true, stock: true,
        status: true, generateTag: true, actions: true
    };

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

    // Sorting
    const SORT_STORAGE_KEY = 'products_sort_config_v1';
    const [sortConfig, setSortConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(SORT_STORAGE_KEY);
            return saved ? JSON.parse(saved) : { key: 'createdAt', direction: 'desc' };
        } catch (err) {
            return { key: 'createdAt', direction: 'desc' };
        }
    });

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

    useEffect(() => {
        localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortConfig));
    }, [sortConfig]);

    // --- API & DATA HANDLING ---
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    const fetchProducts = useCallback(async () => {
        if (!apiUrl) return;

        const sortKey = sortConfig.key || 'createdAt';
        const sortDir = sortConfig.direction || 'desc';

        setIsLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/withCache/productsList`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', itemsPerPage);
            url.searchParams.append('sort', sortKey);
            url.searchParams.append('dir', sortDir);
            if (debouncedSearchTerm) {
                url.searchParams.append('search', debouncedSearchTerm);
            }

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
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
    }, [apiUrl, currentPage, debouncedSearchTerm, sortConfig, itemsPerPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, sortConfig, itemsPerPage]);

    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key) {
            setSearchTerm(key);
        }
    }, [location.search]);

    const { searchKey, setSearchKey } = useSearchKey();
    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) {
            setSearchTerm(searchKey);
        }
    }, [searchKey]);

    useEffect(() => {
        return () => {
            setSearchKey('');
        };
    }, [setSearchKey]);

    // --- SCANNER LOGIC ---
    useEffect(() => {
        let html5QrCode;

        if (isScannerOpen) {
            // Small delay to ensure Modal DOM is ready
            const timer = setTimeout(() => {
                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 350, height: 210 },
                    aspectRatio: 1.0,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.QR_CODE,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.UPC_A
                    ]
                };

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        // SUCCESS: Stop camera immediately, then handle data
                        html5QrCode.stop().then(() => {
                            html5QrCode.clear();
                            setIsScannerOpen(false);
                            handleScanSuccess(decodedText);
                        }).catch(err => {
                            console.error("Failed to stop after scan", err);
                            setIsScannerOpen(false);
                            handleScanSuccess(decodedText);
                        });
                    },
                    (errorMessage) => {
                        // ignore scan errors
                    }
                ).catch(err => {
                    console.error("Error starting camera", err);
                    toast.error("Could not start camera.");
                    setIsScannerOpen(false);
                });
            }, 100);

            return () => clearTimeout(timer);
        }

        // Cleanup fallback: simple clear if component unmounts
        return () => {
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop().catch(e => console.warn(e));
                    }
                    scannerRef.current.clear();
                } catch (e) { /* ignore */ }
                scannerRef.current = null;
            }
        };
    }, [isScannerOpen]);

    // --- HELPER: Safely stop scanner before closing modal ---
    const handleCloseScanner = () => {
        if (scannerRef.current) {
            // Attempt to stop the scanner
            scannerRef.current.stop()
                .then(() => {
                    // Once stopped, clear and close modal
                    scannerRef.current.clear();
                    setIsScannerOpen(false);
                })
                .catch((err) => {
                    // If error (e.g. wasn't running), force close anyway
                    console.warn("Scanner stop error:", err);
                    setIsScannerOpen(false);
                });
        } else {
            setIsScannerOpen(false);
        }
    };

    const handleScanSuccess = async (decodedText) => {
        toast.loading(`Scanning ${decodedText}...`, { id: 'scanLoader' });
        try {
            const url = new URL(`${apiUrl}/api/shop/get/withCache/productsList`);
            url.searchParams.append('page', 1);
            url.searchParams.append('limit', 1);
            url.searchParams.append('search', decodedText);

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            const result = await response.json();

            toast.dismiss('scanLoader');

            if (result.data && result.data.length > 0) {
                const foundProduct = result.data[0];
                setScannedProduct(foundProduct);
                setIsDetailsModalOpen(true);
                toast.success("Product found!");
            } else {
                toast.error(`Product "${decodedText}" not found.`);
            }

        } catch (error) {
            toast.dismiss('scanLoader');
            toast.error("Error searching for product.");
            console.error(error);
        }
    };

    // --- PDF GENERATION LOGIC ---
    const handleGenerateTags = async (productList, type) => {
        if (!productList || productList.length === 0) return;

        const toastId = toast.loading(`Preparing ${type === 'qr' ? 'QR Codes' : 'Barcodes'} for print...`);

        try {
            const doc = new jsPDF();
            const isQR = type === 'qr';

            let fileName = "Product_Tags";
            if (productList.length === 1) {
                fileName = `${productList[0].name}_tag`;
            } else {
                fileName = `Bulk_${type === 'qr' ? 'QRs' : 'Barcodes'}_${new Date().toISOString().slice(0, 10)}`;
            }

            doc.setProperties({ title: fileName });

            const margin = 10;
            const startX = margin;
            const startY = margin;
            const cardWidth = isQR ? 45 : 50;
            const cardHeight = isQR ? 45 : 30;

            const availableWidth = 210 - (margin * 2);
            const cols = Math.floor(availableWidth / cardWidth);
            const availableHeight = 297 - (margin * 2);

            let xPos = startX;
            let yPos = startY;
            let colCounter = 0;

            for (const product of productList) {
                if (yPos + cardHeight > startY + availableHeight) {
                    doc.addPage();
                    yPos = startY;
                    xPos = startX;
                    colCounter = 0;
                }

                let imgData = '';
                let imgWOnPdf, imgHOnPdf;

                if (isQR) {
                    try {
                        imgData = await QRCode.toDataURL(product.name, { margin: 1, width: 100 });
                        imgWOnPdf = 30;
                        imgHOnPdf = 30;
                    } catch (err) {
                        console.error("QR Error", err);
                    }
                } else {
                    try {
                        const canvas = document.createElement("canvas");
                        JsBarcode(canvas, product.name, {
                            format: "CODE128",
                            displayValue: false,
                            margin: 0,
                            height: 40,
                            width: 2
                        });
                        imgData = canvas.toDataURL("image/png");
                        imgWOnPdf = 40;
                        imgHOnPdf = 15;
                    } catch (err) {
                        console.error("Barcode Error", err);
                    }
                }

                const xImg = xPos + (cardWidth - imgWOnPdf) / 2;
                const yImgOffset = isQR ? (cardHeight - imgHOnPdf) / 2 : 5;
                const yImg = yPos + yImgOffset;

                if (imgData) {
                    doc.addImage(imgData, 'PNG', xImg, yImg, imgWOnPdf, imgHOnPdf);
                }

                doc.setFontSize(8);
                let text = product.name || "";
                const maxChars = isQR ? 18 : 22;
                if (text.length > maxChars) text = text.substring(0, maxChars) + '...';

                const textWidth = doc.getTextWidth(text);
                const xText = xPos + (cardWidth - textWidth) / 2;
                const yText = yImg + imgHOnPdf + 4;

                doc.text(text, xText, yText);

                doc.setDrawColor(230);
                doc.rect(xPos, yPos, cardWidth, cardHeight);

                colCounter++;
                if (colCounter >= cols) {
                    colCounter = 0;
                    xPos = startX;
                    yPos += cardHeight;
                } else {
                    xPos += cardWidth;
                }
            }

            doc.autoPrint();
            const blobUrl = doc.output('bloburl');
            window.open(blobUrl, '_blank');

            toast.dismiss(toastId);
            toast.success("Opened print view");

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.dismiss(toastId);
            toast.error("Failed to generate PDF");
        }
    };

    const handleBulkGenerate = (type) => {
        const selectedObjs = products.filter(p => selectedProducts.has(p.id));
        if (selectedObjs.length > 0) {
            handleGenerateTags(selectedObjs, type);
            setShowGenerateOptions(false);
        } else {
            showAlert("No selected products found in current view.");
        }
    };


    // --- EVENT HANDLERS ---
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

    const handleEditClick = (product) => {
        setSelectedProductId(product.id);
        setName(product.name);
        setHsn(product.hsn);
        setCategory(product.category);
        setPrice(product.price);
        setCostPrice(product.costPrice || "");
        setStock(product.stock);
        setTax(product.tax);
        setIsUpdateModalOpen(true);
    };

    const resetForm = () => {
        setName(""); setHsn(""); setCategory(""); setPrice("");
        setStock(""); setTax(""); setCostPrice(""); setSelectedProductId(null);
    };

    const handleCloseUpdateModal = () => {
        setIsUpdateModalOpen(false);
        resetForm();
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, category, price, costPrice, stock, tax, hsn };
            const response = await fetch(`${apiUrl}/api/shop/create/product`, {
                method: "POST", credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            toast.success('Product added successfully!');
            fetchProducts();
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
                method: "PUT", credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            fetchProducts();
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
                    method: "DELETE", credentials: 'include'
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                toast.error('Product deleted successfully!');
                fetchProducts();
                return { success: true, id };
            } catch (error) {
                console.error("Error deleting product:", error);
                showAlert("Something went wrong while deleting the product.");
            }
        }
    };

    const handleDeleteProductBulk = async (id) => {
        try {
            const response = await fetch(`${apiUrl}/api/shop/product/delete/${id}`, {
                method: "DELETE", credentials: 'include'
            });
            if (!response.ok) throw new Error(`Failed to delete product ID ${id}`);
            return { success: true, id };
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error(`Failed to delete product ID ${id}.`);
            return { success: false, id };
        }
    };

    const handleToggleSelectionMode = () => {
        setIsSelectionMode(prev => !prev);
        setSelectedProducts(new Set());
    };

    const handleSelectProduct = (productId) => {
        setSelectedProducts(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(productId)) { newSelected.delete(productId); }
            else { newSelected.add(productId); }
            return newSelected;
        });
    };

    const isAllVisibleSelected = products.length > 0 && products.every(p => selectedProducts.has(p.id));

    const handleSelectAll = () => {
        const newSelected = new Set(selectedProducts);
        if (isAllVisibleSelected) {
            products.forEach(p => newSelected.delete(p.id));
        } else {
            products.forEach(p => newSelected.add(p.id));
        }
        setSelectedProducts(newSelected);
    };

    const handleBulkDelete = async () => {
        const numSelected = selectedProducts.size;
        if (numSelected === 0) return;

        if (window.confirm(`Are you sure you want to delete ${numSelected} selected product(s)?`)) {
            const deletePromises = Array.from(selectedProducts).map(id => handleDeleteProductBulk(id));
            const results = await Promise.all(deletePromises);
            const successfulDeletes = results.filter(r => r.success).length;

            if (successfulDeletes > 0) {
                toast.success(`${successfulDeletes} product(s) deleted successfully!`);
                fetchProducts();
            }

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
                method: 'POST', credentials: 'include', body: formData,
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

    const handleExportCSV = async () => {
        if (totalProducts === 0) { showAlert("No products to export."); return; }

        if (!window.confirm(`Do you want to export all products to CSV?`)) { return; }

        try {
            const url = `${apiUrl}/api/shop/export/products`;
            const response = await fetch(url, { method: "GET", credentials: "include" });

            if (!response.ok) {
                let errorText = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorText = errorData.message || JSON.stringify(errorData);
                } catch (e) { errorText = await response.text(); }
                throw new Error(errorText);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
            link.setAttribute("download", `Products_Export_All_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
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
            if (!isCsv) { setUploadError('Please select a .csv file.'); }
            else if (file.size > maxBytes) { setUploadError('File must be 5 MB or less.'); }
            else { setCsvFile(file); }
        } else { setCsvFile(null); }
    };

    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: (prev.key === key && prev.direction === 'asc') ? 'desc' : 'asc'
        }));
        setHasSortActive(true);
    };

    const toggleColumn = (col) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    };

    useEffect(() => {
        const onClick = (e) => {
            if (columnsRef.current && !columnsRef.current.contains(e.target)) {
                setIsColumnsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const selectedColsCount = Object.values(visibleColumns).filter(Boolean).length;
    const columnsButtonLabel = selectedColsCount === Object.keys(visibleColumns).length ? 'Columns' : `Columns (${selectedColsCount})`;

    const Pagination = () => {
        if (totalProducts === 0) return null;

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
            <div className="pagination" style={{
                position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', minHeight: '40px'
            }}>
                <div style={{ position: 'absolute', left: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="select-wrapper">Rows:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--primary-color-light)', backgroundColor: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        {[10, 20, 30, 50, 100].map(num => (<option key={num} value={num}>{num}</option>))}
                    </select>
                </div>
                {totalPages > 1 && (
                    <div className="pagination-controls">
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>&laquo; Prev</button>
                        {getPaginationItems().map((page, index) => (
                            <button key={index} onClick={() => typeof page === 'number' && setCurrentPage(page)} className={currentPage === page ? 'active' : ''} disabled={page === '...'} style={page === '...' ? { cursor: 'default', background: 'transparent', border: 'none' } : {}}>{page}</button>
                        ))}
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next &raquo;</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="page-container">
            {/* --- INJECT STYLES FOR SCANNER --- */}
            <style>
                {`
                    /* Hide the library specific anchors usually */
                    #reader__dashboard_section_csr span { display: none !important; }
                    
                    /* Style the Start Scanning button */
                    #html5-qrcode-button-camera-start {
                        background-color: var(--primary-color) !important;
                        color: white !important;
                        border: none !important;
                        padding: 8px 16px !important;
                        border-radius: 6px !important;
                        cursor: pointer !important;
                        font-weight: 500 !important;
                        margin-top: 10px;
                    }

                    /* Style the Stop Scanning button */
                    #html5-qrcode-button-camera-stop {
                        background-color: #e53e3e !important;
                        color: white !important;
                        border: none !important;
                        padding: 8px 16px !important;
                        border-radius: 6px !important;
                        cursor: pointer !important;
                        font-weight: 500 !important;
                        margin-top: 10px;
                    }

                    /* Style the camera selection dropdown */
                    #reader__dashboard_section_csr select {
                        padding: 6px;
                        border-radius: 4px;
                        border: 1px solid #ddd;
                        margin-bottom: 10px;
                        outline: none;
                    }
                `}
            </style>

            <Toaster position="top-center" toastOptions={{
                duration: 2000,
                style: { background: 'lightgreen', color: 'var(--text-color)', borderRadius: '25px', padding: '12px', width: '3500px', fontSize: '16px' },
            }} reverseOrder={false} />
            <h2 style={{ paddingBottom: "30px" }}>Products</h2>

            <div className="page-header">
                <div className="actions-toolbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                        {/* --- SEARCH BAR WITH EMBEDDED SCANNER ICON --- */}
                        <div style={{ position: 'relative', marginRight: "60px", display: 'inline-block' }}>
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="search-bar"
                                value={searchTerm}
                                style={{
                                    marginBottom: "0px",
                                    paddingRight: "40px", // Make space for the icon
                                    width: "250px"
                                }}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span
                                onClick={() => setIsScannerOpen(true)}
                                title="Open QR/Barcode Scanner"
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <i className="fa-duotone fa-barcode-read"></i>
                            </span>
                        </div>

                        <button
                            type="button"
                            className="btn btn-icon"
                            onClick={handleToggleSelectionMode}
                            title={isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
                            style={{
                                width: '80px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderColor: 'var(--primary-color)', boxShadow: '0 0px 0px var(--shadow-color)'
                            }}
                        >
                            {isSelectionMode ? <FaTimes size={18} /> : <i className="fa-duotone fa-solid fa-check-double" style={{ paddingLeft: "1px", paddingRight: "3px" }}></i>}
                        </button>

                        {isSelectionMode && selectedProducts.size > 0 && (
                            <>
                                <button type="button" className="btn btn-danger" onClick={handleBulkDelete} style={{ whiteSpace: 'nowrap' }}>
                                    <i className="fa-duotone fa-solid fa-trash" style={{ marginRight: "5px" }}></i>Delete ({selectedProducts.size})
                                </button>

                                <div style={{ position: 'relative' }}>
                                    <button className="btn" onClick={() => setShowGenerateOptions(!showGenerateOptions)} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <FaBarcode /> Generate Tags <FaChevronDown size={10} />
                                    </button>
                                    {showGenerateOptions && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000, marginTop: '5px', minWidth: '150px', overflow: 'hidden' }}>
                                            <div onClick={() => handleBulkGenerate('qr')} style={{ padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                                <i className="fa-duotone fa-solid fa-qrcode"></i> QR Codes
                                            </div>
                                            <div onClick={() => handleBulkGenerate('barcode')} style={{ padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                                <i className="fa-duotone fa-solid fa-barcode"></i> Barcodes
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="actions-group-left">
                        <button type="button" className="btn" onClick={() => setIsModalOpen(true)}><i className="fa-duotone fa-solid fa-grid-2-plus" style={{ marginRight: "3px" }}></i>Add Product</button>
                        <PremiumFeature>
                            <button type="button" className="btn" onClick={() => setIsCsvModalOpen(true)}><i className="fa-duotone fa-solid fa-arrow-up-from-square" style={{ marginRight: "5px" }}></i>Upload CSV</button>
                        </PremiumFeature>
                        <button type="button" className="btn" onClick={handleExportCSV}><i className="fa-duotone fa-solid fa-file-export" style={{ marginRight: "5px" }}></i>Export CSV</button>
                    </div>

                    <div ref={columnsRef} className="columns-dropdown-container">
                        <span role="button" tabIndex={0} onClick={() => setIsColumnsOpen(v => !v)} onKeyDown={(e) => (e.key === 'Enter' ? setIsColumnsOpen(v => !v) : null)} aria-expanded={isColumnsOpen} style={{ background: "white", color: "var(--primary-color)", border: "2px solid var(--primary-color-light)", borderRadius: "18px", padding: "8px 14px", cursor: "pointer", display: "inline-flex", alignItems: "center", fontWeight: 500, transition: "all 0.3s ease", userSelect: "none", marginLeft: "auto" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-color-light)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}>
                            {columnsButtonLabel} ▾
                        </span>
                        {isColumnsOpen && (
                            <div className="columns-dropdown-menu">
                                <div className="columns-list">
                                    {Object.keys(visibleColumns).map(col => (
                                        <label key={col} className="column-item">
                                            <input type="checkbox" className="styled-checkbox" checked={visibleColumns[col]} onChange={() => toggleColumn(col)} />
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
                        {isSelectionMode && (
                            <th style={{ width: "30px", textAlign: 'center' }}>
                                <input type="checkbox" className="styled-checkbox" checked={isAllVisibleSelected} onChange={handleSelectAll} title="Select/Deselect All Visible" />
                            </th>
                        )}
                        {visibleColumns.name && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>Name {hasSortActive && sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.hsn && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('hsn')}>HSN {hasSortActive && sortConfig.key === 'hsn' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.category && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('category')}>Category {hasSortActive && sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.price && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('price')}>Cost Price {hasSortActive && sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.costPrice && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('costPrice')}>Price {hasSortActive && sortConfig.key === 'costPrice' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.tax && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('tax')}>Tax (%) {hasSortActive && sortConfig.key === 'tax' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.stock && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('stock')}>Stock {hasSortActive && sortConfig.key === 'stock' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.status && (<th style={{ cursor: 'pointer' }} onClick={() => toggleSort('status')}>Status {hasSortActive && sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}
                        {visibleColumns.generateTag && (<th>Generate Tag</th>)}
                        {visibleColumns.actions && <th>Actions</th>}
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan={selectedColsCount + (isSelectionMode ? 1 : 0)} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                    ) : products.length > 0 ? (
                        products.map(product => (
                            <tr key={product.id} onClick={isSelectionMode ? () => handleSelectProduct(product.id) : undefined} style={{ cursor: isSelectionMode ? 'pointer' : 'default' }} className={isSelectionMode && selectedProducts.has(product.id) ? 'row-selected' : ''}>
                                {isSelectionMode && (<td><input type="checkbox" className="styled-checkbox" checked={selectedProducts.has(product.id)} onChange={() => handleSelectProduct(product.id)} /></td>)}
                                {visibleColumns.name && <td>{product.name}</td>}
                                {visibleColumns.hsn && <td>{product.hsn}</td>}
                                {visibleColumns.category && <td>{product.category}</td>}
                                {visibleColumns.costPrice && <td>{product.costPrice != null ? `₹${Number(product.costPrice).toLocaleString()}` : '–'}</td>}
                                {visibleColumns.price && <td>₹{product.price.toLocaleString()}</td>}
                                {visibleColumns.tax && <td>{product.tax}</td>}
                                {visibleColumns.stock && <td>{product.stock}</td>}
                                {visibleColumns.status && <td><span className={product.stock > 0 ? 'status-instock' : 'status-outofstock'}>{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span></td>}
                                {visibleColumns.generateTag && (
                                    <td>
                                        <div className="action-icons">
                                            <span className="action-icon" title="Generate QR Code" onClick={(e) => { e.stopPropagation(); handleGenerateTags([product], 'qr'); }} style={{ cursor: "pointer", borderRadius: "6px", padding: "6px", marginRight: "8px", display: "inline-flex", backgroundColor: "var(--primary-color-light)", alignItems: "center", border: "var(--border-color) solid 1px", justifyContent: "center" }}><i className="fa-duotone fa-solid fa-qrcode"></i></span>
                                            <span className="action-icon" title="Generate Barcode" onClick={(e) => { e.stopPropagation(); handleGenerateTags([product], 'barcode'); }} style={{ cursor: "pointer", borderRadius: "6px", padding: "6px", marginRight: "8px", display: "inline-flex", backgroundColor: "var(--primary-color-light)", alignItems: "center", border: "var(--border-color) solid 1px", justifyContent: "center" }}><i className="fa-duotone fa-solid fa-barcode"></i></span>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.actions && (
                                    <td>
                                        <div className="action-icons">
                                            <span onClick={(e) => { e.stopPropagation(); handleEditClick(product); }} className="action-icon edit" title="Edit Product"><i className="fa-duotone fa-solid fa-pen-to-square"></i></span>
                                            <span onClick={(e) => { e.stopPropagation(); if (window.confirm("Are you sure you want to delete this product?")) { handleDeleteProduct(product.id).then(res => res.success && fetchProducts()); } }} className="action-icon delete" title="Delete Product"><i className="fa-duotone fa-solid fa-trash"></i></span>
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

            {/* --- SCANNER MODAL --- */}
            {/* UPDATED: onClose uses handleCloseScanner */}
            <Modal title="Scan QR / Barcode" show={isScannerOpen} onClose={handleCloseScanner}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
                    <div id="reader" style={{ width: '100%', maxWidth: '500px', minHeight: '300px' }}></div>
                    <p style={{ marginTop: '10px', color: '#666', fontSize: '0.9rem' }}>Align code within the box</p>
                </div>
            </Modal>

            {/* --- PRODUCT DETAILS MODAL (READ-ONLY) --- */}
            <Modal title="Product Details" show={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)}>
                {scannedProduct && (
                    <div style={{ padding: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="detail-item">
                                <label style={{ fontWeight: 'bold', display: 'block', fontSize: '0.85rem', color: '#666' }}>Name</label>
                                <div style={{ fontSize: '1.1rem' }}>{scannedProduct.name}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontWeight: 'bold', display: 'block', fontSize: '0.85rem', color: '#666' }}>Category</label>
                                <div>{scannedProduct.category}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontWeight: 'bold', display: 'block', fontSize: '0.85rem', color: '#666' }}>HSN</label>
                                <div>{scannedProduct.hsn || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontWeight: 'bold', display: 'block', fontSize: '0.85rem', color: '#666' }}>Tax</label>
                                <div>{scannedProduct.tax}%</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontWeight: 'bold', display: 'block', fontSize: '0.85rem', color: '#666' }}>Cost Price</label>
                                <div>₹{scannedProduct.costPrice}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontWeight: 'bold', display: 'block', fontSize: '0.85rem', color: '#666' }}>Selling Price</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{scannedProduct.price}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', background: scannedProduct.stock > 0 ? '#e6fffa' : '#fff5f5', borderRadius: '8px', border: scannedProduct.stock > 0 ? '1px solid #b2f5ea' : '1px solid #fed7d7' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', fontSize: '0.85rem', color: '#666' }}>Stock Status</label>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{scannedProduct.stock} units</span>
                                <span className={scannedProduct.stock > 0 ? 'status-instock' : 'status-outofstock'} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>
                                    {scannedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                 </span>
                            </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                            <button
                                className="btn"
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    handleEditClick(scannedProduct); // Open edit modal
                                }}
                            >
                                <i className="fa-duotone fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button className="btn btn-danger" onClick={() => setIsDetailsModalOpen(false)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* --- EXISTING MODALS (ADD, UPDATE, CSV) --- */}
            <Modal title="Add New Product" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>HSN</label><input type="text" value={hsn} onChange={e => setHsn(e.target.value)} /></div>
                    <div className="form-group"><label>Category</label><select required value={category} onChange={e => setCategory(e.target.value)}><option value="">-- Select --</option><option>Product</option><option>Services</option><option>Others</option></select></div>
                    <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Stock Quantity</label><input type="number" required value={stock} onChange={e => setStock(e.target.value)} /></div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <select required value={tax} onChange={e => setTax(e.target.value)}>
                            <option value="0">0</option><option value="5">5</option><option value="12">12</option><option value="18">18</option><option value="28">28</option>
                        </select>
                    </div>
                    <div className="form-actions"><button type="submit" className="btn">Add Product</button></div>
                </form>
            </Modal>

            <Modal title="Update Product" show={isUpdateModalOpen} onClose={handleCloseUpdateModal}>
                <form onSubmit={handleUpdateProduct}>
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>HSN</label><input type="text" value={hsn} onChange={e => setHsn(e.target.value)} /></div>
                    <div className="form-group"><label>Category</label><select required value={category} onChange={e => setCategory(e.target.value)}><option value="">-- Select --</option><option>Product</option><option>Services</option><option>Others</option></select></div>
                    <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Stock Quantity</label><input type="number" required value={stock} onChange={e => setStock(e.target.value)} /></div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <select required value={tax} onChange={e => setTax(e.target.value)}>
                            <option value="0">0</option><option value="5">5</option><option value="12">12</option><option value="18">18</option><option value="28">28</option>
                            {!currentTaxIsStandard && tax != null && tax !== '' && (<option value={tax}>{tax}% (Current)</option>)}
                        </select>
                    </div>
                    <div className="form-actions"><button type="submit" className="btn">Update Product</button></div>
                </form>
            </Modal>

            <Modal title="Upload Products via CSV" show={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)}>
                <form onSubmit={handleCsvSubmit}>
                    <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <label style={{ margin: 0, fontWeight: 'bold' }}>CSV file</label>
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
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} required />
                        {csvFile && (<small>Selected: {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)</small>)}
                        {uploadError && (<div className="error">{uploadError}</div>)}

                        <button type="button" className="btn small-btn" onClick={handleDownloadTemplate} style={{ marginTop: '15px', alignItems: 'start', gap: '5px', background: 'var(--primary-color-light)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', width: '30%', padding: '6px 12px', fontSize: '0.9em' }}>
                            <FaDownload />Template
                        </button>
                        <div className="help-text" style={{ marginTop: "15px", fontWeight: "bold", fontSize: "0.9em" }}>
                            Required Headers: selectedProductId, name, hsn, category, costPrice, price, stock, tax.
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: "flex", gap: "10px", marginTop: '25px' }}>
                        <button type="button" className="btn btn-danger" onClick={() => setIsCsvModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn" disabled={!csvFile || isUploading}>{isUploading ? "Uploading…" : "Upload"}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProductsPage;