import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import { Download, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '../../../layouts/authenticated-layout';

type Props = {
    user: User;
};

type UserData = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type FA = {
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

type QtyKemasan = {
    id: number;
    qty_kemasan: number;
};

type StockKeluar = {
    id: number;
    user_id: number;
    kios_id: number;
    product_id: number;
    qty_kemasan_id: number | null;
    quantity: number;
    liter_or_kg: string | null;
    tanggal: string;
    created_at: string;
    updated_at: string;
    user: UserData;
    kios: Kios;
    product: Product;
    qty_kemasan: QtyKemasan | null;
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
    const [users, setUsers] = useState<FA[]>([]);
    const [qtyKemasan, setQtyKemasan] = useState<QtyKemasan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStockKeluar, setSelectedStockKeluar] = useState<StockKeluar | null>(null);
    const [formData, setFormData] = useState({
        user_id: user.id.toString(),
        kios_id: '',
        product_id: '',
        qty_kemasan_id: '',
        quantity: '',
        liter_or_kg: '',
        tanggal: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [selectedKios, setSelectedKios] = useState<string>('all');
    const [selectedFA, setSelectedFA] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

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

    // Fetch data dari API dengan error handling yang lebih baik
    const fetchStockKeluar = useCallback(
        async (kiosId?: string, userId?: string, startDate?: string, endDate?: string) => {
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams();
                if (kiosId && kiosId !== 'all') {
                    params.append('kios_id', kiosId);
                }
                if (userId && userId !== 'all') {
                    params.append('user_id', userId);
                }
                if (startDate) {
                    params.append('start_date', startDate);
                }
                if (endDate) {
                    params.append('end_date', endDate);
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
        },
        [getCsrfToken],
    );

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
                selectedKios === 'all' ? undefined : selectedKios,
                user.role === 'Assistant Area Manager' && selectedFA !== 'all' ? selectedFA : undefined,
                startDate || undefined,
                endDate || undefined,
            );
        }, 300); // Debounce 300ms

        return () => clearTimeout(timeoutId);
    }, [selectedKios, selectedFA, startDate, endDate, fetchStockKeluar, user.role]);

    // Fetch qty kemasan
    const fetchQtyKemasan = useCallback(async () => {
        try {
            const csrfToken = getCsrfToken();
            const response = await fetch('/api/qty-kemasan', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                console.error('CSRF token mismatch saat mengambil data qty kemasan');
                return;
            }

            if (response.ok) {
                try {
                    const result: ApiResponse<QtyKemasan[]> = await response.json();
                    if (result.success) {
                        setQtyKemasan(result.data);
                    }
                } catch (parseError) {
                    console.error('Error parsing qty kemasan response:', parseError);
                }
            }
        } catch (err) {
            console.error('Error fetching qty kemasan:', err);
        }
    }, [getCsrfToken]);

    // Fetch users (FA) - hanya untuk Assistant Area Manager
    const fetchUsers = useCallback(async () => {
        if (user.role !== 'Assistant Area Manager') {
            return; // Field Assistant tidak perlu fetch users
        }

        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                console.error('CSRF token tidak ditemukan');
                return;
            }

            const response = await fetch('/api/petugas/dropdown', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                console.error('CSRF token mismatch saat mengambil data users');
                return;
            }

            if (!response.ok) {
                // Jangan log error untuk 404 - route mungkin belum terdaftar atau ada masalah dengan middleware
                if (response.status !== 404) {
                    console.error('Error fetching users:', response.status, response.statusText);
                }
                return;
            }

            try {
                const result: ApiResponse<FA[]> = await response.json();
                if (result.success) {
                    setUsers(result.data);
                } else {
                    console.warn('Failed to fetch users:', result.message);
                }
            } catch (parseError) {
                console.error('Error parsing users response:', parseError);
            }
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('fetch')) {
                console.warn('Network error saat mengambil data users');
            } else {
                console.error('Error fetching users:', err);
            }
        }
    }, [getCsrfToken, user.role]);

    // Fetch initial data (kios, products, qty kemasan, users) - hanya sekali saat mount
    useEffect(() => {
        fetchKios();
        fetchProducts();
        fetchQtyKemasan();
        if (user.role === 'Assistant Area Manager') {
            fetchUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate liter automatically based on qty_kemasan and quantity
    const calculateLiter = (qtyKemasanId: string, quantity: string): string => {
        if (!qtyKemasanId || !quantity) {
            return '';
        }

        const qtyKemasanValue = qtyKemasan.find((qk) => qk.id.toString() === qtyKemasanId);
        if (!qtyKemasanValue) {
            return '';
        }

        const qtyKemasanNum = qtyKemasanValue.qty_kemasan;
        const quantityNum = parseFloat(quantity);

        if (isNaN(quantityNum) || quantityNum <= 0) {
            return '';
        }

        const liter = (qtyKemasanNum * quantityNum) / 1000;

        // Format: hapus trailing zero dan desimal yang tidak perlu
        // Contoh: 1.000 -> 1, 1.500 -> 1.5, 0.500 -> 0.5
        const formattedLiter = liter % 1 === 0 ? liter.toString() : parseFloat(liter.toFixed(3)).toString();

        return `${formattedLiter} Liter`;
    };

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
            if (user.role === 'Assistant Area Manager' && selectedFA && selectedFA !== 'all') {
                params.append('user_id', selectedFA);
            }
            if (startDate) {
                params.append('start_date', startDate);
            }
            if (endDate) {
                params.append('end_date', endDate);
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
    }, [selectedKios, startDate, endDate, getCsrfToken]);

    // Memoize grouped products untuk performa
    const groupedProducts = useMemo(() => {
        return products.reduce(
            (acc, product) => {
                if (!acc[product.nama]) {
                    acc[product.nama] = [];
                }
                acc[product.nama].push(product);
                return acc;
            },
            {} as Record<string, Product[]>,
        );
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
        } else if (!kios.find((k) => k.id.toString() === formData.kios_id)) {
            errors.kios_id = 'Kios yang dipilih tidak valid';
        }

        // Validasi Product
        if (!formData.product_id || formData.product_id.trim() === '') {
            errors.product_id = 'Barang harus dipilih';
        } else if (!products.find((p) => p.id.toString() === formData.product_id)) {
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
    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
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

                let response;
                try {
                    response = await fetch(url, {
                        method,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRF-TOKEN': csrfToken,
                            Accept: 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            user_id: parseInt(formData.user_id, 10),
                            kios_id: parseInt(formData.kios_id, 10),
                            product_id: parseInt(formData.product_id, 10),
                            qty_kemasan_id: formData.qty_kemasan_id ? parseInt(formData.qty_kemasan_id, 10) : null,
                            quantity: parseInt(formData.quantity, 10),
                            liter_or_kg: formData.liter_or_kg || null,
                            tanggal: formData.tanggal,
                        }),
                    });
                } catch (fetchError) {
                    // Handle network errors, but don't log 422 as unhandled
                    if (fetchError && fetchError.message && fetchError.message.includes('422')) {
                        // Create a mock 422 response
                        response = {
                            ok: false,
                            status: 422,
                            json: async () => ({ success: false, errors: {}, message: 'Validation error' }),
                            statusText: 'Unprocessable Content',
                        } as Response;
                    } else {
                        throw fetchError;
                    }
                }

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
                            Accept: 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            user_id: parseInt(formData.user_id, 10),
                            kios_id: parseInt(formData.kios_id, 10),
                            product_id: parseInt(formData.product_id, 10),
                            qty_kemasan_id: formData.qty_kemasan_id ? parseInt(formData.qty_kemasan_id, 10) : null,
                            quantity: parseInt(formData.quantity, 10),
                            liter_or_kg: formData.liter_or_kg || null,
                            tanggal: formData.tanggal,
                        }),
                    });

                    if (!retryResponse.ok) {
                        const errorData = await retryResponse.json().catch(() => ({}));
                        if (retryResponse.status === 419) {
                            setError('Session telah berakhir. Silakan refresh halaman dan login kembali.');
                        } else if (retryResponse.status === 422 || errorData.errors) {
                            // Handle validation errors (422) - don't log to console
                            const errors: Record<string, string> = {};
                            if (errorData.errors) {
                                Object.keys(errorData.errors).forEach((key) => {
                                    const errorMessages = errorData.errors[key];
                                    errors[key] = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
                                });
                            }
                            setFieldErrors(errors);
                            const errorMessages = errorData.errors
                                ? Object.values(errorData.errors).flat().join(', ')
                                : errorData.message || 'Data yang dimasukkan tidak valid. Silakan periksa kembali.';
                            setError(errorMessages);
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
                            qty_kemasan_id: '',
                            quantity: '',
                            liter_or_kg: '',
                            tanggal: new Date().toISOString().split('T')[0],
                        });
                        setFieldErrors({});
                        setSelectedStockKeluar(null);
                        await fetchStockKeluar(selectedKios === 'all' ? undefined : selectedKios, startDate || undefined, endDate || undefined);
                    }
                    setIsSubmitting(false);
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));

                    // Handle validation errors (422) - don't log to console as it's handled in UI
                    if (response.status === 422 || errorData.errors) {
                        const errors: Record<string, string> = {};
                        if (errorData.errors) {
                            Object.keys(errorData.errors).forEach((key) => {
                                const errorMessages = errorData.errors[key];
                                errors[key] = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
                            });
                        }
                        setFieldErrors(errors);
                        const errorMessages = errorData.errors
                            ? Object.values(errorData.errors).flat().join(', ')
                            : errorData.message || 'Data yang dimasukkan tidak valid. Silakan periksa kembali.';
                        setError(errorMessages);
                        // Don't log 422 errors to console as they're validation errors handled in UI
                        setIsSubmitting(false);
                        return;
                    } else {
                        setError(errorData.message || `Gagal menyimpan data (${response.status}). Silakan coba lagi.`);
                        // Only log non-422 errors in development
                        if (process.env.NODE_ENV === 'development' && response.status !== 422) {
                            console.error('Error saving stock keluar:', errorData);
                        }
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
                        selectedKios === 'all' ? undefined : selectedKios,
                        user.role === 'Assistant Area Manager' && selectedFA !== 'all' ? selectedFA : undefined,
                        startDate || undefined,
                        endDate || undefined,
                    );
                }
            } catch (err) {
                if (err instanceof TypeError && err.message.includes('fetch')) {
                    setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
                } else {
                    setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan');
                }
                // Don't log errors to console - they're handled in UI
            } finally {
                setIsSubmitting(false);
            }
        },
        [
            formData,
            selectedStockKeluar,
            user.id,
            user.role,
            validateForm,
            getCsrfToken,
            refreshCsrfToken,
            fetchStockKeluar,
            selectedKios,
            selectedFA,
            startDate,
            endDate,
        ],
    );

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
                    Accept: 'application/json',
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
                    selectedKios === 'all' ? undefined : selectedKios,
                    user.role === 'Assistant Area Manager' && selectedFA !== 'all' ? selectedFA : undefined,
                    startDate || undefined,
                    endDate || undefined,
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus');
            console.error('Error deleting stock keluar:', err);
        }
    }, [deleteId, getCsrfToken, fetchStockKeluar, selectedKios, selectedFA, startDate, endDate, user.role]);

    // Handle edit dengan useCallback untuk performa
    const handleEdit = useCallback(
        (item: StockKeluar) => {
            setSelectedStockKeluar(item);
            const qtyKemasanId = item.qty_kemasan_id ? item.qty_kemasan_id.toString() : '';
            const quantity = item.quantity.toString();
            // Calculate liter if qty_kemasan_id exists, otherwise use existing liter_or_kg
            let calculatedLiter = item.liter_or_kg || '';
            if (qtyKemasanId && quantity) {
                calculatedLiter = calculateLiter(qtyKemasanId, quantity);
            }

            setFormData({
                user_id: user.id.toString(),
                kios_id: item.kios_id.toString(),
                product_id: item.product_id.toString(),
                qty_kemasan_id: qtyKemasanId,
                quantity: quantity,
                liter_or_kg: calculatedLiter,
                tanggal: item.tanggal.split('T')[0],
            });
            setFieldErrors({});
            setError(null);
            setIsDialogOpen(true);
        },
        [user.id, qtyKemasan, calculateLiter],
    );

    // Handle add new dengan useCallback untuk performa
    const handleAddNew = useCallback(() => {
        setSelectedStockKeluar(null);
        setFormData({
            user_id: user.id.toString(),
            kios_id: '',
            product_id: '',
            qty_kemasan_id: '',
            quantity: '',
            liter_or_kg: '',
            tanggal: new Date().toISOString().split('T')[0],
        });
        setFieldErrors({});
        setError(null);
        setIsDialogOpen(true);
    }, [user.id]);

    // Clear field error when field changes dengan useCallback
    const handleFieldChange = useCallback(
        (field: string, value: string) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
            if (fieldErrors[field]) {
                setFieldErrors((prev) => ({ ...prev, [field]: '' }));
            }
        },
        [fieldErrors],
    );

    return (
        <>
            <Head title="Stock Keluar" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-4 shadow-md md:p-6 dark:bg-gray-800">
                    <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold md:text-2xl">Stock Keluar</h1>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Kelola dan catat barang keluar dari gudang.</p>
                        </div>
                        {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                            <Button onClick={handleAddNew} className="flex w-full cursor-pointer items-center gap-2 sm:w-auto">
                                <Plus className="h-4 w-4" />
                                Tambah Stock Keluar
                            </Button>
                        )}
                    </div>

                    {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

                    {/* Filter */}
                    <Card className="mb-4 p-3 sm:p-4">
                        <div
                            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${user.role === 'Assistant Area Manager' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} sm:gap-4`}
                        >
                            {user.role === 'Assistant Area Manager' && (
                                <div className="w-full">
                                    <Label htmlFor="fa" className="text-xs sm:text-sm">
                                        Filter Nama FA
                                    </Label>
                                    <Select value={selectedFA} onValueChange={(value) => setSelectedFA(value)}>
                                        <SelectTrigger id="fa" className="h-9 text-xs sm:text-sm">
                                            <SelectValue placeholder="Pilih FA" />
                                        </SelectTrigger>
                                        <SelectContent side="bottom">
                                            <SelectItem value="all">Semua FA</SelectItem>
                                            {users.map((u) => (
                                                <SelectItem key={u.id} value={u.id.toString()}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="w-full">
                                <Label htmlFor="kios" className="text-xs sm:text-sm">
                                    Filter Kios
                                </Label>
                                <Select value={selectedKios} onValueChange={(value) => setSelectedKios(value)}>
                                    <SelectTrigger id="kios" className="h-9 text-xs sm:text-sm">
                                        <SelectValue placeholder="Pilih Kios" />
                                    </SelectTrigger>
                                    <SelectContent side="bottom">
                                        <SelectItem value="all">Semua Kios</SelectItem>
                                        {kios.map((k) => (
                                            <SelectItem key={k.id} value={k.id.toString()}>
                                                {k.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full">
                                <Label htmlFor="start_date" className="text-xs sm:text-sm">
                                    Filter Start Date (Periode)
                                </Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-9 text-xs sm:text-sm"
                                />
                            </div>
                            <div className="w-full">
                                <Label htmlFor="end_date" className="text-xs sm:text-sm">
                                    Filter End Date (Periode)
                                </Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-9 text-xs sm:text-sm"
                                />
                            </div>
                            <div className="flex w-full items-end">
                                <Button
                                    variant="outline"
                                    onClick={handleDownload}
                                    className="flex h-9 w-full cursor-pointer items-center gap-2 text-xs sm:text-sm"
                                >
                                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Download Excel</span>
                                    <span className="sm:hidden">Download</span>
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="-mx-2 w-full overflow-x-auto sm:-mx-4 md:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[120px] text-xs sm:min-w-[150px] sm:text-sm">NAMA FA</TableHead>
                                            <TableHead className="min-w-[120px] text-xs sm:min-w-[150px] sm:text-sm">NAMA KIOS</TableHead>
                                            <TableHead className="min-w-[150px] text-xs sm:min-w-[200px] sm:text-sm">BARANG KELUAR</TableHead>
                                            <TableHead className="min-w-[100px] text-xs sm:min-w-[120px] sm:text-sm">JUMLAH (PCS)</TableHead>
                                            <TableHead className="min-w-[80px] text-xs sm:min-w-[100px] sm:text-sm">LITER/KG</TableHead>
                                            <TableHead className="min-w-[130px] text-xs sm:min-w-[150px] sm:text-sm">TANGGAL BARANG KELUAR</TableHead>
                                            {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                                                <TableHead className="min-w-[80px] text-xs sm:min-w-[100px] sm:text-sm">Aksi</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tableRows.map((row) => (
                                            <TableRow key={row.item.id}>
                                                <TableCell className="align-top text-xs font-medium sm:text-sm">{row.item.user.name}</TableCell>
                                                <TableCell className="align-top text-xs sm:text-sm">{row.item.kios.nama}</TableCell>
                                                <TableCell className="align-top text-xs sm:text-sm">
                                                    <div>
                                                        <div className="font-medium">{row.item.product.nama}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{row.item.product.kemasan}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top text-xs sm:text-sm">{row.item.quantity}</TableCell>
                                                <TableCell className="align-top text-xs sm:text-sm">{row.item.liter_or_kg || '-'}</TableCell>
                                                <TableCell className="align-top text-xs sm:text-sm">
                                                    {(() => {
                                                        const date = new Date(row.item.tanggal);
                                                        const day = date.getDate();
                                                        const month = date.toLocaleDateString('id-ID', { month: 'long' });
                                                        const year = date.getFullYear();
                                                        return `${day} ${month} ${year}`;
                                                    })()}
                                                </TableCell>
                                                {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                                                    <TableCell className="align-top">
                                                        <div className="flex gap-1 sm:gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEdit(row.item)}
                                                                className="h-7 w-7 cursor-pointer p-0 sm:h-8 sm:w-8"
                                                            >
                                                                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setDeleteId(row.item.id);
                                                                    setIsDeleteDialogOpen(true);
                                                                }}
                                                                className="h-7 w-7 cursor-pointer p-0 text-red-600 hover:text-red-700 sm:h-8 sm:w-8"
                                                            >
                                                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        {stockKeluar.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={user.role === 'Field Assistant' || user.role === 'Assistant Area Manager' ? 7 : 6}
                                                    className="py-8 text-center text-gray-500"
                                                >
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
                        <DialogContent className="max-h-[95vh] max-w-[95vw] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
                            <DialogHeader>
                                <DialogTitle>{selectedStockKeluar ? 'Edit Stock Keluar' : 'Tambah Stock Keluar'}</DialogTitle>
                                <DialogDescription>
                                    {selectedStockKeluar ? 'Ubah informasi stock keluar di bawah ini.' : 'Isi informasi stock keluar di bawah ini.'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                                {error && (
                                    <div className="rounded-md bg-red-50 p-3 text-xs text-red-800 sm:text-sm dark:bg-red-900/20 dark:text-red-400">
                                        {error}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="user_name" className="text-xs sm:text-sm">
                                            NAMA FA *
                                        </Label>
                                        <Input
                                            id="user_name"
                                            type="text"
                                            value={user.name}
                                            readOnly
                                            className="cursor-not-allowed bg-gray-50 dark:bg-gray-700"
                                        />
                                        <input type="hidden" name="user_id" value={formData.user_id} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="kios_id" className="text-xs sm:text-sm">
                                            NAMA KIOS *
                                        </Label>
                                        <select
                                            id="kios_id"
                                            value={formData.kios_id}
                                            onChange={(e) => handleFieldChange('kios_id', e.target.value)}
                                            className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                                fieldErrors.kios_id ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'
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
                                        {fieldErrors.kios_id && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.kios_id}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="product_id" className="text-xs sm:text-sm">
                                        BARANG KELUAR *
                                    </Label>
                                    <select
                                        id="product_id"
                                        value={formData.product_id}
                                        onChange={(e) => handleFieldChange('product_id', e.target.value)}
                                        className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                            fieldErrors.product_id ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'
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
                                    {fieldErrors.product_id && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.product_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="qty_kemasan_id" className="text-xs sm:text-sm">
                                        QTY KEMASAN <span className="text-red-500 italic">(sesuaikan dengan kemasan barang keluar)</span>
                                    </Label>
                                    <select
                                        id="qty_kemasan_id"
                                        value={formData.qty_kemasan_id}
                                        onChange={(e) => {
                                            const newQtyKemasanId = e.target.value;
                                            const calculatedLiter = calculateLiter(newQtyKemasanId, formData.quantity);
                                            setFormData({
                                                ...formData,
                                                qty_kemasan_id: newQtyKemasanId,
                                                liter_or_kg: calculatedLiter,
                                            });
                                            if (fieldErrors.qty_kemasan_id) {
                                                setFieldErrors({ ...fieldErrors, qty_kemasan_id: '' });
                                            }
                                        }}
                                        className={`flex h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                            fieldErrors.qty_kemasan_id ? 'border-red-500' : 'border-input'
                                        }`}
                                    >
                                        <option value="">Pilih Qty Kemasan</option>
                                        {qtyKemasan.map((qk) => (
                                            <option key={qk.id} value={qk.id}>
                                                {qk.qty_kemasan}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.qty_kemasan_id && <p className="text-sm text-red-500">{fieldErrors.qty_kemasan_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quantity" className="text-xs sm:text-sm">
                                        JUMLAH (PCS) *
                                    </Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={(e) => {
                                                const newQuantity = e.target.value;
                                                const calculatedLiter = calculateLiter(formData.qty_kemasan_id, newQuantity);
                                                setFormData({
                                                    ...formData,
                                                    quantity: newQuantity,
                                                    liter_or_kg: calculatedLiter,
                                                });
                                                if (fieldErrors.quantity) {
                                                    setFieldErrors({ ...fieldErrors, quantity: '' });
                                                }
                                            }}
                                            className={fieldErrors.quantity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            required
                                        />
                                    {fieldErrors.quantity && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.quantity}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tanggal" className="text-xs sm:text-sm">
                                        TANGGAL BARANG KELUAR *
                                    </Label>
                                    <Input
                                        id="tanggal"
                                        type="date"
                                        value={formData.tanggal}
                                        onChange={(e) => handleFieldChange('tanggal', e.target.value)}
                                        className={fieldErrors.tanggal ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        required
                                    />
                                    {fieldErrors.tanggal && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.tanggal}</p>}
                                </div>
                                <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsDialogOpen(false);
                                            setFieldErrors({});
                                            setError(null);
                                        }}
                                        disabled={isSubmitting}
                                        className="w-full text-xs sm:w-auto sm:text-sm"
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="w-full text-xs sm:w-auto sm:text-sm">
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-3 w-3 animate-spin sm:h-4 sm:w-4" />
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
                                    Apakah Anda yakin ingin menghapus data stock keluar ini? Tindakan ini tidak dapat dibatalkan.
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
