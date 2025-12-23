import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/authenticated-layout';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, Download } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

type Props = {
    user: User;
};

type UserData = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type Kios = {
    id: number;
    nama: string;
};

type Product = {
    id: number;
    nama: string;
    kemasan: string;
    satuan: string | null;
};

type StockKeluar = {
    id: number;
    user_id: number;
    kios_id: number;
    product_id: number;
    quantity: number;
    tanggal: string;
    created_at: string;
    updated_at: string;
    user: UserData;
    kios: Kios;
    product: Product;
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    message: string;
};

export default function StokKeluarDashboard({ user }: Props) {
    const [stockKeluar, setStockKeluar] = useState<StockKeluar[]>([]);
    const [kios, setKios] = useState<Kios[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStockKeluar, setSelectedStockKeluar] = useState<StockKeluar | null>(null);
    const [formData, setFormData] = useState({
        user_id: user.id.toString(),
        kios_id: '',
        product_id: '',
        quantity: '',
        satuan: '',
        tanggal: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedKios, setSelectedKios] = useState<string>('all');

    // Helper untuk mendapatkan CSRF token dengan validasi
    const getCsrfToken = useCallback(() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!token) {
            console.error('CSRF token tidak ditemukan');
        }
        return token || '';
    }, []);

    // Helper untuk refresh CSRF token dari meta tag
    const refreshCsrfToken = useCallback(() => {
        // Token akan otomatis di-refresh oleh Laravel jika session masih valid
        // Kita hanya perlu mengambil ulang dari meta tag
        return getCsrfToken();
    }, [getCsrfToken]);

    // Generate months for select dengan useMemo untuk performa
    const months = useMemo(() => {
        const monthsList = [{ value: 'all', label: 'Semua Bulan' }];
        const currentDate = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            monthsList.push({ value: monthKey, label: monthName });
        }
        return monthsList;
    }, []);

    // Fetch data dari API dengan error handling yang lebih baik
    const fetchStockKeluar = useCallback(async (month?: string, kiosId?: string) => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (kiosId && kiosId !== 'all') {
                params.append('kios_id', kiosId);
            }
            if (month && month !== 'all') {
                params.append('month', month);
            }
            const response = await fetch(`/api/stock-keluar?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                setError('Session telah berakhir. Silakan refresh halaman dan coba lagi.');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Gagal mengambil data stock keluar');
            }

            const result: ApiResponse<StockKeluar[]> = await response.json();
            if (result.success) {
                setStockKeluar(result.data);
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            console.error('Error fetching stock keluar:', err);
        } finally {
            setLoading(false);
        }
    }, [getCsrfToken]);


    // Fetch kios
    const fetchKios = useCallback(async () => {
        try {
            const response = await fetch('/api/kios', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const result: ApiResponse<Kios[]> = await response.json();
                if (result.success) {
                    setKios(result.data);
                }
            }
        } catch (err) {
            console.error('Error fetching kios:', err);
        }
    }, [getCsrfToken]);

    // Fetch products
    const fetchProducts = useCallback(async () => {
        try {
            const response = await fetch('/api/product', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const result: ApiResponse<Product[]> = await response.json();
                if (result.success) {
                    setProducts(result.data);
                }
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    }, [getCsrfToken]);

    // Debounce untuk filter changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
        fetchStockKeluar(
            selectedMonth === 'all' ? undefined : selectedMonth,
            selectedKios === 'all' ? undefined : selectedKios
        );
        }, 300); // Debounce 300ms

        return () => clearTimeout(timeoutId);
    }, [selectedMonth, selectedKios, fetchStockKeluar]);

    // Fetch initial data
    useEffect(() => {
        fetchKios();
        fetchProducts();
    }, [fetchKios, fetchProducts]);

    // Auto-fill satuan when product_id changes
    useEffect(() => {
        if (formData.product_id) {
            const selectedProduct = products.find((p) => p.id.toString() === formData.product_id);
            if (selectedProduct) {
                setFormData((prev) => ({
                    ...prev,
                    satuan: selectedProduct.satuan || '',
                }));
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                satuan: '',
            }));
        }
    }, [formData.product_id, products]);

    // Handle download dengan CSRF token handling
    const handleDownload = useCallback(async () => {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            setError('CSRF token tidak ditemukan. Silakan refresh halaman dan coba lagi.');
            return;
        }

        try {
            const params = new URLSearchParams();
            if (selectedKios && selectedKios !== 'all') {
                params.append('kios_id', selectedKios);
            }
            if (selectedMonth && selectedMonth !== 'all') {
                params.append('month', selectedMonth);
            }
            params.append('download', '1');
            
            const response = await fetch(`/api/stock-keluar/download?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                setError('Session telah berakhir. Silakan refresh halaman dan login kembali.');
                return;
            }

            if (!response.ok) {
                throw new Error('Gagal mengunduh data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'stock-keluar.xlsx'
                : 'stock-keluar.xlsx';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunduh');
            console.error('Error downloading stock keluar:', err);
        }
    }, [selectedKios, selectedMonth, getCsrfToken]);

    // Memoize grouped products untuk performa
    const groupedProducts = useMemo(() => {
        return products.reduce((acc, product) => {
        if (!acc[product.nama]) {
            acc[product.nama] = [];
        }
        acc[product.nama].push(product);
        return acc;
    }, {} as Record<string, Product[]>);
    }, [products]);

    // Memoize table rows untuk performa - setiap baris ditampilkan terpisah
    const tableRows = useMemo(() => {
        // Langsung map dari stockKeluar tanpa grouping
        return stockKeluar.map((item) => ({
            item,
        }));
    }, [stockKeluar]);

    // Validasi client-side yang lebih detail
    const validateForm = useCallback((): Record<string, string> => {
        const errors: Record<string, string> = {};

        // Validasi Kios
        if (!formData.kios_id || formData.kios_id.trim() === '') {
            errors.kios_id = 'Kios harus dipilih';
        } else if (!kios.find(k => k.id.toString() === formData.kios_id)) {
            errors.kios_id = 'Kios yang dipilih tidak valid';
        }

        // Validasi Product
        if (!formData.product_id || formData.product_id.trim() === '') {
            errors.product_id = 'Barang harus dipilih';
        } else if (!products.find(p => p.id.toString() === formData.product_id)) {
            errors.product_id = 'Barang yang dipilih tidak valid';
        }

        // Validasi Quantity
        const quantityStr = formData.quantity.trim();
        if (!quantityStr) {
            errors.quantity = 'Jumlah harus diisi';
        } else {
            // Cek apakah mengandung karakter non-digit (kecuali tanda minus di awal)
            if (!/^-?\d+$/.test(quantityStr)) {
                errors.quantity = 'Jumlah harus berupa bilangan bulat';
            } else {
                const quantity = parseInt(quantityStr, 10);
                if (isNaN(quantity)) {
                    errors.quantity = 'Jumlah harus berupa angka';
                } else if (quantity < 1) {
                    errors.quantity = 'Jumlah harus lebih dari 0';
                } else if (quantity > 999999) {
                    errors.quantity = 'Jumlah tidak boleh lebih dari 999.999';
        }
            }
        }

        // Validasi Tanggal
        if (!formData.tanggal || formData.tanggal.trim() === '') {
            errors.tanggal = 'Tanggal harus diisi';
        } else {
            const selectedDate = new Date(formData.tanggal);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today

            if (isNaN(selectedDate.getTime())) {
                errors.tanggal = 'Format tanggal tidak valid';
            } else if (selectedDate > today) {
                errors.tanggal = 'Tanggal tidak boleh di masa depan';
            }
        }

        return errors;
    }, [formData, kios, products]);

    // Handle create/edit dengan CSRF token handling yang lebih baik
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFieldErrors({});
        setError(null);

        // Validasi client-side
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setIsSubmitting(false);
            return;
        }

        // Validasi CSRF token sebelum submit
        let csrfToken = getCsrfToken();
        if (!csrfToken) {
            setError('CSRF token tidak ditemukan. Silakan refresh halaman dan coba lagi.');
            setIsSubmitting(false);
            return;
        }

        try {
            const url = selectedStockKeluar ? `/api/stock-keluar/${selectedStockKeluar.id}` : '/api/stock-keluar';
            const method = selectedStockKeluar ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: parseInt(formData.user_id, 10),
                    kios_id: parseInt(formData.kios_id, 10),
                    product_id: parseInt(formData.product_id, 10),
                    quantity: parseInt(formData.quantity, 10),
                    tanggal: formData.tanggal,
                }),
            });

            // Handle CSRF token mismatch (419)
            if (response.status === 419) {
                // Try to refresh token and retry once
                const newToken = refreshCsrfToken();
                if (!newToken) {
                    setError('Session telah berakhir. Silakan refresh halaman dan login kembali.');
                    setIsSubmitting(false);
                    return;
                }

                // Retry dengan token baru
                const retryResponse = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': newToken,
                        'Accept': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        user_id: parseInt(formData.user_id, 10),
                        kios_id: parseInt(formData.kios_id, 10),
                        product_id: parseInt(formData.product_id, 10),
                        quantity: parseInt(formData.quantity, 10),
                        tanggal: formData.tanggal,
                    }),
                });

                if (!retryResponse.ok) {
                    const errorData = await retryResponse.json().catch(() => ({}));
                    if (retryResponse.status === 419) {
                        setError('Session telah berakhir. Silakan refresh halaman dan login kembali.');
                    } else if (errorData.errors) {
                        const errors: Record<string, string> = {};
                        Object.keys(errorData.errors).forEach((key) => {
                            const errorMessages = errorData.errors[key];
                            errors[key] = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
                        });
                        setFieldErrors(errors);
                        const errorMessages = Object.values(errorData.errors).flat();
                        setError(errorMessages.join(', ') || errorData.message || 'Gagal menyimpan data');
                    } else {
                        setError(errorData.message || 'Gagal menyimpan data. Silakan coba lagi.');
                    }
                    setIsSubmitting(false);
                    return;
                }

                const result: ApiResponse<StockKeluar> = await retryResponse.json();
                if (result.success) {
                    setIsDialogOpen(false);
                    setFormData({
                        user_id: user.id.toString(),
                        kios_id: '',
                        product_id: '',
                        quantity: '',
                        tanggal: new Date().toISOString().split('T')[0],
                    });
                    setFieldErrors({});
                    setSelectedStockKeluar(null);
                    await fetchStockKeluar(
                        selectedMonth === 'all' ? undefined : selectedMonth,
                        selectedKios === 'all' ? undefined : selectedKios
                    );
                }
                setIsSubmitting(false);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // Handle validation errors
                if (errorData.errors) {
                    const errors: Record<string, string> = {};
                    Object.keys(errorData.errors).forEach((key) => {
                        const errorMessages = errorData.errors[key];
                        errors[key] = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
                    });
                    setFieldErrors(errors);
                    const errorMessages = Object.values(errorData.errors).flat();
                    setError(errorMessages.join(', ') || errorData.message || 'Gagal menyimpan data');
                } else {
                    setError(errorData.message || 'Gagal menyimpan data. Silakan coba lagi.');
                }
                setIsSubmitting(false);
                    return;
            }

            const result: ApiResponse<StockKeluar> = await response.json();
            if (result.success) {
                setIsDialogOpen(false);
                setFormData({
                    user_id: user.id.toString(),
                    kios_id: '',
                    product_id: '',
                    quantity: '',
                    satuan: '',
                    tanggal: new Date().toISOString().split('T')[0],
                });
                setFieldErrors({});
                setSelectedStockKeluar(null);
                await fetchStockKeluar(
                    selectedMonth === 'all' ? undefined : selectedMonth,
                    selectedKios === 'all' ? undefined : selectedKios
                );
            }
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('fetch')) {
                setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
            } else {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan');
            }
            console.error('Error saving stock keluar:', err);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, selectedStockKeluar, user.id, validateForm, getCsrfToken, refreshCsrfToken, fetchStockKeluar, selectedMonth, selectedKios]);

    // Handle delete dengan CSRF token handling
    const handleDelete = useCallback(async () => {
        if (!deleteId) return;

        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            setError('CSRF token tidak ditemukan. Silakan refresh halaman dan coba lagi.');
            return;
        }

        try {
            const response = await fetch(`/api/stock-keluar/${deleteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                setError('Session telah berakhir. Silakan refresh halaman dan login kembali.');
                setIsDeleteDialogOpen(false);
                setDeleteId(null);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Gagal menghapus data');
            }

            const result: ApiResponse<null> = await response.json();
            if (result.success) {
                setIsDeleteDialogOpen(false);
                setDeleteId(null);
                await fetchStockKeluar(
                    selectedMonth === 'all' ? undefined : selectedMonth,
                    selectedKios === 'all' ? undefined : selectedKios
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus');
            console.error('Error deleting stock keluar:', err);
        }
    }, [deleteId, getCsrfToken, fetchStockKeluar, selectedMonth, selectedKios]);

    // Handle edit dengan useCallback untuk performa
    const handleEdit = useCallback((item: StockKeluar) => {
        setSelectedStockKeluar(item);
        setFormData({
            user_id: user.id.toString(),
            kios_id: item.kios_id.toString(),
            product_id: item.product_id.toString(),
            quantity: item.quantity.toString(),
            satuan: item.product.satuan || '',
            tanggal: item.tanggal.split('T')[0],
        });
        setFieldErrors({});
        setError(null);
        setIsDialogOpen(true);
    }, [user.id]);

    // Handle add new dengan useCallback untuk performa
    const handleAddNew = useCallback(() => {
        setSelectedStockKeluar(null);
        setFormData({
            user_id: user.id.toString(),
            kios_id: '',
            product_id: '',
            quantity: '',
            tanggal: new Date().toISOString().split('T')[0],
        });
        setFieldErrors({});
        setError(null);
        setIsDialogOpen(true);
    }, [user.id]);

    // Clear field error when field changes dengan useCallback
    const handleFieldChange = useCallback((field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [fieldErrors]);

    return (
        <>
            <Head title="Stock Keluar" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-4 shadow-md dark:bg-gray-800 md:p-6">
                    <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold md:text-2xl">Stock Keluar</h1>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Kelola dan catat barang keluar dari gudang.
                            </p>
                        </div>
                        {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                            <Button onClick={handleAddNew} className="flex items-center gap-2 cursor-pointer w-full sm:w-auto">
                                <Plus className="h-4 w-4" />
                                Tambah Stock Keluar
                            </Button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Filter */}
                    <Card className="mb-4 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Label htmlFor="kios">Filter Kios</Label>
                                <Select value={selectedKios} onValueChange={setSelectedKios}>
                                    <SelectTrigger id="kios">
                                        <SelectValue placeholder="Pilih Kios" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kios</SelectItem>
                                        {kios.map((k) => (
                                            <SelectItem key={k.id} value={k.id.toString()}>
                                                {k.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="month">Filter Bulan</Label>
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger id="month">
                                        <SelectValue placeholder="Pilih Bulan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((month) => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleDownload}
                                className="flex items-center gap-2 w-full sm:w-auto cursor-pointer"
                            >
                                <Download className="h-4 w-4" />
                                Download Excel
                            </Button>
                        </div>
                    </Card>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[150px]">NAMA FA</TableHead>
                                        <TableHead className="min-w-[150px]">NAMA KIOS</TableHead>
                                        <TableHead className="min-w-[200px]">BARANG KELUAR</TableHead>
                                        <TableHead className="min-w-[120px]">JUMLAH (PCS)</TableHead>
                                        <TableHead className="min-w-[100px]">SATUAN</TableHead>
                                        <TableHead className="min-w-[150px]">TANGGAL BARANG KELUAR</TableHead>
                                        {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                                            <TableHead className="min-w-[100px]">Aksi</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableRows.map((row) => (
                                        <TableRow key={row.item.id}>
                                            <TableCell className="align-top font-medium">
                                                {row.item.user.name}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                {row.item.kios.nama}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div>
                                                    <div className="font-medium">{row.item.product.nama}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {row.item.product.kemasan}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">{row.item.quantity}</TableCell>
                                            <TableCell className="align-top">{row.item.product.satuan || '-'}</TableCell>
                                            <TableCell className="align-top">
                                                {new Date(row.item.tanggal).toLocaleDateString('id-ID', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </TableCell>
                                            {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                                                <TableCell className="align-top">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(row.item)}
                                                            className="h-8 w-8 p-0 cursor-pointer"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setDeleteId(row.item.id);
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 cursor-pointer"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                    {stockKeluar.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={user.role === 'Field Assistant' || user.role === 'Assistant Area Manager' ? 7 : 6} className="text-center py-8 text-gray-500">
                                                Tidak ada data stock keluar
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            </div>
                        </div>
                    )}

                    {/* Dialog untuk Add/Edit */}
                    <Dialog
                        open={isDialogOpen}
                        onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) {
                                setFieldErrors({});
                                setError(null);
                            }
                        }}
                    >
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedStockKeluar ? 'Edit Stock Keluar' : 'Tambah Stock Keluar'}
                                </DialogTitle>
                                <DialogDescription>
                                    {selectedStockKeluar
                                        ? 'Ubah informasi stock keluar di bawah ini.'
                                        : 'Isi informasi stock keluar di bawah ini.'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                        {error}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="user_name">NAMA FA *</Label>
                                        <Input
                                            id="user_name"
                                            type="text"
                                            value={user.name}
                                            readOnly
                                            className="bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                                        />
                                        <input type="hidden" name="user_id" value={formData.user_id} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="kios_id">NAMA KIOS *</Label>
                                        <select
                                            id="kios_id"
                                            value={formData.kios_id}
                                            onChange={(e) => handleFieldChange('kios_id', e.target.value)}
                                            className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                                fieldErrors.kios_id
                                                    ? 'border-red-500 focus-visible:ring-red-500'
                                                    : 'border-input'
                                            }`}
                                            required
                                        >
                                            <option value="">Pilih Kios</option>
                                            {kios.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.nama}
                                                </option>
                                            ))}
                                        </select>
                                        {fieldErrors.kios_id && (
                                            <p className="text-sm text-red-600 dark:text-red-400">
                                                {fieldErrors.kios_id}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="product_id">BARANG KELUAR *</Label>
                                    <select
                                        id="product_id"
                                        value={formData.product_id}
                                        onChange={(e) => handleFieldChange('product_id', e.target.value)}
                                        className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                            fieldErrors.product_id
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : 'border-input'
                                        }`}
                                        required
                                    >
                                        <option value="">Pilih Barang</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nama} - {p.kemasan}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.product_id && (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {fieldErrors.product_id}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">JUMLAH (PCS) *</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={(e) => handleFieldChange('quantity', e.target.value)}
                                            className={fieldErrors.quantity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            required
                                        />
                                        {fieldErrors.quantity && (
                                            <p className="text-sm text-red-600 dark:text-red-400">
                                                {fieldErrors.quantity}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="satuan">SATUAN</Label>
                                        <Input
                                            id="satuan"
                                            type="text"
                                            value={formData.satuan}
                                            readOnly
                                            className="cursor-not-allowed bg-gray-50 dark:bg-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tanggal">TANGGAL BARANG KELUAR *</Label>
                                    <Input
                                        id="tanggal"
                                        type="date"
                                        value={formData.tanggal}
                                        onChange={(e) => handleFieldChange('tanggal', e.target.value)}
                                        className={fieldErrors.tanggal ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        required
                                    />
                                    {fieldErrors.tanggal && (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {fieldErrors.tanggal}
                                        </p>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsDialogOpen(false);
                                            setFieldErrors({});
                                            setError(null);
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            'Simpan'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Dialog untuk Delete */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Hapus Stock Keluar</DialogTitle>
                                <DialogDescription>
                                    Apakah Anda yakin ingin menghapus data stock keluar ini? Tindakan ini tidak dapat
                                    dibatalkan.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setDeleteId(null);
                                    }}
                                >
                                    Batal
                                </Button>
                                <Button variant="destructive" onClick={handleDelete}>
                                    Hapus
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
