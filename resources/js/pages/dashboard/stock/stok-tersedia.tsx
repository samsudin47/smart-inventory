import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/authenticated-layout';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Search, Package, TrendingUp, TrendingDown, Download } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
    user: User;
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

type StockTersedia = {
    product_id: number;
    kios_id: number;
    total_masuk: number;
    total_keluar: number;
    quantity_tersedia: number;
    bulan: string | null;
    latest_date: string | null;
    product: Product;
    kios: Kios;
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    summary?: {
        total_products: number;
        total_masuk: number;
        total_keluar: number;
        total_stock_tersedia: number;
    };
    message: string;
};

export default function StokTersediaDashboard({ user }: Props) {
    const [stockTersedia, setStockTersedia] = useState<StockTersedia[]>([]);
    const [filteredStock, setFilteredStock] = useState<StockTersedia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedKios, setSelectedKios] = useState<string>('all');
    const [kios, setKios] = useState<Kios[]>([]);
    const [summary, setSummary] = useState({
        total_products: 0,
        total_masuk: 0,
        total_keluar: 0,
        total_stock_tersedia: 0,
    });

    // Helper untuk mendapatkan CSRF token
    const getCsrfToken = () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return token || '';
    };

    // Generate months for select
    const generateMonths = () => {
        const months = [{ value: 'all', label: 'Semua Bulan' }];
        const currentDate = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            months.push({ value: monthKey, label: monthName });
        }
        return months;
    };

    // Fetch kios
    const fetchKios = async () => {
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
    };

    // Fetch data dari API
    const fetchStockTersedia = async (month?: string, kiosId?: string) => {
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
            const response = await fetch(`/api/stock-tersedia?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data stock tersedia');
            }

            const result: ApiResponse<StockTersedia[]> = await response.json();
            if (result.success) {
                setStockTersedia(result.data);
                setFilteredStock(result.data);
                if (result.summary) {
                    setSummary(result.summary);
                }
            } else {
                throw new Error(result.message || 'Gagal mengambil data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            console.error('Error fetching stock tersedia:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle download
    const handleDownload = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedKios && selectedKios !== 'all') {
                params.append('kios_id', selectedKios);
            }
            if (selectedMonth && selectedMonth !== 'all') {
                params.append('month', selectedMonth);
            }
            
            const response = await fetch(`/api/stock-tersedia/download?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Gagal mengunduh data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'stock-tersedia.xlsx'
                : 'stock-tersedia.xlsx';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunduh');
            console.error('Error downloading stock tersedia:', err);
        }
    };

    // Filter data berdasarkan search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredStock(stockTersedia);
            return;
        }

        const filtered = stockTersedia.filter((item) => {
            const productName = item.product?.nama?.toLowerCase() || '';
            const kiosName = item.kios?.nama?.toLowerCase() || '';
            const search = searchTerm.toLowerCase();
            return productName.includes(search) || kiosName.includes(search);
        });

        setFilteredStock(filtered);
    }, [searchTerm, stockTersedia]);

    // Fetch data on component mount and when filters change
    useEffect(() => {
        fetchStockTersedia(
            selectedMonth === 'all' ? undefined : selectedMonth,
            selectedKios === 'all' ? undefined : selectedKios
        );
    }, [selectedMonth, selectedKios]);

    // Fetch kios on component mount
    useEffect(() => {
        fetchKios();
    }, []);

    // Use summary statistics from API (calculated from all data, not filtered)
    const totalProducts = summary.total_products;
    const totalMasuk = summary.total_masuk;
    const totalKeluar = summary.total_keluar;
    const totalStockTersedia = summary.total_stock_tersedia;

    return (
        <>
            <Head title="Stock Tersedia" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-4 shadow-md dark:bg-gray-800 md:p-6">
                    <div className="mb-4 md:mb-6">
                        <h1 className="text-xl font-semibold md:text-2xl">Stock Tersedia</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Lihat sisa stock yang tersedia berdasarkan perhitungan stock masuk dan stock keluar.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:mb-6">
                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Produk</p>
                                    <p className="mt-1 text-2xl font-semibold">{totalProducts}</p>
                                </div>
                                <Package className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock Masuk</p>
                                    <p className="mt-1 text-2xl font-semibold">
                                        {totalMasuk.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                        </div>

                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock Keluar</p>
                                    <p className="mt-1 text-2xl font-semibold">
                                        {totalKeluar.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <TrendingDown className="h-8 w-8 text-red-500" />
                            </div>
                        </div>

                        <div className="rounded-md border bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock Tersedia</p>
                                    <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                                        {totalStockTersedia.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <Package className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Filter */}
                    <Card className="mb-4 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Label htmlFor="kios">Filter Kios</Label>
                                <Select value={selectedKios} onValueChange={(value) => setSelectedKios(value)}>
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
                                <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(value)}>
                                    <SelectTrigger id="month">
                                        <SelectValue placeholder="Pilih Bulan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {generateMonths().map((month) => (
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

                    {/* Search Bar */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Cari berdasarkan nama produk atau kios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="ml-2 text-gray-600 dark:text-gray-400">Memuat data...</span>
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="rounded-md border bg-gray-50 p-8 text-center dark:bg-gray-700">
                            <p className="text-gray-600 dark:text-gray-400">
                                {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian.' : 'Tidak ada data stock tersedia.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border dark:border-gray-600 -mx-4 md:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No</TableHead>
                                        <TableHead>Produk</TableHead>
                                        <TableHead>Kemasan</TableHead>
                                        <TableHead>Satuan</TableHead>
                                        <TableHead>Kios</TableHead>
                                        <TableHead className="text-center">Stock Masuk</TableHead>
                                        <TableHead className="text-center">Stock Keluar</TableHead>
                                        <TableHead className="text-center">Stock Tersedia</TableHead>
                                        <TableHead className="text-center">Bulan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStock.map((item, index) => (
                                        <TableRow key={`${item.product_id}-${item.kios_id}`}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                {item.product?.nama || '-'}
                                            </TableCell>
                                            <TableCell>{item.product?.kemasan || '-'}</TableCell>
                                            <TableCell>{item.product?.satuan || '-'}</TableCell>
                                            <TableCell>{item.kios?.nama || '-'}</TableCell>
                                            <TableCell className="text-center text-green-600 dark:text-green-400">
                                                {item.total_masuk.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-center text-red-600 dark:text-red-400">
                                                {item.total_keluar.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold text-blue-600 dark:text-blue-400">
                                                {item.quantity_tersedia.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.bulan 
                                                    ? new Date(item.bulan + '-01').toLocaleDateString('id-ID', { 
                                                        month: 'long', 
                                                        year: 'numeric' 
                                                    })
                                                    : '-'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        <p className="font-medium">Catatan:</p>
                        <p className="mt-1">
                            Stock Tersedia dihitung secara otomatis dari selisih antara total Stock Masuk dan total Stock Keluar.
                            Data ini bersifat read-only dan tidak dapat diedit atau dihapus.
                        </p>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
