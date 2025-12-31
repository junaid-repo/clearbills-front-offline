// src/mockData.js



export const mockProducts = [
    { id: 1, name: 'Wireless Mouse', category: 'Electronics', price: 799, stock: 56, status: 'In Stock' },
    { id: 2, name: 'Bluetooth Keyboard', category: 'Electronics', price: 1499, stock: 32, status: 'In Stock' },
    { id: 3, name: 'USB-C Hub', category: 'Accessories', price: 1199, stock: 0, status: 'Out of Stock' },
    { id: 4, name: 'Laptop Stand', category: 'Accessories', price: 899, stock: 112, status: 'In Stock' },
    { id: 5, name: 'HD Webcam', category: 'Electronics', price: 2499, stock: 15, status: 'In Stock' },
    { id: 6, name: 'Office Chair', category: 'Furniture', price: 8999, stock: 0, status: 'Out of Stock' },
    { id: 7, name: 'Desk Lamp', category: 'Furniture', price: 650, stock: 48, status: 'In Stock' },
    { id: 8, name: 'Notebook', category: 'Stationery', price: 150, stock: 250, status: 'In Stock' },
];

export const mockSales = [
    { id: 'INV-2025-001', customer: 'Rohan Sharma', date: '2025-08-15', total: 2298, status: 'Paid', items: [mockProducts[0], mockProducts[1]] },
    { id: 'INV-2025-002', customer: 'Priya Verma', date: '2025-08-14', total: 3398, status: 'Paid', items: [mockProducts[3], mockProducts[4]] },
    { id: 'INV-2025-003', customer: 'Amit Singh', date: '2025-08-14', total: 8999, status: 'Pending', items: [mockProducts[5]] },
    { id: 'INV-2025-004', customer: 'Sneha Patel', date: '2025-08-12', total: 800, status: 'Paid', items: [mockProducts[6], mockProducts[7]] },
];

export const mockCustomers = [
    { id: 1, name: 'Rohan Sharma', email: 'rohan.s@example.com', phone: '9876543210', totalSpent: 12500 },
    { id: 2, name: 'Priya Verma', email: 'priya.v@example.com', phone: '8765432109', totalSpent: 8750 },
    { id: 3, name: 'Amit Singh', email: 'amit.s@example.com', phone: '7654321098', totalSpent: 15200 },
    { id: 4, name: 'Sneha Patel', email: 'sneha.p@example.com', phone: '6543210987', totalSpent: 4300 },
];

export const mockPayments = [
    { id: 'PAY-001', saleId: 'INV-2025-001', date: '2025-08-15', amount: 2298, method: 'Credit Card' },
    { id: 'PAY-002', saleId: 'INV-2025-002', date: '2025-08-14', amount: 3398, method: 'UPI' },
    { id: 'PAY-003', saleId: 'INV-2025-004', date: '2025-08-12', amount: 800, method: 'Cash' },
];