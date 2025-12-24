import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import { Download, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

type StockMasuk = {
    id: number;
    user_id: number;
    kios_id: number;
    product_id: number;
    quantity: number;
    tanggal: string;
    foto_nota: string | null;
    foto_nota_url: string | null;
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

export default function StokMasukDashboard({ user }: Props) {
    const [stockMasuk, setStockMasuk] = useState<StockMasuk[]>([]);
    const [kios, setKios] = useState<Kios[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStockMasuk, setSelectedStockMasuk] = useState<StockMasuk | null>(null);
    const [formData, setFormData] = useState({
        user_id: user.id.toString(),
        kios_id: '',
        product_id: '',
        quantity: '',
        satuan: '',
        tanggal: new Date().toISOString().split('T')[0],
        foto_nota: null as File | null,
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [imageLoadError, setImageLoadError] = useState(false);
    const imageErrorHandled = useRef(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedKios, setSelectedKios] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');

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

    // Helper untuk mendapatkan CSRF token
    const getCsrfToken = (): string => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!token) {
            console.error('CSRF token not found in meta tag');
            // Return empty string and let the calling function handle the error
            return '';
        }
        return token;
    };

    // Generate months for select
    const generateMonths = () => {
        const months = [{ value: 'all', label: 'Semua Bulan' }];
        const currentDate = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
            months.push({ value: monthKey, label: monthName });
        }
        return months;
    };

    // Generate years for select
    const generateYears = () => {
        const years = [{ value: 'all', label: 'Semua Tahun' }];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            years.push({ value: year.toString(), label: year.toString() });
        }
        return years;
    };

    // Generate dates for select (last 30 days)
    const generateDates = () => {
        const dates = [{ value: 'all', label: 'Semua Tanggal' }];
        const currentDate = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const day = date.getDate();
            dates.push({ value: dateKey, label: day.toString() });
        }
        return dates;
    };

    // Fetch data dari API
    const fetchStockMasuk = async (month?: string, kiosId?: string, date?: string, year?: string) => {
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
            if (date && date !== 'all') {
                params.append('date', date);
            }
            if (year && year !== 'all') {
                params.append('year', year);
            }

            const csrfToken = getCsrfToken();
            const response = await fetch(`/api/stock-masuk?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                setError('Session telah berakhir. Silakan refresh halaman.');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                    throw new Error(errorData.message || 'Gagal mengambil data stock masuk');
                } catch (parseError) {
                    throw new Error(`Gagal mengambil data stock masuk. Status: ${response.status}`);
                }
            }

            let result: ApiResponse<StockMasuk[]>;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('Gagal memproses response dari server.');
            }

            if (result.success) {
                setStockMasuk(result.data);
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
            setError(errorMessage);
            console.error('Error fetching stock masuk:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch kios
    const fetchKios = async () => {
        try {
            const csrfToken = getCsrfToken();
            const response = await fetch('/api/kios', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                console.error('CSRF token mismatch saat mengambil data kios');
                return;
            }

            if (response.ok) {
                try {
                    const result: ApiResponse<Kios[]> = await response.json();
                    if (result.success) {
                        setKios(result.data);
                    }
                } catch (parseError) {
                    console.error('Error parsing kios response:', parseError);
                }
            }
        } catch (err) {
            console.error('Error fetching kios:', err);
        }
    };

    // Fetch products
    const fetchProducts = async () => {
        try {
            const csrfToken = getCsrfToken();
            const response = await fetch('/api/product', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                console.error('CSRF token mismatch saat mengambil data produk');
                return;
            }

            if (response.ok) {
                try {
                    const result: ApiResponse<Product[]> = await response.json();
                    if (result.success) {
                        setProducts(result.data);
                    }
                } catch (parseError) {
                    console.error('Error parsing products response:', parseError);
                }
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    useEffect(() => {
        fetchStockMasuk(
            selectedMonth === 'all' ? undefined : selectedMonth,
            selectedKios === 'all' ? undefined : selectedKios,
            selectedDate === 'all' ? undefined : selectedDate,
            selectedYear === 'all' ? undefined : selectedYear
        );
        fetchKios();
        fetchProducts();
    }, [selectedMonth, selectedKios, selectedDate, selectedYear]);

    // Handle download
    const handleDownload = async () => {
        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                setError('CSRF token tidak ditemukan. Silakan refresh halaman.');
                return;
            }

            const params = new URLSearchParams();
            if (selectedKios && selectedKios !== 'all') {
                params.append('kios_id', selectedKios);
            }
            if (selectedMonth && selectedMonth !== 'all') {
                params.append('month', selectedMonth);
            }
            if (selectedDate && selectedDate !== 'all') {
                params.append('date', selectedDate);
            }
            if (selectedYear && selectedYear !== 'all') {
                params.append('year', selectedYear);
            }
            params.append('download', '1');

            const response = await fetch(`/api/stock-masuk/download?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                setError('Session telah berakhir. Silakan refresh halaman dan coba lagi.');
                return;
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                    throw new Error(errorData.message || 'Gagal mengunduh data');
                } catch (parseError) {
                    throw new Error(`Gagal mengunduh data. Status: ${response.status}`);
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'stock-masuk.xlsx'
                : 'stock-masuk.xlsx';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunduh';
            setError(errorMessage);
            console.error('Error downloading stock masuk:', err);
        }
    };

    // Group products by nama
    const groupedProducts = products.reduce(
        (acc, product) => {
            if (!acc[product.nama]) {
                acc[product.nama] = [];
            }
            acc[product.nama].push(product);
            return acc;
        },
        {} as Record<string, Product[]>,
    );

    // Flatten for table display - show all rows with full information
    const tableRows: Array<{
        item: StockMasuk;
    }> = [];

    stockMasuk.forEach((item) => {
        tableRows.push({
            item,
        });
    });

    // Handle create/edit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFieldErrors({});
        setError(null);

        // Client-side validation
        const errors: Record<string, string> = {};
        // user_id sudah otomatis terisi dari user yang login
        if (!formData.kios_id) errors.kios_id = 'Kios harus dipilih';
        if (!formData.product_id) errors.product_id = 'Product harus dipilih';
        if (!formData.quantity || Number(formData.quantity) < 1) {
            errors.quantity = 'Quantity harus lebih dari 0';
        }
        if (Number(formData.quantity) > 999999) {
            errors.quantity = 'Quantity tidak boleh lebih dari 999999';
        }
        if (!formData.tanggal) {
            errors.tanggal = 'Tanggal harus diisi';
        } else {
            const selectedDate = new Date(formData.tanggal);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            if (selectedDate > today) {
                errors.tanggal = 'Tanggal tidak boleh di masa depan';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setIsSubmitting(false);
            return;
        }

        try {
            // Validate CSRF token before submitting
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                setError('CSRF token tidak ditemukan. Silakan refresh halaman.');
                setIsSubmitting(false);
                return;
            }

            const url = selectedStockMasuk ? `/api/stock-masuk/${selectedStockMasuk.id}` : '/api/stock-masuk';

            const formDataToSend = new FormData();
            // Add CSRF token to FormData (Laravel accepts it as _token field)
            formDataToSend.append('_token', csrfToken);
            formDataToSend.append('user_id', formData.user_id);
            formDataToSend.append('kios_id', formData.kios_id);
            formDataToSend.append('product_id', formData.product_id);
            formDataToSend.append('quantity', formData.quantity);
            formDataToSend.append('tanggal', formData.tanggal);
            if (formData.foto_nota) {
                formDataToSend.append('foto_nota', formData.foto_nota);
            }

            // Use method spoofing for PUT with FormData
            if (selectedStockMasuk) {
                formDataToSend.append('_method', 'PUT');
            }

            const response = await fetch(url, {
                method: 'POST', // Always use POST when using FormData with method spoofing
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                    // Don't set Content-Type - browser will set it automatically with boundary for FormData
                },
                credentials: 'include',
                body: formDataToSend,
            });

            // Handle CSRF token mismatch (419)
            if (response.status === 419) {
                const errorMessage = 'Session telah berakhir atau CSRF token tidak valid. Silakan refresh halaman dan coba lagi.';
                setError(errorMessage);
                setIsSubmitting(false);
                // Optionally auto-refresh after a delay
                setTimeout(() => {
                    if (window.confirm('Session telah berakhir. Apakah Anda ingin refresh halaman sekarang?')) {
                        window.location.reload();
                    }
                }, 2000);
                return;
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    throw new Error(`Gagal menyimpan data. Status: ${response.status}`);
                }

                // Handle validation errors
                if (errorData.errors) {
                    // Convert errors object to field errors
                    const errors: Record<string, string> = {};
                    Object.keys(errorData.errors).forEach((key) => {
                        const errorMessages = errorData.errors[key];
                        errors[key] = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
                    });
                    setFieldErrors(errors);

                    // Also set general error message
                    const errorMessages = Object.values(errorData.errors).flat();
                    setError(errorMessages.join(', ') || errorData.message || 'Gagal menyimpan data');
                    setIsSubmitting(false);
                    return;
                }
                throw new Error(errorData.message || 'Gagal menyimpan data');
            }

            let result: ApiResponse<StockMasuk>;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('Gagal memproses response dari server.');
            }

            if (result.success) {
                setIsDialogOpen(false);
                setFormData({
                    user_id: user.id.toString(),
                    kios_id: '',
                    product_id: '',
                    quantity: '',
                    satuan: '',
                    tanggal: new Date().toISOString().split('T')[0],
                    foto_nota: null,
                });
                setPreviewImage(null);
                setFieldErrors({});
                setSelectedStockMasuk(null);
                setError(null);
                await fetchStockMasuk(
                    selectedMonth === 'all' ? undefined : selectedMonth,
                    selectedKios === 'all' ? undefined : selectedKios,
                    selectedDate === 'all' ? undefined : selectedDate,
                    selectedYear === 'all' ? undefined : selectedYear
                );
            } else {
                throw new Error(result.message || 'Gagal menyimpan data');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan';
            setError(errorMessage);
            console.error('Error saving stock masuk:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                setError('CSRF token tidak ditemukan. Silakan refresh halaman.');
                return;
            }

            const response = await fetch(`/api/stock-masuk/${deleteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
            });

            if (response.status === 419) {
                setError('Session telah berakhir. Silakan refresh halaman dan coba lagi.');
                setIsDeleteDialogOpen(false);
                setDeleteId(null);
                return;
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                    throw new Error(errorData.message || 'Gagal menghapus data');
                } catch (parseError) {
                    throw new Error(`Gagal menghapus data. Status: ${response.status}`);
                }
            }

            let result: ApiResponse<null>;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('Gagal memproses response dari server.');
            }

            if (result.success) {
                setIsDeleteDialogOpen(false);
                setDeleteId(null);
                setError(null);
                await fetchStockMasuk(
                    selectedMonth === 'all' ? undefined : selectedMonth,
                    selectedKios === 'all' ? undefined : selectedKios,
                    selectedDate === 'all' ? undefined : selectedDate,
                    selectedYear === 'all' ? undefined : selectedYear
                );
            } else {
                throw new Error(result.message || 'Gagal menghapus data');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus';
            setError(errorMessage);
            console.error('Error deleting stock masuk:', err);
        }
    };

    // Handle edit
    const handleEdit = (item: StockMasuk) => {
        setSelectedStockMasuk(item);
        setFormData({
            user_id: user.id.toString(),
            kios_id: item.kios_id.toString(),
            product_id: item.product_id.toString(),
            quantity: item.quantity.toString(),
            satuan: item.product.satuan || '',
            tanggal: item.tanggal.split('T')[0],
            foto_nota: null,
        });
        // Set preview image if foto_nota exists
        if (item.foto_nota_url) {
            setPreviewImage(item.foto_nota_url);
        } else if (item.foto_nota) {
            // Fallback to old format if foto_nota_url is not available
            setPreviewImage(`/storage/${item.foto_nota}`);
        } else {
            setPreviewImage(null);
        }
        setIsDialogOpen(true);
    };

    // Handle add new
    const handleAddNew = () => {
        setSelectedStockMasuk(null);
        setFormData({
            user_id: user.id.toString(),
            kios_id: '',
            product_id: '',
            quantity: '',
            satuan: '',
            tanggal: new Date().toISOString().split('T')[0],
            foto_nota: null,
        });
        setPreviewImage(null);
        setIsDialogOpen(true);
    };

    // Handle file change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, foto_nota: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            // If no file selected and we're editing, keep the existing preview
            if (selectedStockMasuk?.foto_nota && !formData.foto_nota) {
                setPreviewImage(selectedStockMasuk.foto_nota_url || `/storage/${selectedStockMasuk.foto_nota}`);
            }
        }
    };

    // Remove preview image
    const handleRemoveImage = () => {
        setFormData({ ...formData, foto_nota: null });
        setPreviewImage(null);
    };

    return (
        <>
            <Head title="Stock Masuk" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-4 shadow-md md:p-6 dark:bg-gray-800">
                    <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold md:text-2xl">Stock Masuk</h1>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Kelola dan catat barang masuk ke gudang.</p>
                        </div>
                        {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                            <Button onClick={handleAddNew} className="flex w-full cursor-pointer items-center gap-2 sm:w-auto">
                                <Plus className="h-4 w-4" />
                                Tambah Stock Masuk
                            </Button>
                        )}
                    </div>

                    {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

                    {/* Filter */}
                    <Card className="mb-4 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Label htmlFor="kios">Filter Kios</Label>
                                <Select value={selectedKios} onValueChange={(value) => setSelectedKios(value)}>
                                    <SelectTrigger id="kios">
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
                            <div className="flex-1">
                                <Label htmlFor="date">Filter Tanggal</Label>
                                <Select value={selectedDate} onValueChange={(value) => setSelectedDate(value)}>
                                    <SelectTrigger id="date">
                                        <SelectValue placeholder="Pilih Tanggal" />
                                    </SelectTrigger>
                                    <SelectContent side="bottom">
                                        {generateDates().map((date) => (
                                            <SelectItem key={date.value} value={date.value}>
                                                {date.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="month">Filter Bulan</Label>
                                <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(value)}>
                                    <SelectTrigger id="month">
                                        <SelectValue placeholder="Pilih Bulan" />
                                    </SelectTrigger>
                                    <SelectContent side="bottom">
                                        {generateMonths().map((month) => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="year">Filter Tahun</Label>
                                <Select value={selectedYear} onValueChange={(value) => setSelectedYear(value)}>
                                    <SelectTrigger id="year">
                                        <SelectValue placeholder="Pilih Tahun" />
                                    </SelectTrigger>
                                    <SelectContent side="bottom">
                                        {generateYears().map((year) => (
                                            <SelectItem key={year.value} value={year.value}>
                                                {year.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="outline" onClick={handleDownload} className="flex w-full cursor-pointer items-center gap-2 sm:w-auto">
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
                        <div className="-mx-4 overflow-x-auto md:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[150px]">NAMA FA</TableHead>
                                            <TableHead className="min-w-[150px]">NAMA KIOS</TableHead>
                                            <TableHead className="min-w-[200px]">BARANG MASUK</TableHead>
                                            <TableHead className="min-w-[120px]">QUANTUM (PCS)</TableHead>
                                            <TableHead className="min-w-[100px]">SATUAN</TableHead>
                                            <TableHead className="min-w-[150px]">TANGGAL BARANG MASUK</TableHead>
                                            <TableHead className="min-w-[150px]">FOTO NOTA</TableHead>
                                            {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                                                <TableHead className="min-w-[100px]">Aksi</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tableRows.map((row, index) => (
                                            <TableRow key={row.item.id}>
                                                <TableCell className="align-top font-medium">{row.item.user.name}</TableCell>
                                                <TableCell className="align-top">{row.item.kios.nama}</TableCell>
                                                <TableCell className="align-top">
                                                    <div>
                                                        <div className="font-medium">{row.item.product.nama}</div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{row.item.product.kemasan}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top">{row.item.quantity}</TableCell>
                                                <TableCell className="align-top">{row.item.product.satuan || '-'}</TableCell>
                                                <TableCell className="align-top">
                                                    {(() => {
                                                        const date = new Date(row.item.tanggal);
                                                        const day = date.getDate();
                                                        const month = date.toLocaleDateString('id-ID', { month: 'long' });
                                                        const year = date.getFullYear();
                                                        return `${day} ${month} ${year}`;
                                                    })()}
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    {row.item.foto_nota_url || row.item.foto_nota ? (
                                                        <button
                                                            onClick={() => {
                                                                // Normalize URL to remove double slashes
                                                                let imageUrl = row.item.foto_nota_url || `/storage/${row.item.foto_nota}`;
                                                                
                                                                // Normalize URL: split by :// to preserve protocol, then normalize path
                                                                const urlParts = imageUrl.split('://');
                                                                if (urlParts.length === 2) {
                                                                    const protocol = urlParts[0];
                                                                    const path = urlParts[1].replace(/\/{2,}/g, '/');
                                                                    imageUrl = `${protocol}://${path}`;
                                                                } else {
                                                                    // If no protocol, just normalize slashes
                                                                    imageUrl = imageUrl.replace(/\/{2,}/g, '/');
                                                                }
                                                                
                                                                setPreviewImageUrl(imageUrl);
                                                                setImageLoadError(false);
                                                                imageErrorHandled.current = false;
                                                                setIsImagePreviewOpen(true);
                                                            }}
                                                            className="inline-flex cursor-pointer items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                                        >
                                                            <ImageIcon className="h-4 w-4" />
                                                            Lihat Foto
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                {(user.role === 'Field Assistant' || user.role === 'Assistant Area Manager') && (
                                                    <TableCell className="align-top">
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEdit(row.item)}
                                                                className="h-8 w-8 cursor-pointer p-0"
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
                                                                className="h-8 w-8 cursor-pointer p-0 text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        {stockMasuk.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={user.role === 'Field Assistant' || user.role === 'Assistant Area Manager' ? 8 : 7}
                                                    className="py-8 text-center text-gray-500"
                                                >
                                                    Tidak ada data stock masuk
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {/* Dialog untuk Add/Edit */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{selectedStockMasuk ? 'Edit Stock Masuk' : 'Tambah Stock Masuk'}</DialogTitle>
                                <DialogDescription>
                                    {selectedStockMasuk ? 'Ubah informasi stock masuk di bawah ini.' : 'Isi informasi stock masuk di bawah ini.'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="user_name">NAMA FA *</Label>
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
                                        <Label htmlFor="kios_id">NAMA KIOS *</Label>
                                        <select
                                            id="kios_id"
                                            value={formData.kios_id}
                                            onChange={(e) => {
                                                setFormData({ ...formData, kios_id: e.target.value });
                                                if (fieldErrors.kios_id) {
                                                    setFieldErrors({ ...fieldErrors, kios_id: '' });
                                                }
                                            }}
                                            className={`flex h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                                fieldErrors.kios_id ? 'border-red-500' : 'border-input'
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
                                        {fieldErrors.kios_id && <p className="text-sm text-red-500">{fieldErrors.kios_id}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="product_id">BARANG MASUK *</Label>
                                    <select
                                        id="product_id"
                                        value={formData.product_id}
                                        onChange={(e) => {
                                            setFormData({ ...formData, product_id: e.target.value });
                                            if (fieldErrors.product_id) {
                                                setFieldErrors({ ...fieldErrors, product_id: '' });
                                            }
                                        }}
                                        className={`flex h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                            fieldErrors.product_id ? 'border-red-500' : 'border-input'
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
                                    {fieldErrors.product_id && <p className="text-sm text-red-500">{fieldErrors.product_id}</p>}
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">QUANTUM (PCS) *</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={(e) => {
                                                setFormData({ ...formData, quantity: e.target.value });
                                                if (fieldErrors.quantity) {
                                                    setFieldErrors({ ...fieldErrors, quantity: '' });
                                                }
                                            }}
                                            className={fieldErrors.quantity ? 'border-red-500' : ''}
                                            required
                                        />
                                        {fieldErrors.quantity && <p className="text-sm text-red-500">{fieldErrors.quantity}</p>}
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
                                    <Label htmlFor="tanggal">TANGGAL BARANG MASUK *</Label>
                                    <Input
                                        id="tanggal"
                                        type="date"
                                        value={formData.tanggal}
                                        onChange={(e) => {
                                            setFormData({ ...formData, tanggal: e.target.value });
                                            if (fieldErrors.tanggal) {
                                                setFieldErrors({ ...fieldErrors, tanggal: '' });
                                            }
                                        }}
                                        className={fieldErrors.tanggal ? 'border-red-500' : ''}
                                        required
                                    />
                                    {fieldErrors.tanggal && <p className="text-sm text-red-500">{fieldErrors.tanggal}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="foto_nota">FOTO NOTA</Label>
                                    <Input id="foto_nota" type="file" accept="image/*" onChange={handleFileChange} className="cursor-pointer" />
                                    {previewImage && (
                                        <div className="relative mt-2 inline-block">
                                            <img src={previewImage} alt="Preview" className="h-32 w-32 rounded-md object-cover" />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleRemoveImage}
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        disabled={isSubmitting}
                                        className="cursor-pointer"
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
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
                                <DialogTitle>Hapus Stock Masuk</DialogTitle>
                                <DialogDescription>
                                    Apakah Anda yakin ingin menghapus data stock masuk ini? Tindakan ini tidak dapat dibatalkan.
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

                    {/* Dialog untuk Preview Foto */}
                    <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
                        <DialogContent className="max-w-[95vw] sm:max-w-7xl">
                            <DialogHeader>
                                <DialogTitle>Preview Foto Nota</DialogTitle>
                                <DialogDescription>
                                    Preview foto nota untuk stock masuk
                                </DialogDescription>
                            </DialogHeader>
                            {previewImageUrl && (
                                <div className="flex items-center justify-center p-4 min-h-[200px]">
                                    {imageLoadError ? (
                                        <div className="text-center p-8 text-muted-foreground">
                                            <p>Gambar tidak dapat dimuat</p>
                                            <p className="text-sm mt-2">URL: {previewImageUrl}</p>
                                        </div>
                                    ) : (
                                        <img
                                            src={previewImageUrl}
                                            alt="Foto Nota"
                                            className="max-h-[85vh] max-w-full rounded-md object-contain shadow-lg"
                                            onError={(e) => {
                                                // Prevent infinite loop by checking if error has already been handled
                                                if (!imageErrorHandled.current) {
                                                    imageErrorHandled.current = true;
                                                    console.error('Error loading image:', previewImageUrl);
                                                    setImageLoadError(true);
                                                    // Stop the image from trying to load again
                                                    e.currentTarget.style.display = 'none';
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsImagePreviewOpen(false);
                                        setPreviewImageUrl(null);
                                        setImageLoadError(false);
                                        imageErrorHandled.current = false;
                                    }}
                                    className="cursor-pointer"
                                >
                                    Tutup
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
